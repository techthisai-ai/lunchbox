import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { addDeliveryToHistory, syncDeliveryHistory } from '../services/deliveryHistoryService';
import { expireSubscriptionAfterDelivery, getFoodReadyDeliveryQuota, validateFoodReadyDropLocations, validateFoodReadyPeopleCount } from '../services/subscriptionService';
import { hasCustomerRatedOrder } from '../services/ratingService';
import {
  cancelCustomerOrder,
  createBooking,
  getCustomerOrderToday,
  loadCustomerProfile,
  markFoodReady as markFoodReadyHub,
  processExpiredPickupOrders,
  subscribeToOrder,
} from '../services/orderHubService';
import { subscribeToOrderChanges } from '../services/orderSync';
import { saveFoodReadyDefaults } from '../services/foodReadyDefaultsService';
import { DeliveryOrder, FoodReadyDetails } from '../types/delivery';
import { presentLunchboxDeliveredBanner } from '../services/pushNotificationService';
import { useAuth } from './AuthContext';
import { useRatingOverlay } from './RatingOverlayContext';

type MarkFoodReadyResult = {
  error: string | null;
  order: DeliveryOrder | null;
};

type DeliveryContextValue = {
  order: DeliveryOrder | null;
  loading: boolean;
  submitting: boolean;
  getOrderSnapshot: () => DeliveryOrder | null;
  bookPickup: () => Promise<string | null>;
  markFoodReady: (details: FoodReadyDetails) => Promise<MarkFoodReadyResult>;
  cancelOrder: () => Promise<string | null>;
  refreshDelivery: (options?: { force?: boolean }) => Promise<void>;
};

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

function ordersEqual(a: DeliveryOrder | null, b: DeliveryOrder | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.pickupAddress === b.pickupAddress &&
    a.dropAddress === b.dropAddress &&
    a.school === b.school &&
    a.studentName === b.studentName &&
    a.bookedAt === b.bookedAt &&
    a.foodReadyAt === b.foodReadyAt &&
    a.pickedUpAt === b.pickedUpAt &&
    a.deliveredAt === b.deliveredAt &&
    a.pickupOtp === b.pickupOtp &&
    a.driverLocation?.lat === b.driverLocation?.lat &&
    a.driverLocation?.lng === b.driverLocation?.lng &&
    a.driver?.id === b.driver?.id &&
    a.driver?.etaMinutes === b.driver?.etaMinutes &&
    a.estimatedArrival === b.estimatedArrival &&
    a.estimatedArrivalAtIso === b.estimatedArrivalAtIso
  );
}

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { promptRatingForOrder } = useRatingOverlay();
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const localOrderRef = useRef<DeliveryOrder | null>(null);
  const hasLoadedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const historySavedRef = useRef<string | null>(null);
  const ratingPromptedRef = useRef<string | null>(null);
  const phoneRef = useRef('');
  const customerIdRef = useRef('');
  const userNameRef = useRef<string | undefined>(undefined);
  const markReadyLockRef = useRef(false);

  const isCustomer = user?.role === 'customer';
  const phone = isCustomer ? (user?.phone ?? '') : '';
  const customerId = isCustomer ? (user?.id ?? '') : '';

  phoneRef.current = phone;
  customerIdRef.current = customerId;
  userNameRef.current = user?.name;

  const getOrderSnapshot = useCallback(() => localOrderRef.current, []);

  const syncOrder = useCallback((next: DeliveryOrder | null) => {
    localOrderRef.current = next;
    setOrder((prev) => (ordersEqual(prev, next) ? prev : next));
  }, []);

  const handleDeliveredOrder = useCallback(async (remote: DeliveryOrder | null) => {
    if (!remote || remote.status !== 'delivered' || !phoneRef.current) return;

    await expireSubscriptionAfterDelivery(phoneRef.current, remote.students);

    if (historySavedRef.current !== remote.id) {
      historySavedRef.current = remote.id;
      await addDeliveryToHistory(phoneRef.current, remote);
    }

    if (ratingPromptedRef.current === remote.id) return;
    if (await hasCustomerRatedOrder(phoneRef.current, remote.id)) {
      ratingPromptedRef.current = remote.id;
      return;
    }

    ratingPromptedRef.current = remote.id;
    promptRatingForOrder(remote, phoneRef.current);
  }, [promptRatingForOrder]);

  const handleCancelledOrder = useCallback(async (remote: DeliveryOrder | null) => {
    if (!remote || remote.status !== 'pickup_closed' || !phoneRef.current) return;
    await syncDeliveryHistory(phoneRef.current, [remote]);
  }, []);

  const refreshDelivery = useCallback(async (options?: { force?: boolean }) => {
    if (!isCustomer || !phoneRef.current) {
      syncOrder(null);
      setLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    if (refreshInFlightRef.current && !options?.force) return;
    refreshInFlightRef.current = true;

    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      let remote = await getCustomerOrderToday(phoneRef.current);
      if (remote?.status === 'pickup_closed') {
        const current = localOrderRef.current;
        // Keep the active booking on screen if a cancelled sibling was returned.
        if (current && current.status !== 'pickup_closed' && current.status !== 'delivered') {
          return;
        }
        syncOrder(null);
        return;
      }
      if (!remote) {
        const current = localOrderRef.current;
        // Transient sync gaps — never wipe an in-progress order or spawn a duplicate booked row.
        if (current && current.status !== 'pickup_closed') {
          return;
        }
        if (customerIdRef.current) {
          const profile = await loadCustomerProfile(phoneRef.current);
          remote = await createBooking(customerIdRef.current, phoneRef.current, {
            ...profile,
            name: userNameRef.current ?? profile.name,
          });
        }
      }
      if (!remote) return;
      syncOrder(remote);
      await handleDeliveredOrder(remote);
      await handleCancelledOrder(remote);
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [isCustomer, syncOrder, handleDeliveredOrder, handleCancelledOrder]);

  useEffect(() => {
    if (!isCustomer || !phone) return undefined;
    if (!order?.id) return undefined;

    return subscribeToOrder(order.id, (remote) => {
      // Ignore transient null snapshots — they flash home back to BOOKED
      // and hide the tracking/date row.
      if (!remote) return;
      if (remote.status === 'pickup_closed') {
        syncOrder(null);
        void handleCancelledOrder(remote);
        setLoading(false);
        hasLoadedRef.current = true;
        return;
      }
      const previousStatus = localOrderRef.current?.status;
      syncOrder(remote);
      if (previousStatus && previousStatus !== 'delivered' && remote.status === 'delivered') {
        void presentLunchboxDeliveredBanner(remote);
      }
      void handleDeliveredOrder(remote);
      void handleCancelledOrder(remote);
      setLoading(false);
      hasLoadedRef.current = true;
    });
  }, [phone, order?.id, isCustomer, syncOrder, handleDeliveredOrder, handleCancelledOrder]);

  useEffect(() => {
    historySavedRef.current = null;
    hasLoadedRef.current = false;
    if (!isCustomer) {
      syncOrder(null);
      setLoading(false);
      return;
    }
    void refreshDelivery();
  }, [phone, customerId, isCustomer, refreshDelivery, syncOrder]);

  useEffect(() => {
    if (!isCustomer) return undefined;
    const interval = setInterval(() => {
      void refreshDelivery();
      void processExpiredPickupOrders();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshDelivery, isCustomer]);

  useEffect(() => {
    if (!isCustomer) return undefined;
    return subscribeToOrderChanges(() => {
      void refreshDelivery();
    });
  }, [refreshDelivery, isCustomer]);

  useEffect(() => {
    if (!user) {
      syncOrder(null);
      hasLoadedRef.current = false;
      historySavedRef.current = null;
    }
  }, [user, syncOrder]);

  const bookPickup = useCallback(async () => {
    if (!phone || !customerId) return 'Please log in to book pickup';
    try {
      const profile = await loadCustomerProfile(phone);
      const booked = await createBooking(customerId, phone, { ...profile, name: user?.name ?? profile.name });
      syncOrder(booked);
      return null;
    } catch {
      return 'Could not book pickup. Please try again';
    }
  }, [phone, customerId, user?.name, syncOrder]);

  const markFoodReady = useCallback(async (details: FoodReadyDetails): Promise<MarkFoodReadyResult> => {
    if (!phone || !customerId) {
      return { error: 'Please log in to request pickup', order: null };
    }
    if (markReadyLockRef.current) {
      return { error: 'You already sent a pickup request', order: order ?? localOrderRef.current };
    }

    setSubmitting(true);
    markReadyLockRef.current = true;
    try {
      const students = details.students?.filter((entry) => entry.name.trim()) ?? [];
      const peopleCount = Math.max(1, students.length || (details.person?.trim() ? 1 : 0));
      const quota = await getFoodReadyDeliveryQuota(phone);
      const peopleError = validateFoodReadyPeopleCount(peopleCount, quota);
      if (peopleError) {
        return { error: peopleError, order: null };
      }
      if (students.length > 0) {
        const dropError = await validateFoodReadyDropLocations(phone, students, quota);
        if (dropError) {
          return { error: dropError, order: null };
        }
      }

      let current = order ?? localOrderRef.current;
      if (!current) {
        const profile = await loadCustomerProfile(phone);
        current = await createBooking(customerId, phone, { ...profile, name: user?.name ?? profile.name });
      }

      if (current.status === 'pickup_closed') {
        const profile = await loadCustomerProfile(phone);
        current = await createBooking(customerId, phone, { ...profile, name: user?.name ?? profile.name });
      }

      if (current.status === 'booked' || current.status === 'awaiting_driver' || current.status === 'food_ready') {
        const updated = await markFoodReadyHub(phone, details);
        await saveFoodReadyDefaults(phone, details);
        syncOrder(updated);
        return { error: null, order: updated };
      }

      if (current.status === 'delivered') {
        return { error: 'Today\'s delivery is already completed', order: null };
      }

      return { error: null, order: current };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not mark food ready', order: null };
    } finally {
      markReadyLockRef.current = false;
      setSubmitting(false);
    }
  }, [phone, customerId, order, user?.name, syncOrder]);

  const cancelOrder = useCallback(async (): Promise<string | null> => {
    if (!phone) return 'Please log in to cancel';
    try {
      const updated = await cancelCustomerOrder(phone);
      syncOrder(updated);
      await syncDeliveryHistory(phone, [updated]);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not cancel order';
    }
  }, [phone, syncOrder]);

  const value = useMemo<DeliveryContextValue>(
    () => ({
      order,
      loading,
      submitting,
      getOrderSnapshot,
      bookPickup,
      markFoodReady,
      cancelOrder,
      refreshDelivery,
    }),
    [order, loading, submitting, getOrderSnapshot, bookPickup, markFoodReady, cancelOrder, refreshDelivery],
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error('useDelivery must be used within DeliveryProvider');
  return ctx;
}

export { addDeliveryToHistory };
