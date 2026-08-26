import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  refreshDriverLocationForOrders,
  stopDriverLocationTracking,
} from '../services/driverLocationService';
import {
  buildEnfieldRoute,
  getDeviceLocationForMaps,
  isNearStop,
  optimizeStopOrder,
  type EnfieldRouteResult,
} from '../services/enfieldMapsService';
import {
  markAtPickup,
  markPickedUp,
  subscribeToDriverOrdersToday,
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
  findPickupStopGroup,
  hasPendingPickups,
  groupOrdersByDropLocation,
  groupOrdersByPickupLocation,
  toEnfieldStops,
  type DriverTripPhase,
  type DriverTripSnapshot,
  type TripStopGroup,
} from '../utils/driverTripNavigation';
import {
  clearPersistedDriverTrip,
  loadPersistedDriverTrip,
  savePersistedDriverTrip,
} from '../services/driverTripStorage';

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
  resumeTrip: (orders: DeliveryOrder[]) => Promise<void>;
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
): Promise<{
  pickupGroups: TripStopGroup[];
  deliveryGroups: TripStopGroup[];
}> {
  const pendingPickupOrders = getPickupPendingOrders(orders);
  const pickupGroups = await hydrateTripStopPoints(
    groupOrdersByPickupLocation(pendingPickupOrders),
  );

  const deliveryOrders =
    pendingPickupOrders.length === 0 ? getDeliveryPendingOrders(orders) : [];
  const deliveryGroups = await hydrateTripStopPoints(groupOrdersByDropLocation(deliveryOrders));

  return { pickupGroups, deliveryGroups };
}

function nearestPendingStopIds(origin: GeoPoint, groups: TripStopGroup[]): string[] {
  return optimizeStopOrder(
    origin,
    toEnfieldStops(groups.filter((group) => group.status === 'pending')),
  ).map((stop) => stop.id);
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
  const { user } = useAuth();
  const [trip, setTrip] = useState<DriverTripSnapshot>(createIdleTripSnapshot);
  const [driverLocation, setDriverLocation] = useState<GeoPoint | null>(null);
  const tripRef = useRef(trip);
  const driverLocationRef = useRef(driverLocation);
  tripRef.current = trip;
  driverLocationRef.current = driverLocation;
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

  useEffect(() => {
    if (!user?.id || user.role !== 'driver') return undefined;
    const driverId = user.id;
    void refreshDriverLocationForOrders(driverId, []);
    const unsub = subscribeToDriverOrdersToday(driverId, (orders) => {
      void refreshDriverLocationForOrders(
        driverId,
        orders.map((order) => order.id),
      );
    });
    return () => {
      unsub();
      void stopDriverLocationTracking();
    };
  }, [user?.id, user?.role]);

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

  const applyTripFromOrders = useCallback(
    async (orders: DeliveryOrder[], options?: { requirePickup?: boolean }) => {
      const pendingPickups = getPickupPendingOrders(orders);
      const pendingDeliveries = getDeliveryPendingOrders(orders);
      if (options?.requirePickup && pendingPickups.length === 0) {
        throw new Error('Accept at least one pickup before starting the trip.');
      }
      if (pendingPickups.length === 0 && pendingDeliveries.length === 0) {
        setTrip(createIdleTripSnapshot());
        return;
      }

      const driverPoint = await refreshDriverLocation();
      const currentTrip = tripRef.current;
      const hydrated = await hydrateTripGroups(orders);
      const pickupGroups =
        currentTrip.phase === 'idle'
          ? hydrated.pickupGroups
          : mergeTripGroupStatus(hydrated.pickupGroups, currentTrip.pickupGroups);
      const deliveryGroups =
        currentTrip.phase === 'idle'
          ? hydrated.deliveryGroups
          : mergeTripGroupStatus(hydrated.deliveryGroups, currentTrip.deliveryGroups);
      const origin = resolveTripOrigin(driverPoint, pickupGroups, deliveryGroups);

      let routed;
      try {
        routed = await buildRoutes(pickupGroups, deliveryGroups, origin);
      } catch {
        routed = {
          pickupGroups: applySequences(pickupGroups, nearestPendingStopIds(origin, pickupGroups)),
          deliveryGroups: applySequences(deliveryGroups, nearestPendingStopIds(origin, deliveryGroups)),
          pickupRoute: null,
          deliveryRoute: null,
          totalDistanceKm: 0,
          totalDurationMinutes: 0,
        };
      }

      const hasPendingPickup = routed.pickupGroups.some((group) => group.status === 'pending');
      const hasPendingDelivery = routed.deliveryGroups.some((group) => group.status === 'pending');
      const phase: DriverTripPhase = hasPendingPickup ? 'pickup' : hasPendingDelivery ? 'delivery' : 'completed';
      const currentStopId =
        phase === 'pickup'
          ? routed.pickupGroups.find((group) => group.status === 'pending')?.id ?? null
          : phase === 'delivery'
            ? routed.deliveryGroups.find((group) => group.status === 'pending')?.id ?? null
            : null;

      setTrip({
        phase,
        startedAt: currentTrip.startedAt ?? new Date().toISOString(),
        completedAt: phase === 'completed' ? new Date().toISOString() : null,
        pickupGroups: routed.pickupGroups,
        deliveryGroups: routed.deliveryGroups,
        currentStopId,
        pickupRoute: routed.pickupRoute,
        deliveryRoute: routed.deliveryRoute,
        totalDistanceKm: routed.totalDistanceKm,
        totalDurationMinutes: routed.totalDurationMinutes,
      });
    },
    [buildRoutes, refreshDriverLocation],
  );

  const startTrip = useCallback(
    async (orders: DeliveryOrder[]) => {
      await applyTripFromOrders(orders, { requirePickup: true });
    },
    [applyTripFromOrders],
  );

  const resumeTrip = useCallback(
    async (orders: DeliveryOrder[]) => {
      await applyTripFromOrders(orders);
    },
    [applyTripFromOrders],
  );

  const refreshTripRoutes = useCallback(
    async (orders: DeliveryOrder[]) => {
      await applyTripFromOrders(orders);
    },
    [applyTripFromOrders],
  );

  const completePickupStop = useCallback(async (stopId: string, otp: string, orders: DeliveryOrder[]) => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) return 'Enter customer OTP or scan QR code';

    try {
      const group = findPickupStopGroup(stopId, tripRef.current.pickupGroups, orders);
      if (!group) return 'Pickup stop not found';

      const orderId = group.orders[0]?.id;
      if (!orderId) return 'Pickup stop not found';

      let order = orders.find((entry) => entry.id === orderId) ?? group.orders[0];
      const pendingStatuses: DeliveryOrder['status'][] = [
        'driver_assigned',
        'at_pickup',
        'pickup_verified',
        'awaiting_driver',
        'food_ready',
      ];
      if (!pendingStatuses.includes(order.status)) {
        return null;
      }

      if (order.status !== 'at_pickup' && order.status !== 'pickup_verified') {
        order = await markAtPickup(order.id);
      }

      try {
        order = await verifyPickup(order.id, trimmedOtp);
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid OTP or QR code';
      }

      await markPickedUp(order.id);

      setTrip((current) => {
        const pickupGroups = current.pickupGroups.map((entry) =>
          entry.id === group.id || entry.orders.some((item) => item.id === orderId)
            ? { ...entry, status: 'completed' as const }
            : entry,
        );
        const origin = driverLocationRef.current ?? group.point;
        const nextPickupId = nearestPendingStopIds(origin, pickupGroups)[0] ?? null;
        const allPickupsDone = !pickupGroups.some((entry) => entry.status === 'pending');

        return {
          ...current,
          pickupGroups,
          phase: allPickupsDone ? 'delivery' : 'pickup',
          currentStopId: allPickupsDone
            ? current.deliveryGroups.find((entry) => entry.status === 'pending')?.id ?? null
            : nextPickupId,
          pickupRoute: allPickupsDone ? null : current.pickupRoute,
        };
      });

      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not verify pickup';
    }
  }, []);

  const markPickupStopReached = useCallback((stopId: string) => {
    setTrip((current) => {
      if (current.currentStopId === stopId && current.phase === 'pickup') return current;
      return { ...current, currentStopId: stopId };
    });
  }, []);

  const markDeliveryStopReached = useCallback((stopId: string) => {
    setTrip((current) => {
      if (current.currentStopId === stopId && current.phase === 'delivery') return current;
      return { ...current, currentStopId: stopId, phase: 'delivery' };
    });
  }, []);

  const completeDeliveryStop = useCallback((stopId: string) => {
    setTrip((current) => {
      const deliveryGroups = current.deliveryGroups.map((entry) => {
        const matches =
          entry.id === stopId ||
          entry.orders.some(
            (order) => order.id === stopId.replace(/^drop-/, '') || `drop-${order.id}` === stopId,
          );
        return matches ? { ...entry, status: 'completed' as const } : entry;
      });
      const origin = driverLocationRef.current ?? current.deliveryGroups.find((entry) => entry.id === stopId)?.point;
      const nextDropId = origin
        ? nearestPendingStopIds(origin, deliveryGroups)[0] ?? null
        : deliveryGroups.find((entry) => entry.status === 'pending')?.id ?? null;
      const allDone = !deliveryGroups.some((entry) => entry.status === 'pending');

      return {
        ...current,
        deliveryGroups,
        currentStopId: allDone ? null : nextDropId,
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
    if (user?.id) {
      void clearPersistedDriverTrip(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || user.role !== 'driver') return;
    let cancelled = false;
    void loadPersistedDriverTrip(user.id).then((saved) => {
      if (cancelled || !saved) return;
      setTrip(saved.trip);
      if (saved.stats) setStats(saved.stats);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id || user.role !== 'driver') return;
    if (trip.phase === 'pickup' || trip.phase === 'delivery') {
      void savePersistedDriverTrip(user.id, { trip, stats });
      return;
    }
    void clearPersistedDriverTrip(user.id);
  }, [trip, stats, user?.id, user?.role]);

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
      resumeTrip,
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
      resumeTrip,
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
