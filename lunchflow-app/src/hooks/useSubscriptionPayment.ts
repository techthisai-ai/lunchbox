import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  SubscriptionPlan,
  isAddonSubscriptionPlan,
  isSingleOrderPlan,
} from '../constants/subscriptions';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { launchOnlinePayment, processOnlinePayment } from '../services/paymentService';
import { sendCustomerSmsAndWhatsApp } from '../services/messagingService';
import {
  checkSubscriptionRenewalReminders,
  hasActiveMonthlySubscription,
  saveActiveSubscription,
} from '../services/subscriptionService';
import { resolvePlanAmount } from '../services/slotPricingService';
import { buildSubscriptionPaymentDescription } from '../utils/paymentDescription';

type PaymentDraft = {
  amountPaid: number;
  description: string;
  plan: SubscriptionPlan;
  quantity: number;
};

type Options = {
  bookPickupAfterPurchase?: boolean;
  peopleCount?: number;
  onSuccess?: (plan: SubscriptionPlan, methodLabel: string, amountPaid: number) => void;
};

export function useSubscriptionPayment(options: Options = {}) {
  const { bookPickupAfterPurchase = true, peopleCount = 1, onSuccess } = options;
  const { user } = useAuth();
  const { bookPickup } = useDelivery();
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState('');

  const startPaymentForPlan = useCallback(
    async (plan: SubscriptionPlan, quantity = peopleCount) => {
      if (!user?.phone) return;

      const count = Math.max(1, quantity);

      if (isAddonSubscriptionPlan(plan) && !(await hasActiveMonthlySubscription(user.phone))) {
        Alert.alert(
          'Monthly plan required',
          'Add-on plans are available only when you have an active monthly subscription.',
        );
        return;
      }

      setMessage('');
      let amountPaid = await resolvePlanAmount(plan.id);
      if (isSingleOrderPlan(plan)) {
        amountPaid = await resolvePlanAmount(plan.id, { peopleCount: count, phone: user.phone });
      } else if (isAddonSubscriptionPlan(plan)) {
        amountPaid = await resolvePlanAmount(plan.id, { peopleCount: count, phone: user.phone });
      }
      setPaymentDraft({
        plan,
        amountPaid,
        quantity: count,
        description: buildSubscriptionPaymentDescription(plan, count, amountPaid),
      });
      setPaymentVisible(true);
    },
    [user?.phone, peopleCount],
  );

  const closePayment = useCallback(() => {
    if (!paying) setPaymentVisible(false);
  }, [paying]);

  const handlePaymentSelect = useCallback(
    async (methodId: string) => {
      if (!paymentDraft || !user?.phone) return;

      const { plan, amountPaid, description, quantity } = paymentDraft;
      setPaying(true);
      setMessage('');

      try {
        const { launched, methodLabel } = await launchOnlinePayment(methodId, amountPaid, description);

        if (!launched) {
          setMessage('Could not open payment app. Please try another method.');
          setPaying(false);
          return;
        }

        await processOnlinePayment(user.phone, amountPaid, description, methodLabel, plan.id);
        await saveActiveSubscription(
          user.phone,
          plan.id,
          amountPaid,
          undefined,
          undefined,
          methodLabel,
          isSingleOrderPlan(plan) || isAddonSubscriptionPlan(plan) ? quantity : undefined,
        );

        let pickupError: string | null = null;
        if (bookPickupAfterPurchase && !isAddonSubscriptionPlan(plan)) {
          pickupError = await bookPickup();
        }

        await checkSubscriptionRenewalReminders(user.phone);

        await sendCustomerSmsAndWhatsApp(
          user.phone,
          `LunchFlow: Payment of ₹${amountPaid} received via ${methodLabel} for ${plan.name}.`,
          `Your ${plan.name} subscription payment was successful.`,
        );

        setPaymentVisible(false);

        if (pickupError) {
          setMessage(`Payment received via ${methodLabel}, but pickup booking failed: ${pickupError}`);
        } else {
          const expiryNote = isSingleOrderPlan(plan)
            ? ' Valid until your delivery is completed.'
            : isAddonSubscriptionPlan(plan)
              ? ' Valid for today only (1 day).'
              : '';
          const pickupNote =
            bookPickupAfterPurchase && !isAddonSubscriptionPlan(plan) ? ' Pickup booked for today.' : '';
          setMessage(`Paid ₹${amountPaid} via ${methodLabel}. ${plan.name} is active.${pickupNote}${expiryNote}`);
        }

        onSuccess?.(plan, methodLabel, amountPaid);
      } catch (error) {
        const note = error instanceof Error ? error.message : 'Payment could not be completed. Please try again.';
        setMessage(note);
      } finally {
        setPaying(false);
      }
    },
    [paymentDraft, user?.phone, bookPickup, bookPickupAfterPurchase, onSuccess, peopleCount],
  );

  return {
    paymentVisible,
    paymentDraft,
    paying,
    message,
    setMessage,
    startPaymentForPlan,
    handlePaymentSelect,
    closePayment,
  };
}
