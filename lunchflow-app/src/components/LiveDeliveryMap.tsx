import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { DEMO_DROP, DEMO_PICKUP, DEFAULT_MAP_CENTER, IDAICHIvilai_CENTER } from '../constants/maps';
import { colors } from '../constants/theme';
import { isTamilNaduPoint } from '../services/mapGeocoding';
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
  fitBounds: (bounds: LeafletLatLngBounds, options?: { padding?: [number, number]; maxZoom?: number }) => void;
  setView: (latLng: [number, number], zoom: number) => void;
  invalidateSize: (options?: boolean | { animate?: boolean }) => void;
};

type LeafletLatLngBounds = {
  extend: (latLng: [number, number]) => LeafletLatLngBounds;
};

type LeafletLayer = {
  setLatLng: (latLng: [number, number]) => void;
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
  latLngBounds: (latLngs: [number, number][]) => LeafletLatLngBounds;
  DomEvent: {
    disableScrollPropagation: (el: HTMLElement) => void;
  };
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

function toLatLng(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

function nearly(a: number, b: number) {
  return Math.abs(a - b) < 0.002;
}

function isPlaceholderPoint(point: GeoPoint): boolean {
  return (
    (nearly(point.lat, DEMO_PICKUP.lat) && nearly(point.lng, DEMO_PICKUP.lng)) ||
    (nearly(point.lat, DEMO_DROP.lat) && nearly(point.lng, DEMO_DROP.lng)) ||
    (nearly(point.lat, DEFAULT_MAP_CENTER.lat) && nearly(point.lng, DEFAULT_MAP_CENTER.lng))
  );
}

function isLiveDriverPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  return Boolean(point && isUsablePoint(point) && isTamilNaduPoint(point) && !isPlaceholderPoint(point));
}

function mergeFleetMarkers(
  fleetDrivers: FleetDriverMarker[] = [],
  fleetOrders: DeliveryOrder[] = [],
  liveLocations: DriverLiveLocation[] = [],
): FleetDriverMarker[] {
  const byId = new Map<string, FleetDriverMarker>();

  for (const driver of fleetDrivers) {
    if (!isLiveDriverPoint(driver.location)) continue;
    byId.set(driver.driverId, driver);
  }

  for (const live of liveLocations) {
    if (!isLiveDriverPoint(live)) continue;
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
    const location = isLiveDriverPoint(order.driverLocation) ? order.driverLocation : null;
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

function FallbackMap({ height = 280, fleetDrivers = [], fleetOrders = [], liveLocations = [] }: Props) {
  const markers = mergeFleetMarkers(fleetDrivers, fleetOrders, liveLocations);
  return (
    <View style={[styles.fallback, { height }]}>
      <Text style={styles.fallbackTitle}>Live Delivery Map</Text>
      <Text style={styles.fallbackLine}>Live drivers: {markers.length}</Text>
      {markers.slice(0, 6).map((marker) => (
        <Text key={marker.driverId} style={styles.fallbackLine}>
          {marker.name}: {marker.location.lat.toFixed(4)}, {marker.location.lng.toFixed(4)}
        </Text>
      ))}
      <Text style={styles.fallbackHint}>Full interactive map is available on web.</Text>
    </View>
  );
}

function WebLiveMap({
  height = 280,
  fleetOrders = [],
  fleetDrivers = [],
  liveLocations = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const fleetLayerRef = useRef<Map<string, LeafletLayer>>(new Map());
  const fittedKeyRef = useRef('');
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
        });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        map.setView([IDAICHIvilai_CENTER.lat, IDAICHIvilai_CENTER.lng], 13);
        L.DomEvent?.disableScrollPropagation?.(containerRef.current);
        mapRef.current = map;
        setMapReady(true);
        setLoading(false);

        const refreshSize = () => map.invalidateSize(false);
        requestAnimationFrame(refreshSize);
        setTimeout(refreshSize, 80);
        setTimeout(refreshSize, 320);
        setTimeout(refreshSize, 800);
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(refreshSize);
          resizeObserver.observe(containerRef.current);
        }
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
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
      fleetLayerRef.current.clear();
      fittedKeyRef.current = '';
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    loadLeaflet().then((L) => {
      if (!mapRef.current) return;
      const markers = mergeFleetMarkers(fleetDrivers, fleetOrders, liveLocations);
      const nextIds = new Set(markers.map((marker) => marker.driverId));

      for (const [id, layer] of fleetLayerRef.current.entries()) {
        if (!nextIds.has(id)) {
          layer.remove?.();
          fleetLayerRef.current.delete(id);
        }
      }

      const boundsPoints: [number, number][] = [];
      markers.forEach((marker, index) => {
        if (!mapRef.current) return;
        const existing = fleetLayerRef.current.get(marker.driverId);
        if (existing) {
          existing.setLatLng(toLatLng(marker.location));
        } else {
          const layer = L.circleMarker(toLatLng(marker.location), {
            radius: 10,
            color: '#ffffff',
            weight: 2,
            fillColor: index === 0 ? colors.orange : colors.green,
            fillOpacity: 0.95,
          }).addTo(mapRef.current);
          layer.bindTooltip?.(
            `${marker.name}${marker.orderCount ? ` · ${marker.orderCount} lunchbox stop(s)` : ' · online'}`,
            { permanent: false, direction: 'top' },
          );
          fleetLayerRef.current.set(marker.driverId, layer);
        }
        boundsPoints.push(toLatLng(marker.location));
      });

      const nextKey = markers
        .map((marker) => marker.driverId)
        .sort()
        .join('|');
      if (boundsPoints.length === 1) {
        if (fittedKeyRef.current !== nextKey) {
          mapRef.current.setView(boundsPoints[0], 15);
          fittedKeyRef.current = nextKey;
        }
        return;
      }
      if (boundsPoints.length > 1 && fittedKeyRef.current !== nextKey) {
        mapRef.current.fitBounds(L.latLngBounds(boundsPoints), { padding: [48, 48], maxZoom: 15 });
        fittedKeyRef.current = nextKey;
      }
    });
  }, [mapReady, fleetDrivers, fleetOrders, liveLocations]);

  if (error) {
    return (
      <FallbackMap
        height={height}
        fleetDrivers={fleetDrivers}
        fleetOrders={fleetOrders}
        liveLocations={liveLocations}
      />
    );
  }

  const liveCount = mergeFleetMarkers(fleetDrivers, fleetOrders, liveLocations).length;

  return (
    <View style={[styles.mapWrap, { height }]}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.orange} />
          <Text style={styles.loaderText}>Loading live map...</Text>
        </View>
      ) : null}
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }} />
      <View style={styles.legend} pointerEvents="none">
        <Text style={styles.legendText}>
          {liveCount > 0 ? `${liveCount} driver${liveCount === 1 ? '' : 's'} live` : 'Waiting for online drivers'}
        </Text>
      </View>
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
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendText: { fontSize: 11, fontWeight: '800', color: colors.text },
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
