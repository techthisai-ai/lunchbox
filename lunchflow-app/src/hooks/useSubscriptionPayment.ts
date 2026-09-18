import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  SubscriptionPlan,
  isAddonSubscriptionPlan,
  isSingleOrderPlan,
} from '../constants/subscriptions';
import { CheckoutPaymentChoice } from '../components/PaymentMethodSelector';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { openRazorpayCheckout } from '../services/razorpayCheckout';
import { sendCustomerSmsAndWhatsApp } from '../services/messagingService';
import {
  checkSubscriptionRenewalReminders,
  hasActiveMonthlySubscription,
  saveActiveSubscription,
  SubscriptionCheckoutMeta,
} from '../services/subscriptionService';
import { resolvePlanAmount } from '../services/slotPricingService';
import { buildSubscriptionPaymentDescription } from '../utils/paymentDescription';
import { showCheckoutAlert } from '../utils/checkoutFeedback';

type Options = {
  bookPickupAfterPurchase?: boolean;
  peopleCount?: number;
  onSuccess?: (plan: SubscriptionPlan, methodLabel: string, amountPaid: number) => void;
};

export function useSubscriptionPayment(options: Options = {}) {
  const { bookPickupAfterPurchase = true, peopleCount = 1, onSuccess } = options;
  const { user } = useAuth();
  const { bookPickup } = useDelivery();
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<CheckoutPaymentChoice>('online');
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>('info');

  const handleCheckout = useCallback(
    async (plan: SubscriptionPlan, quantity = peopleCount) => {
      if (!user?.phone) {
        showCheckoutAlert('Sign in required', 'Please log in with your phone number to subscribe.');
        return;
      }

      const count = Math.max(1, quantity);

      if (isAddonSubscriptionPlan(plan) && !(await hasActiveMonthlySubscription(user.phone))) {
        Alert.alert(
          'Monthly plan required',
          'Add-on plans are available only when you have an active monthly subscription.',
        );
        return;
      }

      setMessage('');
      setMessageTone('info');
      setPaying(true);

      try {
        let amountPaid = await resolvePlanAmount(plan.id);
        if (isSingleOrderPlan(plan) || isAddonSubscriptionPlan(plan)) {
          amountPaid = await resolvePlanAmount(plan.id, { peopleCount: count, phone: user.phone });
        }

        if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
          throw new Error('This plan is already active for the selected quantity. No additional payment is due.');
        }

        const description = buildSubscriptionPaymentDescription(plan, count, amountPaid);
        let checkoutMeta: SubscriptionCheckoutMeta;
        let methodLabel: string;

        if (paymentMethodChoice === 'online') {
          const result = await openRazorpayCheckout({
            amountInr: amountPaid,
            description,
            prefillName: user.name,
            prefillContact: user.phone,
            prefillEmail: user.email,
          });
          methodLabel = 'Razorpay';
          checkoutMeta = {
            paymentMethodLabel: methodLabel,
            payment_method: 'RAZORPAY',
            payment_status: 'PAID',
            transaction_id: result.razorpay_payment_id,
            amount_due: 0,
          };
        } else {
          methodLabel = 'By Cash';
          checkoutMeta = {
            paymentMethodLabel: methodLabel,
            payment_method: 'COD',
            payment_status: 'PENDING_COD',
            transaction_id: null,
            amount_due: amountPaid,
          };
        }

        await saveActiveSubscription(
          user.phone,
          plan.id,
          amountPaid,
          undefined,
          undefined,
          methodLabel,
          isSingleOrderPlan(plan) || isAddonSubscriptionPlan(plan) ? count : undefined,
          checkoutMeta,
        );

        let pickupError: string | null = null;
        if (bookPickupAfterPurchase && !isAddonSubscriptionPlan(plan)) {
          try {
            pickupError = await bookPickup();
          } catch {
            pickupError = 'Could not book pickup. Please try again from Home.';
          }
        }

        try {
          await checkSubscriptionRenewalReminders(user.phone);
        } catch {
          // Non-blocking.
        }

        if (paymentMethodChoice === 'online') {
          try {
            await sendCustomerSmsAndWhatsApp(
              user.phone,
              `LunchFlow: Payment of ₹${amountPaid} received via ${methodLabel} for ${plan.name}.`,
              `Your ${plan.name} subscription payment was successful.`,
            );
          } catch {
            // Non-blocking.
          }
        }

        const expiryNote = isSingleOrderPlan(plan)
          ? ' Valid until your delivery is completed.'
          : isAddonSubscriptionPlan(plan)
            ? ' Valid for today only (1 day).'
            : '';
        const pickupNote =
          bookPickupAfterPurchase && !isAddonSubscriptionPlan(plan) && !pickupError
            ? ' Pickup booked for today.'
            : '';

        let successMessage: string;
        if (paymentMethodChoice === 'cod') {
          successMessage = `Subscription activated with By Cash! Please pay ₹${amountPaid.toLocaleString('en-IN')} to the delivery executive at drop-off.${pickupNote}${expiryNote}`;
          showCheckoutAlert(
            'Order Placed!',
            `Your ${plan.name} subscription is active. Please pay ₹${amountPaid.toLocaleString('en-IN')} in cash when your lunch is delivered.`,
          );
        } else {
          successMessage = `Paid ₹${amountPaid.toLocaleString('en-IN')} via ${methodLabel}. ${plan.name} is now active.${pickupNote}${expiryNote}`;
          showCheckoutAlert('Subscription Active!', successMessage);
        }

        if (pickupError) {
          successMessage = `${successMessage} Note: ${pickupError}`;
        }

        setMessageTone('success');
        setMessage(successMessage);
        onSuccess?.(plan, methodLabel, amountPaid);
      } catch (error) {
        const note =
          error instanceof Error ? error.message : 'Checkout could not be completed. Please try again.';
        setMessageTone('error');
        setMessage(note);
        showCheckoutAlert('Checkout failed', note);
      } finally {
        setPaying(false);
      }
    },
    [user, paymentMethodChoice, bookPickup, bookPickupAfterPurchase, onSuccess, peopleCount],
  );

  return {
    paymentMethodChoice,
    setPaymentMethodChoice,
    paying,
    message,
    messageTone,
    setMessage,
    handleCheckout,
  };
}
