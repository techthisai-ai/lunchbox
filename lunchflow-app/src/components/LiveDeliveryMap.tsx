import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { DEMO_DROP, DEMO_PICKUP } from '../constants/maps';
import { colors } from '../constants/theme';
import { resolveMapPoint, isTamilNaduPoint } from '../services/mapGeocoding';
import { DeliveryOrder, GeoPoint } from '../types/delivery';

type Props = {
  order: DeliveryOrder;
  height?: number;
  fleetOrders?: DeliveryOrder[];
};

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: LeafletLatLngBounds, options?: { padding?: [number, number] }) => void;
};

type LeafletLatLngBounds = {
  extend: (latLng: [number, number]) => LeafletLatLngBounds;
};

type LeafletLayer = {
  setLatLng: (latLng: [number, number]) => void;
  setLatLngs?: (latLngs: [number, number][]) => void;
};

type LeafletApi = {
  map: (element: HTMLElement, options?: object) => LeafletMap;
  tileLayer: (url: string, options?: object) => { addTo: (map: LeafletMap) => void };
  circleMarker: (latLng: [number, number], options?: object) => LeafletLayer & { addTo: (map: LeafletMap) => LeafletLayer };
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
  const driver =
    order.driverLocation && isTamilNaduPoint(order.driverLocation) ? order.driverLocation : pickup;
  return { pickup, drop, driver };
}

function toLatLng(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

function FallbackMap({ order, height = 280 }: Props) {
  const { pickup, drop, driver } = resolvePoints(order);
  return (
    <View style={[styles.fallback, { height }]}>
      <Text style={styles.fallbackTitle}>Live Route Map</Text>
      <Text style={styles.fallbackLine}>Pickup: {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}</Text>
      <Text style={styles.fallbackLine}>Drop: {drop.lat.toFixed(4)}, {drop.lng.toFixed(4)}</Text>
      <Text style={styles.fallbackLine}>Driver: {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}</Text>
      <Text style={styles.fallbackHint}>Map preview is available on web.</Text>
    </View>
  );
}

function WebLiveMap({ order, height = 280, fleetOrders = [] }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<{
    pickup: LeafletLayer;
    drop: LeafletLayer;
    driver: LeafletLayer;
    route: LeafletLayer;
  } | null>(null);
  const fleetLayerRef = useRef<LeafletLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        const { pickup, drop, driver } = resolvePoints(order);
        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const pickupMarker = L.circleMarker(toLatLng(pickup), {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: colors.green,
          fillOpacity: 1,
        }).addTo(map);

        const dropMarker = L.circleMarker(toLatLng(drop), {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: colors.blue,
          fillOpacity: 1,
        }).addTo(map);

        const driverMarker = L.circleMarker(toLatLng(driver), {
          radius: 10,
          color: '#ffffff',
          weight: 2,
          fillColor: colors.orange,
          fillOpacity: 1,
        }).addTo(map);

        const route = L.polyline([toLatLng(pickup), toLatLng(driver), toLatLng(drop)], {
          color: colors.orange,
          weight: 4,
          opacity: 0.9,
        }).addTo(map);

        const bounds = L.latLngBounds([toLatLng(pickup), toLatLng(drop), toLatLng(driver)]);
        map.fitBounds(bounds, { padding: [36, 36] });

        mapRef.current = map;
        layersRef.current = {
          pickup: pickupMarker,
          drop: dropMarker,
          driver: driverMarker,
          route,
        };
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
  }, [order.id]);

  useEffect(() => {
    if (!mapRef.current) return;

    loadLeaflet().then((L) => {
      if (!mapRef.current) return;
      fleetLayerRef.current.forEach((layer) => {
        const removable = layer as LeafletLayer & { remove?: () => void };
        removable.remove?.();
      });
      fleetLayerRef.current = [];

      fleetOrders.forEach((fleetOrder) => {
        const point = fleetOrder.driverLocation ?? fleetOrder.pickupLocation;
        if (!point || !mapRef.current) return;
        const marker = L.circleMarker(toLatLng(point), {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: colors.purple,
          fillOpacity: 0.9,
        }).addTo(mapRef.current);
        fleetLayerRef.current.push(marker);
      });
    });
  }, [fleetOrders]);

  useEffect(() => {
    if (!mapRef.current || !layersRef.current) return;

    const { pickup, drop, driver } = resolvePoints(order);
    const path = [toLatLng(pickup), toLatLng(driver), toLatLng(drop)];

    layersRef.current.pickup.setLatLng(toLatLng(pickup));
    layersRef.current.drop.setLatLng(toLatLng(drop));
    layersRef.current.driver.setLatLng(toLatLng(driver));
    layersRef.current.route.setLatLngs?.(path);
  }, [
    order.driverLocation?.lat,
    order.driverLocation?.lng,
    order.status,
    order.pickupAddress,
    order.dropAddress,
    order.school,
  ]);

  if (error) {
    return <FallbackMap order={order} height={height} />;
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
