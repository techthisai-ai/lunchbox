import { useEffect, useRef, useState } from 'react';

import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow } from '../../constants/theme';

import { EnfieldRouteResult } from '../../services/enfieldMapsService';

import { GeoPoint } from '../../types/delivery';

import { TripStopGroup } from '../../utils/driverTripNavigation';



type LeafletMap = {

  remove: () => void;

  fitBounds: (bounds: LeafletLatLngBounds, options?: { padding?: [number, number] }) => void;

  setView: (latLng: [number, number], zoom: number, options?: { animate?: boolean }) => void;

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

    ? 'box-shadow:0 0 0 4px rgba(233,30,99,0.35), 0 4px 12px rgba(0,0,0,0.25);'

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

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const isFull = variant === 'full';

  const routeColor = phase === 'pickup' ? colors.orange : colors.red;



  useEffect(() => {

    let cancelled = false;



    loadLeaflet()

      .then((L) => {

        if (cancelled || !containerRef.current) return;



        const map = L.map(containerRef.current, {

          zoomControl: isFull,

          attributionControl: !isFull,

        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {

          maxZoom: 19,

          attribution: '&copy; OpenStreetMap',

        }).addTo(map);



        mapRef.current = map;

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

    };

  }, [isFull]);



  useEffect(() => {

    if (!mapRef.current) return;



    loadLeaflet().then((L) => {

      if (!mapRef.current) return;



      markerLayersRef.current.forEach((layer) => layer.remove?.());

      markerLayersRef.current = [];

      routeLayerRef.current?.remove?.();

      routeLayerRef.current = null;

      driverLayerRef.current?.remove?.();

      driverLayerRef.current = null;



      // Pickup phase: show every accepted pickup at once (not one-by-one).
      // Delivery phase: show remaining pending drops only.
      const displayGroups = (
        phase === 'pickup'
          ? pickupGroups
          : deliveryGroups.filter((group) => group.status === 'pending')
      ).sort((a, b) => a.sequence - b.sequence || a.locationName.localeCompare(b.locationName));

      const boundsPoints: [number, number][] = [];

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

        // Slight offset when multiple pins share nearly the same coordinates
        // so every accepted pickup stays visible at the same time.
        const samePointIndex = displayGroups
          .slice(0, index)
          .filter(
            (other) =>
              Math.abs(other.point.lat - group.point.lat) < 0.0002 &&
              Math.abs(other.point.lng - group.point.lng) < 0.0002,
          ).length;
        const displayPoint: GeoPoint =
          samePointIndex > 0
            ? {
                lat: group.point.lat + samePointIndex * 0.00035,
                lng: group.point.lng + samePointIndex * 0.00035,
              }
            : group.point;

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
      }



      if (driverLocation) {

        const driverMarker = L.circleMarker(toLatLng(driverLocation), {

          radius: isFull ? 12 : 10,

          color: '#ffffff',

          weight: 3,

          fillColor: '#2D2D44',

          fillOpacity: 1,

        }).addTo(mapRef.current);

        driverMarker.bindTooltip?.('You', { permanent: false, direction: 'top' });

        driverLayerRef.current = driverMarker;

        boundsPoints.push(toLatLng(driverLocation));

      }



      if (route?.polyline?.length) {

        const routeLine = L.polyline(route.polyline.map(toLatLng), {

          color: routeColor,

          weight: isFull ? 6 : 5,

          opacity: 0.9,

          lineCap: 'round',

          lineJoin: 'round',

        }).addTo(mapRef.current);

        routeLayerRef.current = routeLine;

        route.polyline.forEach((point) => boundsPoints.push(toLatLng(point)));

      } else if (boundsPoints.length > 1) {

        const fallbackLine = L.polyline(boundsPoints, {

          color: routeColor,

          weight: isFull ? 5 : 4,

          opacity: 0.65,

          dashArray: '8 8',

        }).addTo(mapRef.current);

        routeLayerRef.current = fallbackLine;

      }



      boundsPointsRef.current = boundsPoints;

      if (boundsPoints.length > 0) {

        const bounds = L.latLngBounds(boundsPoints);

        mapRef.current.fitBounds(bounds, { padding: isFull ? [48, 48] : [40, 40] });

      } else if (driverLocation) {

        mapRef.current.setView(toLatLng(driverLocation), 14, { animate: true });

      }

    });

  }, [phase, route, pickupGroups, deliveryGroups, driverLocation, currentStopId, isFull, routeColor]);



  useEffect(() => {

    if (!mapRef.current || recenterToken === 0) return;

    if (boundsPointsRef.current.length > 0) {

      loadLeaflet().then((L) => {

        if (!mapRef.current) return;

        const bounds = L.latLngBounds(boundsPointsRef.current);

        mapRef.current.fitBounds(bounds, { padding: isFull ? [48, 48] : [40, 40] });

      });

    } else if (driverLocation) {

      mapRef.current.setView(toLatLng(driverLocation), 15, { animate: true });

    }

  }, [recenterToken, driverLocation, isFull]);



  if (error) {

    return (

      <View style={[styles.fallback, { height }, isFull && styles.fallbackFull]}>

        <Text style={styles.fallbackTitle}>Enfield Map</Text>

        <Text style={styles.fallbackText}>Map is available on web while your trip is active.</Text>

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

          borderRadius: isFull ? 20 : 16,

          overflow: 'hidden',

        }}

      />

    </View>

  );

}



function NativeRoutePlaceholder({ height, phase }: { height: number; phase: 'pickup' | 'delivery' | 'idle' }) {

  return (

    <View style={[styles.nativeMapPlaceholder, { height }]}>

      <Text style={styles.nativeMapIcon}>🗺️</Text>

      <Text style={styles.nativeMapTitle}>Enfield Route</Text>

      <Text style={styles.nativeMapSub}>

        {phase === 'pickup' ? 'Pickup route active' : phase === 'delivery' ? 'Delivery route active' : 'Route preview'}

      </Text>

      <Text style={styles.nativeMapHint}>Use Start Navigation for turn-by-turn directions</Text>

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

  wrap: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surfaceMuted },

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

    borderColor: 'rgba(233,30,99,0.15)',

  },

  nativeMapIcon: { fontSize: 42, marginBottom: 8 },

  nativeMapTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

  nativeMapSub: { fontSize: 13, color: colors.muted, marginTop: 6, fontWeight: '600' },

  nativeMapHint: { fontSize: 11, color: colors.muted, marginTop: 10, textAlign: 'center' },

});


