import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { DEMO_DROP, DEMO_PICKUP } from '../constants/maps';
import { colors } from '../constants/theme';
import { resolveMapPoint, resolveOrderLocationsAsync } from '../services/mapGeocoding';
import { isUsablePoint, type DriverLiveLocation } from '../services/driverLocationService';
import { DeliveryOrder, GeoPoint } from '../types/delivery';

export type FleetDriverMarker = {
  driverId: string;
  name: string;
  location: GeoPoint;
  orderCount?: number;
};

type Props = {
  order?: DeliveryOrder | null;
  height?: number;
  fleetOrders?: DeliveryOrder[];
  fleetDrivers?: FleetDriverMarker[];
  liveLocations?: DriverLiveLocation[];
};

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: LeafletLatLngBounds, options?: { padding?: [number, number] }) => void;
  setView: (latLng: [number, number], zoom: number) => void;
};

type LeafletLatLngBounds = {
  extend: (latLng: [number, number]) => LeafletLatLngBounds;
};

type LeafletLayer = {
  setLatLng: (latLng: [number, number]) => void;
  setLatLngs?: (latLngs: [number, number][]) => void;
  remove?: () => void;
  bindTooltip?: (content: string, options?: object) => LeafletLayer;
};

type LeafletApi = {
  map: (element: HTMLElement, options?: object) => LeafletMap;
  tileLayer: (url: string, options?: object) => { addTo: (map: LeafletMap) => void };
  circleMarker: (
    latLng: [number, number],
    options?: object,
  ) => LeafletLayer & { addTo: (map: LeafletMap) => LeafletLayer };
  polyline: (latLngs: [number, number][], options?: object) => LeafletLayer & { addTo: (map: LeafletMap) => LeafletLayer };
  latLngBounds: (latLngs: [number, number][]) => LeafletLatLngBounds;
};

let leafletPromise: Promise<LeafletApi> | null = null;

function loadLeaflet(): Promise<LeafletApi> {
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Maps unavailable'));
      return;
    }

    const existing = (window as unknown as { L?: LeafletApi }).L;
    if (existing) {
      resolve(existing);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      const leaflet = (window as unknown as { L?: LeafletApi }).L;
      if (leaflet) resolve(leaflet);
      else reject(new Error('Leaflet failed to load'));
    };
    script.onerror = () => reject(new Error('Leaflet script error'));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

function resolvePoints(order: DeliveryOrder) {
  const pickup = resolveMapPoint(order.pickupLocation, order.pickupAddress, DEMO_PICKUP);
  const drop = resolveMapPoint(order.dropLocation, order.dropAddress || order.school, DEMO_DROP);
  const driver = isUsablePoint(order.driverLocation) ? order.driverLocation : pickup;
  return { pickup, drop, driver };
}

function toLatLng(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

function mergeFleetMarkers(
  fleetDrivers: FleetDriverMarker[] = [],
  fleetOrders: DeliveryOrder[] = [],
  liveLocations: DriverLiveLocation[] = [],
): FleetDriverMarker[] {
  const byId = new Map<string, FleetDriverMarker>();

  for (const driver of fleetDrivers) {
    if (!isUsablePoint(driver.location)) continue;
    byId.set(driver.driverId, driver);
  }

  for (const live of liveLocations) {
    if (!isUsablePoint(live)) continue;
    const existing = byId.get(live.driverId);
    byId.set(live.driverId, {
      driverId: live.driverId,
      name: live.name || existing?.name || 'Driver',
      location: { lat: live.lat, lng: live.lng },
      orderCount: existing?.orderCount,
    });
  }

  for (const order of fleetOrders) {
    const driverId = order.driver?.id;
    if (!driverId || byId.has(driverId)) continue;
    const location = isUsablePoint(order.driverLocation)
      ? order.driverLocation
      : isUsablePoint(order.pickupLocation)
        ? order.pickupLocation
        : null;
    if (!location) continue;
    byId.set(driverId, {
      driverId,
      name: order.driver?.name ?? 'Driver',
      location,
      orderCount: 1,
    });
  }

  return Array.from(byId.values());
}

function FallbackMap({ order, height = 280, fleetDrivers = [], fleetOrders = [], liveLocations = [] }: Props) {
  const markers = mergeFleetMarkers(fleetDrivers, fleetOrders, liveLocations);
  const points = order ? resolvePoints(order) : null;
  return (
    <View style={[styles.fallback, { height }]}>
      <Text style={styles.fallbackTitle}>Live Delivery Map</Text>
      <Text style={styles.fallbackLine}>Live drivers on route: {markers.length}</Text>
      {markers.slice(0, 4).map((marker) => (
        <Text key={marker.driverId} style={styles.fallbackLine}>
          {marker.name}: {marker.location.lat.toFixed(4)}, {marker.location.lng.toFixed(4)}
        </Text>
      ))}
      {points ? (
        <>
          <Text style={styles.fallbackLine}>
            Pickup: {points.pickup.lat.toFixed(4)}, {points.pickup.lng.toFixed(4)}
          </Text>
          <Text style={styles.fallbackLine}>
            Drop: {points.drop.lat.toFixed(4)}, {points.drop.lng.toFixed(4)}
          </Text>
        </>
      ) : null}
      <Text style={styles.fallbackHint}>Full interactive map is available on web.</Text>
    </View>
  );
}

function WebLiveMap({
  order,
  height = 280,
  fleetOrders = [],
  fleetDrivers = [],
  liveLocations = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<{
    pickup?: LeafletLayer;
    drop?: LeafletLayer;
    driver?: LeafletLayer;
    route?: LeafletLayer;
  } | null>(null);
  const fleetLayerRef = useRef<LeafletLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvedPoints, setResolvedPoints] = useState(() => (order ? resolvePoints(order) : null));

  useEffect(() => {
    if (!order) {
      setResolvedPoints(null);
      return;
    }
    let cancelled = false;
    resolveOrderLocationsAsync(order).then((locations) => {
      if (cancelled) return;
      const pickup = locations.pickupLocation;
      const drop = locations.dropLocation;
      const driver = isUsablePoint(order.driverLocation) ? order.driverLocation : pickup;
      setResolvedPoints({ pickup, drop, driver });
    });
    return () => {
      cancelled = true;
    };
  }, [
    order?.id,
    order?.pickupAddress,
    order?.dropAddress,
    order?.school,
    order?.pickupLocation?.lat,
    order?.pickupLocation?.lng,
    order?.dropLocation?.lat,
    order?.dropLocation?.lng,
    order?.driverLocation?.lat,
    order?.driverLocation?.lng,
  ]);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        map.setView(toLatLng(DEMO_PICKUP), 7);

        const nextLayers: {
          pickup?: LeafletLayer;
          drop?: LeafletLayer;
          driver?: LeafletLayer;
          route?: LeafletLayer;
        } = {};

        if (resolvedPoints) {
          const { pickup, drop, driver } = resolvedPoints;
          nextLayers.pickup = L.circleMarker(toLatLng(pickup), {
            radius: 9,
            color: '#ffffff',
            weight: 2,
            fillColor: colors.green,
            fillOpacity: 1,
          }).addTo(map);
          nextLayers.drop = L.circleMarker(toLatLng(drop), {
            radius: 9,
            color: '#ffffff',
            weight: 2,
            fillColor: colors.blue,
            fillOpacity: 1,
          }).addTo(map);
          nextLayers.driver = L.circleMarker(toLatLng(driver), {
            radius: 10,
            color: '#ffffff',
            weight: 2,
            fillColor: colors.orange,
            fillOpacity: 1,
          }).addTo(map);
          nextLayers.route = L.polyline([toLatLng(pickup), toLatLng(driver), toLatLng(drop)], {
            color: colors.orange,
            weight: 4,
            opacity: 0.9,
          }).addTo(map);
          map.fitBounds(L.latLngBounds([toLatLng(pickup), toLatLng(drop), toLatLng(driver)]), {
            padding: [36, 36],
          });
        }

        mapRef.current = map;
        layersRef.current = nextLayers;
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Map unavailable');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, [order?.id, resolvedPoints?.pickup.lat, resolvedPoints?.pickup.lng, resolvedPoints?.drop.lat, resolvedPoints?.drop.lng]);

  useEffect(() => {
    if (!mapRef.current) return;

    loadLeaflet().then((L) => {
      if (!mapRef.current) return;
      fleetLayerRef.current.forEach((layer) => layer.remove?.());
      fleetLayerRef.current = [];

      const markers = mergeFleetMarkers(fleetDrivers, fleetOrders, liveLocations);
      const boundsPoints: [number, number][] = [];

      markers.forEach((marker) => {
        if (!mapRef.current) return;
        const layer = L.circleMarker(toLatLng(marker.location), {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: colors.purple,
          fillOpacity: 0.95,
        }).addTo(mapRef.current);
        layer.bindTooltip?.(
          `${marker.name}${marker.orderCount ? ` · ${marker.orderCount} order(s)` : ''}`,
          { permanent: false, direction: 'top' },
        );
        fleetLayerRef.current.push(layer);
        boundsPoints.push(toLatLng(marker.location));
      });

      if (resolvedPoints) {
        boundsPoints.push(
          toLatLng(resolvedPoints.pickup),
          toLatLng(resolvedPoints.drop),
          toLatLng(isUsablePoint(order?.driverLocation) ? order!.driverLocation! : resolvedPoints.driver),
        );
      }

      if (boundsPoints.length > 0) {
        mapRef.current.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40] });
      }
    });
  }, [fleetDrivers, fleetOrders, liveLocations, resolvedPoints, order?.driverLocation?.lat, order?.driverLocation?.lng]);

  useEffect(() => {
    if (!mapRef.current || !layersRef.current || !resolvedPoints) return;

    const driver = isUsablePoint(order?.driverLocation) ? order!.driverLocation! : resolvedPoints.pickup;
    const path = [toLatLng(resolvedPoints.pickup), toLatLng(driver), toLatLng(resolvedPoints.drop)];

    layersRef.current.pickup?.setLatLng(toLatLng(resolvedPoints.pickup));
    layersRef.current.drop?.setLatLng(toLatLng(resolvedPoints.drop));
    layersRef.current.driver?.setLatLng(toLatLng(driver));
    layersRef.current.route?.setLatLngs?.(path);
  }, [
    order?.driverLocation?.lat,
    order?.driverLocation?.lng,
    order?.status,
    resolvedPoints?.pickup.lat,
    resolvedPoints?.pickup.lng,
    resolvedPoints?.drop.lat,
    resolvedPoints?.drop.lng,
  ]);

  if (error) {
    return (
      <FallbackMap
        order={order}
        height={height}
        fleetDrivers={fleetDrivers}
        fleetOrders={fleetOrders}
        liveLocations={liveLocations}
      />
    );
  }

  return (
    <View style={[styles.mapWrap, { height }]}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.orange} />
          <Text style={styles.loaderText}>Loading live map...</Text>
        </View>
      ) : null}
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }} />
    </View>
  );
}

export function LiveDeliveryMap(props: Props) {
  if (Platform.OS === 'web') {
    return <WebLiveMap {...props} />;
  }
  return <FallbackMap {...props} />;
}

const styles = StyleSheet.create({
  mapWrap: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  loader: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    zIndex: 2,
  },
  loaderText: { marginTop: 8, fontSize: 12, color: colors.muted },
  fallback: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
    justifyContent: 'center',
  },
  fallbackTitle: { fontWeight: '800', fontSize: 15, marginBottom: 8 },
  fallbackLine: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  fallbackHint: { fontSize: 11, color: colors.muted, marginTop: 8 },
});
