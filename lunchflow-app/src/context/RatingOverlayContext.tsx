import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { RatingDialog } from '../components/RatingDialog';
import { DeliveryOrder } from '../types/delivery';
import { loadRatingsForCustomer, submitOrderRating } from '../services/ratingService';

type RatingOverlayContextValue = {
  promptRatingForOrder: (order: DeliveryOrder, phone: string) => void;
};

const RatingOverlayContext = createContext<RatingOverlayContextValue | null>(null);

export function RatingOverlayProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [phone, setPhone] = useState('');

  const promptRatingForOrder = useCallback(async (nextOrder: DeliveryOrder, customerPhone: string) => {
    if (!nextOrder.driver?.id) return;
    const existing = await loadRatingsForCustomer(customerPhone);
    if (existing.some((r) => r.orderId === nextOrder.id)) return;
    setOrder(nextOrder);
    setPhone(customerPhone);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setOrder(null);
    setPhone('');
  }, []);

  const handleSubmit = useCallback(
    async (stars: number, review: string) => {
      if (!order || !phone) return 'Missing order';
      setSubmitting(true);
      try {
        await submitOrderRating({
          orderId: order.id,
          customerPhone: phone,
          driverId: order.driver?.id,
          stars,
          review,
        });
        close();
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : 'Could not submit rating';
      } finally {
        setSubmitting(false);
      }
    },
    [close, order, phone],
  );

  const value = useMemo(() => ({ promptRatingForOrder }), [promptRatingForOrder]);

  return (
    <RatingOverlayContext.Provider value={value}>
      {children}
      <RatingDialog
        visible={visible}
        driverName={order?.driver?.name}
        submitting={submitting}
        onSubmit={handleSubmit}
        onSkip={close}
      />
    </RatingOverlayContext.Provider>
  );
}

export function useRatingOverlay() {
  const ctx = useContext(RatingOverlayContext);
  if (!ctx) throw new Error('useRatingOverlay must be used within RatingOverlayProvider');
  return ctx;
}
