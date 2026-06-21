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
import { addDeliveryToHistory } from '../services/deliveryHistoryService';
import { sendCustomerSmsAndWhatsApp } from '../services/messagingService';
import {
  createBooking,
  getCustomerOrderToday,
  loadCustomerProfile,
  markFoodReady as markFoodReadyHub,
  processExpiredPickupOrders,
  subscribeToOrder,
} from '../services/orderHubService';
import { subscribeToOrderChanges } from '../services/orderSync';
import { DeliveryOrder, FoodReadyDetails } from '../types/delivery';
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
  refreshDelivery: () => Promise<void>;
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
    a.foodReadyAt === b.foodReadyAt &&
    a.pickedUpAt === b.pickedUpAt &&
    a.deliveredAt === b.deliveredAt &&
    a.pickupOtp === b.pickupOtp &&
    a.driverLocation?.lat === b.driverLocation?.lat &&
    a.driverLocation?.lng === b.driverLocation?.lng &&
    a.driver?.id === b.driver?.id &&
    a.driver?.etaMinutes === b.driver?.etaMinutes &&
    a.estimatedArrival === b.estimatedArrival
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
  const phoneRef = useRef('');
  const customerIdRef = useRef('');
  const userNameRef = useRef<string | undefined>(undefined);

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

  const maybeSaveHistory = useCallback(async (remote: DeliveryOrder | null) => {
    if (!remote || remote.status !== 'delivered' || !phoneRef.current) return;
    if (historySavedRef.current === remote.id) return;
    historySavedRef.current = remote.id;
    await addDeliveryToHistory(phoneRef.current, remote);
    promptRatingForOrder(remote, phoneRef.current);
  }, [promptRatingForOrder]);

  const refreshDelivery = useCallback(async () => {
    if (!isCustomer || !phoneRef.current) {
      syncOrder(null);
      setLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      let remote = await getCustomerOrderToday(phoneRef.current);
      if (!remote && customerIdRef.current) {
        const profile = await loadCustomerProfile(phoneRef.current);
        remote = await createBooking(customerIdRef.current, phoneRef.current, {
          ...profile,
          name: userNameRef.current ?? profile.name,
        });
      }
      syncOrder(remote);
      await maybeSaveHistory(remote);
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [isCustomer, syncOrder, maybeSaveHistory]);

  useEffect(() => {
    if (!isCustomer || !phone) return undefined;
    if (!order?.id) return undefined;

    return subscribeToOrder(order.id, (remote) => {
      syncOrder(remote);
      void maybeSaveHistory(remote);
      setLoading(false);
      hasLoadedRef.current = true;
    });
  }, [phone, order?.id, isCustomer, syncOrder, maybeSaveHistory]);

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
      await sendCustomerSmsAndWhatsApp(
        phone,
        `LunchFlow: Pickup & delivery booked for ${booked.studentName}.`,
        `Your daily lunchbox delivery to ${booked.school} is booked for today.`,
      );
      return null;
    } catch {
      return 'Could not book pickup. Please try again';
    }
  }, [phone, customerId, user?.name, syncOrder]);

  const markFoodReady = useCallback(async (details: FoodReadyDetails): Promise<MarkFoodReadyResult> => {
    if (!phone || !customerId) {
      return { error: 'Please log in to request pickup', order: null };
    }

    setSubmitting(true);
    try {
      let current = order ?? localOrderRef.current;
      if (!current) {
        const profile = await loadCustomerProfile(phone);
        current = await createBooking(customerId, phone, { ...profile, name: user?.name ?? profile.name });
      }

      if (current.status === 'booked' || current.status === 'awaiting_driver' || current.status === 'food_ready') {
        const updated = await markFoodReadyHub(phone, details);
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
      setSubmitting(false);
    }
  }, [phone, customerId, order, user?.name, syncOrder]);

  const value = useMemo<DeliveryContextValue>(
    () => ({
      order,
      loading,
      submitting,
      getOrderSnapshot,
      bookPickup,
      markFoodReady,
      refreshDelivery,
    }),
    [order, loading, submitting, getOrderSnapshot, bookPickup, markFoodReady, refreshDelivery],
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error('useDelivery must be used within DeliveryProvider');
  return ctx;
}

export { addDeliveryToHistory };
