import { useEffect, useMemo, useRef, useState } from 'react';
import { DeliveryOrder } from '../types/delivery';
import { computeLiveEtaMinutes } from '../utils/deliveryEta';

const TICK_MS = 15000;

export function useLiveEta(order: DeliveryOrder | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  const fallbackTargetRef = useRef<{ key: string; targetAt: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    if (!order?.driver || order.status === 'delivered' || order.status === 'pickup_closed') {
      fallbackTargetRef.current = null;
      return null;
    }

    const liveEta = computeLiveEtaMinutes(order, now);
    if (order.estimatedArrivalAtIso || (order.driverLocation?.updatedAt && liveEta != null)) {
      return liveEta;
    }

    const fallbackMinutes = liveEta ?? order.driver.etaMinutes ?? 8;
    const key = `${order.id}:${order.status}:${fallbackMinutes}`;
    if (!fallbackTargetRef.current || fallbackTargetRef.current.key !== key) {
      fallbackTargetRef.current = {
        key,
        targetAt: now + fallbackMinutes * 60_000,
      };
    }

    const remainingMs = fallbackTargetRef.current.targetAt - now;
    return Math.max(0, Math.ceil(remainingMs / 60_000));
  }, [order, now]);
}
