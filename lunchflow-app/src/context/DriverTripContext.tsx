import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  buildEnfieldRoute,
  getDeviceLocationForMaps,
  isNearStop,
  type EnfieldRouteResult,
} from '../services/enfieldMapsService';
import {
  markAtPickup,
  markPickedUp,
  verifyPickup,
} from '../services/orderHubService';
import { geocodeTripStopAddress, isTamilNaduPoint, isTrustedMapPoint, geocodeAddress } from '../services/mapGeocoding';
import { DEMO_DROP, DEMO_PICKUP, resolveKnownLocalityPoint } from '../constants/maps';
import { DeliveryOrder, GeoPoint } from '../types/delivery';
import { DRIVER_EARNING_PER_ORDER } from '../utils/adminDriverHelpers';
import {
  applySequences,
  createIdleTripSnapshot,
  getDeliveryPendingOrders,
  getPickupPendingOrders,
  groupOrdersByDropLocation,
  groupOrdersByPickupLocation,
  toEnfieldStops,
  type DriverTripPhase,
  type DriverTripSnapshot,
  type TripStopGroup,
} from '../utils/driverTripNavigation';

type TripStats = {
  ordersDelivered: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalEarnings: number;
  completedAt: string | null;
};

type DriverTripContextValue = {
  trip: DriverTripSnapshot;
  tripActive: boolean;
  driverLocation: GeoPoint | null;
  stats: TripStats;
  startTrip: (orders: DeliveryOrder[]) => Promise<void>;
  refreshTripRoutes: (orders: DeliveryOrder[]) => Promise<void>;
  refreshDriverLocation: () => Promise<GeoPoint | null>;
  completePickupStop: (stopId: string, otp: string, orders: DeliveryOrder[]) => Promise<string | null>;
  markPickupStopReached: (stopId: string) => void;
  markDeliveryStopReached: (stopId: string) => void;
  completeDeliveryStop: (stopId: string) => void;
  finishTrip: (completedCount: number) => void;
  resetTrip: () => void;
  currentPickupStop: TripStopGroup | null;
  currentDeliveryStop: TripStopGroup | null;
  activeRoute: EnfieldRouteResult | null;
  activePhase: DriverTripPhase;
};

const DriverTripContext = createContext<DriverTripContextValue | null>(null);

async function geocodeWithTimeout(address: string, fallback: GeoPoint, timeoutMs = 5000): Promise<GeoPoint> {
  try {
    return await Promise.race([
      geocodeTripStopAddress(address),
      new Promise<GeoPoint>((resolve) => {
        setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch {
    return fallback;
  }
}

async function resolveTripStopPoint(group: TripStopGroup): Promise<GeoPoint> {
  const knownLocality = resolveKnownLocalityPoint(group.address);
  const fallback = knownLocality ?? geocodeAddress(
    group.address,
    group.type === 'pickup' ? DEMO_PICKUP : DEMO_DROP,
  );

  for (const order of group.orders) {
    const stored = group.type === 'pickup' ? order.pickupLocation : order.dropLocation;
    const address = group.type === 'pickup' ? order.pickupAddress : group.address;
    if (stored && isTrustedMapPoint(stored, address)) {
      return stored;
    }
  }

  if (isTrustedMapPoint(group.point, group.address)) {
    return group.point;
  }

  if (knownLocality) {
    return knownLocality;
  }

  return geocodeWithTimeout(group.address, fallback);
}

async function hydrateTripStopPoints(groups: TripStopGroup[]): Promise<TripStopGroup[]> {
  return Promise.all(
    groups.map(async (group) => {
      const point = await resolveTripStopPoint(group);
      return { ...group, point };
    }),
  );
}

function mergeTripGroupStatus(
  nextGroups: TripStopGroup[],
  currentGroups: TripStopGroup[],
): TripStopGroup[] {
  const statusById = new Map(currentGroups.map((group) => [group.id, group.status]));
  const nextById = new Map(nextGroups.map((group) => [group.id, group]));

  // Keep previously accepted pickups that were completed so the map can show
  // every accepted location at once for the whole pickup phase.
  const merged = nextGroups.map((group) => ({
    ...group,
    status: statusById.get(group.id) === 'completed' ? ('completed' as const) : group.status,
  }));

  for (const group of currentGroups) {
    if (group.status === 'completed' && !nextById.has(group.id)) {
      merged.push(group);
    }
  }

  return merged;
}

async function hydrateTripGroups(
  orders: DeliveryOrder[],
  phase: DriverTripPhase = 'pickup',
): Promise<{
  pickupGroups: TripStopGroup[];
  deliveryGroups: TripStopGroup[];
}> {
  const pickupGroups = await hydrateTripStopPoints(
    groupOrdersByPickupLocation(getPickupPendingOrders(orders)),
  );

  const deliveryGroupsRaw = groupOrdersByDropLocation(getDeliveryPendingOrders(orders));
  const deliveryGroups =
    phase === 'delivery' || phase === 'completed'
      ? await hydrateTripStopPoints(deliveryGroupsRaw)
      : deliveryGroupsRaw;

  return { pickupGroups, deliveryGroups };
}

function resolveTripOrigin(
  driverPoint: GeoPoint | null,
  pickupGroups: TripStopGroup[],
  deliveryGroups: TripStopGroup[],
): GeoPoint {
  if (driverPoint && isTamilNaduPoint(driverPoint)) return driverPoint;
  const firstPickup = pickupGroups.find((group) => group.status === 'pending');
  if (firstPickup) return firstPickup.point;
  const firstDrop = deliveryGroups.find((group) => group.status === 'pending');
  if (firstDrop) return firstDrop.point;
  return driverPoint ?? { lat: 13.0827, lng: 80.2707 };
}

export function DriverTripProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<DriverTripSnapshot>(createIdleTripSnapshot);
  const [driverLocation, setDriverLocation] = useState<GeoPoint | null>(null);
  const [stats, setStats] = useState<TripStats>({
    ordersDelivered: 0,
    totalDistanceKm: 0,
    totalDurationMinutes: 0,
    totalEarnings: 0,
    completedAt: null,
  });

  const refreshDriverLocation = useCallback(async () => {
    const point = await getDeviceLocationForMaps();
    if (point) setDriverLocation(point);
    return point;
  }, []);

  const buildRoutes = useCallback(
    async (pickupGroups: TripStopGroup[], deliveryGroups: TripStopGroup[], origin: GeoPoint) => {
      const pendingPickups = pickupGroups.filter((group) => group.status === 'pending');
      const pendingDrops = deliveryGroups.filter((group) => group.status === 'pending');

      const pickupRoute =
        pendingPickups.length > 0
          ? await buildEnfieldRoute(origin, toEnfieldStops(pendingPickups))
          : null;

      const lastCompletedPickup = [...pickupGroups]
        .filter((group) => group.status === 'completed')
        .sort((a, b) => b.sequence - a.sequence)[0];
      const deliveryOrigin =
        pendingPickups.length > 0
          ? origin
          : lastCompletedPickup?.point ?? origin;

      const deliveryRoute =
        pendingPickups.length === 0 && pendingDrops.length > 0
          ? await buildEnfieldRoute(deliveryOrigin, toEnfieldStops(pendingDrops))
          : null;

      return {
        pickupGroups: pickupRoute
          ? applySequences(
              pickupGroups,
              pickupRoute.stops.map((stop) => stop.id),
            )
          : pickupGroups,
        deliveryGroups: deliveryRoute
          ? applySequences(
              deliveryGroups,
              deliveryRoute.stops.map((stop) => stop.id),
            )
          : deliveryGroups,
        pickupRoute,
        deliveryRoute,
        totalDistanceKm: (pickupRoute?.totalDistanceKm ?? 0) + (deliveryRoute?.totalDistanceKm ?? 0),
        totalDurationMinutes:
          (pickupRoute?.totalDurationMinutes ?? 0) + (deliveryRoute?.totalDurationMinutes ?? 0),
      };
    },
    [],
  );

  const startTrip = useCallback(
    async (orders: DeliveryOrder[]) => {
      const pendingPickups = getPickupPendingOrders(orders);
      if (pendingPickups.length === 0) {
        throw new Error('Accept at least one pickup before starting the trip.');
      }

      const driverPoint = await refreshDriverLocation();
      const { pickupGroups, deliveryGroups } = await hydrateTripGroups(orders, 'pickup');
      const origin = resolveTripOrigin(driverPoint, pickupGroups, deliveryGroups);

      let routed;
      try {
        routed = await buildRoutes(pickupGroups, deliveryGroups, origin);
      } catch {
        const pendingIds = pickupGroups
          .filter((group) => group.status === 'pending')
          .map((group) => group.id);
        routed = {
          pickupGroups: applySequences(pickupGroups, pendingIds),
          deliveryGroups,
          pickupRoute: null,
          deliveryRoute: null,
          totalDistanceKm: 0,
          totalDurationMinutes: 0,
        };
      }

      const phase: DriverTripPhase =
        routed.pickupGroups.some((group) => group.status === 'pending')
          ? 'pickup'
          : routed.deliveryGroups.some((group) => group.status === 'pending')
            ? 'delivery'
            : 'completed';

      const currentStopId =
        phase === 'pickup'
          ? routed.pickupGroups.find((group) => group.status === 'pending')?.id ?? null
          : routed.deliveryGroups.find((group) => group.status === 'pending')?.id ?? null;

      setTrip({
        phase,
        startedAt: new Date().toISOString(),
        completedAt: null,
        pickupGroups: routed.pickupGroups,
        deliveryGroups: routed.deliveryGroups,
        currentStopId,
        pickupRoute: routed.pickupRoute,
        deliveryRoute: routed.deliveryRoute,
        totalDistanceKm: routed.totalDistanceKm,
        totalDurationMinutes: routed.totalDurationMinutes,
      });
      setStats({
        ordersDelivered: 0,
        totalDistanceKm: routed.totalDistanceKm,
        totalDurationMinutes: routed.totalDurationMinutes,
        totalEarnings: 0,
        completedAt: null,
      });
    },
    [buildRoutes, refreshDriverLocation],
  );

  const refreshTripRoutes = useCallback(
    async (orders: DeliveryOrder[]) => {
      if (trip.phase === 'idle') return;
      const driverPoint = (await refreshDriverLocation()) ?? driverLocation;
      const hydrated = await hydrateTripGroups(orders, trip.phase);
      const pickupGroups = mergeTripGroupStatus(hydrated.pickupGroups, trip.pickupGroups);
      const deliveryGroups = mergeTripGroupStatus(hydrated.deliveryGroups, trip.deliveryGroups);
      const origin = resolveTripOrigin(driverPoint, pickupGroups, deliveryGroups);
      let routed;
      try {
        routed = await buildRoutes(pickupGroups, deliveryGroups, origin);
      } catch {
        const pendingPickupIds = pickupGroups
          .filter((group) => group.status === 'pending')
          .map((group) => group.id);
        const pendingDropIds = deliveryGroups
          .filter((group) => group.status === 'pending')
          .map((group) => group.id);
        routed = {
          pickupGroups: applySequences(pickupGroups, pendingPickupIds),
          deliveryGroups: applySequences(deliveryGroups, pendingDropIds),
          pickupRoute: null,
          deliveryRoute: null,
          totalDistanceKm: 0,
          totalDurationMinutes: 0,
        };
      }

      const hasPendingPickup = routed.pickupGroups.some((group) => group.status === 'pending');
      const hasPendingDelivery = routed.deliveryGroups.some((group) => group.status === 'pending');

      let phase: DriverTripPhase = 'delivery';
      if (hasPendingPickup) phase = 'pickup';
      else if (!hasPendingDelivery && trip.startedAt) phase = 'completed';
      else if (hasPendingDelivery) phase = 'delivery';

      const currentStopId =
        phase === 'pickup'
          ? routed.pickupGroups.find((group) => group.status === 'pending')?.id ?? null
          : phase === 'delivery'
            ? routed.deliveryGroups.find((group) => group.status === 'pending')?.id ?? null
            : null;

      setTrip((current) => ({
        ...current,
        phase,
        pickupGroups: routed.pickupGroups,
        deliveryGroups: routed.deliveryGroups,
        currentStopId,
        pickupRoute: hasPendingPickup ? routed.pickupRoute : null,
        deliveryRoute: hasPendingDelivery ? routed.deliveryRoute : null,
        totalDistanceKm: routed.totalDistanceKm,
        totalDurationMinutes: routed.totalDurationMinutes,
        completedAt: phase === 'completed' ? new Date().toISOString() : current.completedAt,
      }));

      if (phase === 'completed') {
        const deliveredCount = orders.filter((order) => order.status === 'delivered').length;
        setStats((current) => ({
          ...current,
          ordersDelivered: deliveredCount,
          totalDistanceKm: routed.totalDistanceKm,
          totalDurationMinutes: routed.totalDurationMinutes,
          totalEarnings: deliveredCount * DRIVER_EARNING_PER_ORDER,
          completedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        }));
      }
    },
    [buildRoutes, driverLocation, refreshDriverLocation, trip.deliveryGroups, trip.phase, trip.pickupGroups, trip.startedAt],
  );

  const completePickupStop = useCallback(async (stopId: string, otp: string, orders: DeliveryOrder[]) => {
    const group = groupOrdersByPickupLocation(orders).find((entry) => entry.id === stopId);
    if (!group) return 'Pickup stop not found';

    const pendingOrders = group.orders.filter((order) =>
      ['driver_assigned', 'at_pickup', 'pickup_verified', 'awaiting_driver', 'food_ready'].includes(order.status),
    );
    if (pendingOrders.length === 0) return null;

    let matched = false;
    for (const order of pendingOrders) {
      if (order.status !== 'at_pickup' && order.status !== 'pickup_verified') {
        await markAtPickup(order.id);
      }
    }

    for (const order of pendingOrders) {
      try {
        await verifyPickup(order.id, otp);
        matched = true;
      } catch {
        // Try next order at same kitchen.
      }
    }

    if (!matched) return 'Invalid kitchen OTP';

    for (const order of pendingOrders) {
      await markPickedUp(order.id);
    }

    setTrip((current) => {
      const pickupGroups = current.pickupGroups.map((entry) =>
        entry.id === stopId ? { ...entry, status: 'completed' as const } : entry,
      );
      const nextPickup = pickupGroups.find((entry) => entry.status === 'pending') ?? null;
      const allPickupsDone = !pickupGroups.some((entry) => entry.status === 'pending');

      return {
        ...current,
        pickupGroups,
        phase: allPickupsDone ? 'delivery' : 'pickup',
        currentStopId: allPickupsDone
          ? current.deliveryGroups.find((entry) => entry.status === 'pending')?.id ?? null
          : nextPickup?.id ?? null,
        pickupRoute: null,
      };
    });

    return null;
  }, []);

  const markPickupStopReached = useCallback((stopId: string) => {
    setTrip((current) => ({ ...current, currentStopId: stopId }));
  }, []);

  const markDeliveryStopReached = useCallback((stopId: string) => {
    setTrip((current) => ({ ...current, currentStopId: stopId, phase: 'delivery' }));
  }, []);

  const completeDeliveryStop = useCallback((stopId: string) => {
    setTrip((current) => {
      const deliveryGroups = current.deliveryGroups.map((entry) =>
        entry.id === stopId ? { ...entry, status: 'completed' as const } : entry,
      );
      const nextDrop = deliveryGroups.find((entry) => entry.status === 'pending') ?? null;
      const allDone = !deliveryGroups.some((entry) => entry.status === 'pending');

      return {
        ...current,
        deliveryGroups,
        currentStopId: nextDrop?.id ?? null,
        phase: allDone ? 'completed' : 'delivery',
        completedAt: allDone ? new Date().toISOString() : current.completedAt,
      };
    });
  }, []);

  const finishTrip = useCallback((completedCount: number) => {
    setStats({
      ordersDelivered: completedCount,
      totalDistanceKm: trip.totalDistanceKm,
      totalDurationMinutes: trip.totalDurationMinutes,
      totalEarnings: completedCount * DRIVER_EARNING_PER_ORDER,
      completedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    });
    setTrip((current) => ({
      ...current,
      phase: 'completed',
      completedAt: new Date().toISOString(),
      currentStopId: null,
    }));
  }, [trip.totalDistanceKm, trip.totalDurationMinutes]);

  const resetTrip = useCallback(() => {
    setTrip(createIdleTripSnapshot());
    setStats({
      ordersDelivered: 0,
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      totalEarnings: 0,
      completedAt: null,
    });
  }, []);

  const currentPickupStop = useMemo(
    () => trip.pickupGroups.find((group) => group.id === trip.currentStopId && group.status === 'pending') ?? null,
    [trip.currentStopId, trip.pickupGroups],
  );

  const currentDeliveryStop = useMemo(
    () => trip.deliveryGroups.find((group) => group.id === trip.currentStopId && group.status === 'pending') ?? null,
    [trip.currentStopId, trip.deliveryGroups],
  );

  const activeRoute = trip.phase === 'pickup' ? trip.pickupRoute : trip.deliveryRoute;
  const tripActive = trip.phase === 'pickup' || trip.phase === 'delivery';

  const value = useMemo(
    () => ({
      trip,
      tripActive,
      driverLocation,
      stats,
      startTrip,
      refreshTripRoutes,
      refreshDriverLocation,
      completePickupStop,
      markPickupStopReached,
      markDeliveryStopReached,
      completeDeliveryStop,
      finishTrip,
      resetTrip,
      currentPickupStop,
      currentDeliveryStop,
      activeRoute,
      activePhase: trip.phase,
    }),
    [
      trip,
      tripActive,
      driverLocation,
      stats,
      startTrip,
      refreshTripRoutes,
      refreshDriverLocation,
      completePickupStop,
      markPickupStopReached,
      markDeliveryStopReached,
      completeDeliveryStop,
      finishTrip,
      resetTrip,
      currentPickupStop,
      currentDeliveryStop,
      activeRoute,
    ],
  );

  return <DriverTripContext.Provider value={value}>{children}</DriverTripContext.Provider>;
}

export function useDriverTrip(): DriverTripContextValue {
  const context = useContext(DriverTripContext);
  if (!context) {
    throw new Error('useDriverTrip must be used within DriverTripProvider');
  }
  return context;
}

export function useDriverTripOptional(): DriverTripContextValue | null {
  return useContext(DriverTripContext);
}
