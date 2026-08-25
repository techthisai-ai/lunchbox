import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { IDAICHIvilai_CENTER } from '../../constants/maps';
import { colors, shadow } from '../../constants/theme';
import { EnfieldRouteResult } from '../../services/enfieldMapsService';
import { GeoPoint } from '../../types/delivery';
import { TripStopGroup } from '../../utils/driverTripNavigation';

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: LeafletLatLngBounds, options?: { padding?: [number, number]; maxZoom?: number }) => void;
  setView: (latLng: [number, number], zoom: number, options?: { animate?: boolean }) => void;
  invalidateSize: (options?: boolean | { animate?: boolean }) => void;
  scrollWheelZoom: { enable: () => void };
  touchZoom: { enable: () => void };
  dragging: { enable: () => void };
  doubleClickZoom: { enable: () => void };
};

type LeafletLatLngBounds = {
  extend: (latLng: [number, number]) => LeafletLatLngBounds;
};

type LeafletLayer = {
  setLatLng: (latLng: [number, number]) => void;
  remove?: () => void;
  bindTooltip?: (text: string, options?: object) => void;
};

type LeafletApi = {
  map: (element: HTMLElement, options?: object) => LeafletMap;
  tileLayer: (url: string, options?: object) => { addTo: (map: LeafletMap) => void };
  circleMarker: (latLng: [number, number], options?: object) => LeafletLayer & { addTo: (map: LeafletMap) => LeafletLayer };
  polyline: (latLngs: [number, number][], options?: object) => LeafletLayer & { addTo: (map: LeafletMap) => LeafletLayer };
  latLngBounds: (latLngs: [number, number][]) => LeafletLatLngBounds;
  divIcon: (options: object) => object;
  marker: (latLng: [number, number], options?: object) => LeafletLayer & { addTo: (map: LeafletMap) => LeafletLayer };
  DomEvent: {
    disableScrollPropagation: (el: HTMLElement) => void;
    disableClickPropagation: (el: HTMLElement) => void;
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

function addStreetTiles(L: LeafletApi, map: LeafletMap) {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);
}

function spiderPoint(base: GeoPoint, index: number): GeoPoint {
  if (index <= 0) return base;
  const angle = (index * 70 * Math.PI) / 180;
  const meters = 55 + index * 18;
  const latDeg = meters / 111320;
  const lngDeg = meters / (111320 * Math.max(0.2, Math.cos((base.lat * Math.PI) / 180)));
  return {
    lat: base.lat + Math.cos(angle) * latDeg,
    lng: base.lng + Math.sin(angle) * lngDeg,
  };
}

export type DriverTripMapProps = {
  height?: number;
  variant?: 'compact' | 'full';
  phase: 'pickup' | 'delivery' | 'idle';
  route: EnfieldRouteResult | null;
  pickupGroups: TripStopGroup[];
  deliveryGroups: TripStopGroup[];
  driverLocation: GeoPoint | null;
  currentStopId: string | null;
  recenterToken?: number;
};

function numberedMarkerHtml(sequence: number, color: string, isCurrent: boolean, large: boolean): string {
  const size = large ? (isCurrent ? 40 : 34) : isCurrent ? 34 : 28;
  const fontSize = large ? 14 : 12;
  const ring = isCurrent
    ? 'box-shadow:0 0 0 4px rgba(228,94,26,0.35), 0 4px 12px rgba(0,0,0,0.25);'
    : 'box-shadow:0 2px 8px rgba(0,0,0,0.22);';
  return `<div style="width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${color};color:#fff;font-weight:800;font-size:${fontSize}px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;${ring}">${sequence}</div>`;
}

function WebDriverTripMap({
  height = 260,
  variant = 'compact',
  phase,
  route,
  pickupGroups,
  deliveryGroups,
  driverLocation,
  currentStopId,
  recenterToken = 0,
}: DriverTripMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayersRef = useRef<LeafletLayer[]>([]);
  const routeLayerRef = useRef<LeafletLayer | null>(null);
  const driverLayerRef = useRef<LeafletLayer | null>(null);
  const boundsPointsRef = useRef<[number, number][]>([]);
  const fittedStopsKeyRef = useRef('');
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFull = variant === 'full';
  const routeColor = phase === 'pickup' ? colors.orange : colors.red;
  const layerSignature = useMemo(() => {
    const groups = phase === 'pickup' ? pickupGroups : deliveryGroups.filter((group) => group.status === 'pending');
    return [
      phase,
      currentStopId ?? '',
      groups.map((group) => `${group.id}:${group.status}:${group.sequence}`).join(','),
      String(route?.polyline?.length ?? 0),
      String(route?.totalDistanceKm ?? 0),
    ].join('|');
  }, [phase, currentStopId, pickupGroups, deliveryGroups, route?.polyline?.length, route?.totalDistanceKm]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let onResize: (() => void) | null = null;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
          touchZoom: true,
          doubleClickZoom: true,
          dragging: true,
          boxZoom: true,
          keyboard: true,
          zoomSnap: 0.5,
          zoomDelta: 1,
        });
        addStreetTiles(L, map);
        map.setView([IDAICHIvilai_CENTER.lat, IDAICHIvilai_CENTER.lng], 15);
        map.scrollWheelZoom.enable();
        map.touchZoom.enable();
        map.dragging.enable();
        map.doubleClickZoom.enable();
        L.DomEvent?.disableScrollPropagation?.(containerRef.current);
        mapRef.current = map;

        const refreshSize = () => {
          map.invalidateSize(false);
        };
        onResize = refreshSize;
        requestAnimationFrame(refreshSize);
        setTimeout(refreshSize, 80);
        setTimeout(refreshSize, 320);
        setTimeout(refreshSize, 800);

        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          resizeObserver = new ResizeObserver(refreshSize);
          resizeObserver.observe(containerRef.current);
        }
        window.addEventListener('resize', refreshSize);

        setMapReady(true);
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
      if (onResize) window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [isFull]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    loadLeaflet().then((L) => {
      if (!mapRef.current) return;

      markerLayersRef.current.forEach((layer) => layer.remove?.());
      markerLayersRef.current = [];
      routeLayerRef.current?.remove?.();
      routeLayerRef.current = null;

      const displayGroups = (
        phase === 'pickup'
          ? pickupGroups
          : deliveryGroups.filter((group) => group.status === 'pending')
      ).sort((a, b) => a.sequence - b.sequence || a.locationName.localeCompare(b.locationName));

      const boundsPoints: [number, number][] = [];
      const stopLine: [number, number][] = [];

      for (let index = 0; index < displayGroups.length; index += 1) {
        const group = displayGroups[index];
        const isCurrent = group.id === currentStopId;
        const isCompleted = group.status === 'completed';
        const stopType = group.type ?? (phase === 'pickup' ? 'pickup' : 'drop');
        const color = isCompleted
          ? '#9E9E9E'
          : stopType === 'pickup'
            ? isCurrent
              ? colors.orange
              : '#F06292'
            : isCurrent
              ? colors.red
              : '#EF5350';

        const samePointIndex = displayGroups
          .slice(0, index)
          .filter(
            (other) =>
              Math.abs(other.point.lat - group.point.lat) < 0.00045 &&
              Math.abs(other.point.lng - group.point.lng) < 0.00045,
          ).length;
        const displayPoint = spiderPoint(group.point, samePointIndex);

        const icon = L.divIcon({
          html: numberedMarkerHtml(group.sequence || index + 1, color, isCurrent && !isCompleted, isFull),
          className: '',
          iconSize: [isFull ? 40 : 28, isFull ? 40 : 28],
          iconAnchor: [isFull ? 20 : 14, isFull ? 20 : 14],
        });
        const marker = L.marker(toLatLng(displayPoint), {
          icon,
          zIndexOffset: isCurrent ? 1000 : isCompleted ? 0 : 100,
        }).addTo(mapRef.current!);
        marker.bindTooltip?.(group.locationName ?? group.address, { permanent: false, direction: 'top' });
        markerLayersRef.current.push(marker);
        boundsPoints.push(toLatLng(displayPoint));
        if (!isCompleted) stopLine.push(toLatLng(displayPoint));
      }

      const pathLatLngs =
        route?.polyline?.length && route.polyline.length > 1
          ? route.polyline.map(toLatLng)
          : stopLine.length > 1
            ? stopLine
            : [];

      if (pathLatLngs.length > 1) {
        const routeLine = L.polyline(pathLatLngs, {
          color: routeColor,
          weight: isFull ? 6 : 5,
          opacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapRef.current);
        routeLayerRef.current = routeLine;
        pathLatLngs.forEach((point) => boundsPoints.push(point));
      }

      boundsPointsRef.current = boundsPoints;
      mapRef.current.invalidateSize(false);

      const stopsKey = `${phase}|${displayGroups.map((group) => group.id).join(',')}`;
      const shouldFit = fittedStopsKeyRef.current !== stopsKey;
      if (shouldFit && boundsPoints.length > 0) {
        fittedStopsKeyRef.current = stopsKey;
        const bounds = L.latLngBounds(boundsPoints);
        mapRef.current.fitBounds(bounds, { padding: isFull ? [48, 48] : [40, 40], maxZoom: 17 });
      }
    });
  }, [mapReady, layerSignature, pickupGroups, deliveryGroups, phase, currentStopId, route, isFull, routeColor]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !driverLocation) return;
    loadLeaflet().then((L) => {
      if (!mapRef.current) return;
      if (driverLayerRef.current) {
        driverLayerRef.current.setLatLng(toLatLng(driverLocation));
        return;
      }
      const driverMarker = L.circleMarker(toLatLng(driverLocation), {
        radius: isFull ? 12 : 10,
        color: '#ffffff',
        weight: 3,
        fillColor: '#2D2D44',
        fillOpacity: 1,
      }).addTo(mapRef.current);
      driverMarker.bindTooltip?.('You', { permanent: false, direction: 'top' });
      driverLayerRef.current = driverMarker;
    });
  }, [mapReady, driverLocation, isFull]);

  useEffect(() => {
    if (!mapRef.current || recenterToken === 0) return;
    mapRef.current.invalidateSize(false);
    if (boundsPointsRef.current.length > 0) {
      loadLeaflet().then((L) => {
        if (!mapRef.current) return;
        const bounds = L.latLngBounds(boundsPointsRef.current);
        mapRef.current.fitBounds(bounds, { padding: isFull ? [48, 48] : [40, 40], maxZoom: 16 });
      });
    } else if (driverLocation) {
      mapRef.current.setView(toLatLng(driverLocation), 15, { animate: true });
    }
  }, [recenterToken, driverLocation, isFull]);

  if (error) {
    return (
      <View style={[styles.fallback, { height }, isFull && styles.fallbackFull]}>
        <Text style={styles.fallbackTitle}>Route map</Text>
        <Text style={styles.fallbackText}>Could not load the map. Pull to refresh or try again on a stronger connection.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }, isFull && styles.wrapFull]}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.orange} size={isFull ? 'large' : 'small'} />
          <Text style={styles.loaderText}>Loading route map...</Text>
        </View>
      ) : null}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: height,
          borderRadius: isFull ? 20 : 16,
          overflow: 'hidden',
          background: '#d9e2d0',
          touchAction: 'none',
        }}
      />
    </View>
  );
}

function NativeRoutePlaceholder({ height, phase }: { height: number; phase: 'pickup' | 'delivery' | 'idle' }) {
  return (
    <View style={[styles.nativeMapPlaceholder, { height }]}>
      <Text style={styles.nativeMapIcon}>🗺️</Text>
      <Text style={styles.nativeMapTitle}>Route map</Text>
      <Text style={styles.nativeMapSub}>
        {phase === 'pickup' ? 'All pickups are listed below this map' : phase === 'delivery' ? 'Delivery stops are listed below' : 'Route preview'}
      </Text>
      <Text style={styles.nativeMapHint}>Open this screen on web to see streets, numbered pickups, and the full route.</Text>
    </View>
  );
}

export function DriverTripMap(props: DriverTripMapProps) {
  const { variant = 'compact', height = 260 } = props;
  const mapHeight = variant === 'full' ? height : height;

  if (Platform.OS === 'web') {
    return <WebDriverTripMap {...props} height={mapHeight} />;
  }

  return <NativeRoutePlaceholder height={mapHeight} phase={props.phase} />;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    zIndex: 4,
  },
  wrapFull: {
    borderRadius: 20,
    ...shadow.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    zIndex: 2,
  },
  loaderText: { marginTop: 10, fontSize: 13, color: colors.muted, fontWeight: '600' },
  fallback: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
    justifyContent: 'center',
  },
  fallbackFull: { borderRadius: 20, ...shadow.card },
  fallbackTitle: { fontWeight: '800', fontSize: 16, color: colors.text },
  fallbackText: { fontSize: 13, color: colors.muted, marginTop: 6, fontWeight: '600' },
  nativeMapPlaceholder: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...shadow.elevated,
    borderWidth: 1,
    borderColor: 'rgba(228,94,26,0.15)',
  },
  nativeMapIcon: { fontSize: 42, marginBottom: 8 },
  nativeMapTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  nativeMapSub: { fontSize: 13, color: colors.muted, marginTop: 6, fontWeight: '600' },
  nativeMapHint: { fontSize: 11, color: colors.muted, marginTop: 10, textAlign: 'center' },
});
