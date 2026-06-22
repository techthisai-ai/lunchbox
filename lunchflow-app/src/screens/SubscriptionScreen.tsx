import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { OnlinePaymentDialog } from '../components/OnlinePaymentDialog';
import { ScreenHeader } from '../components/ScreenHeader';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_SECTIONS, getDefaultPlanIdForRegistrationType } from '../constants/subscriptions';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { ProfileStackParamList, RootStackParamList } from '../navigation/types';
import { goToCustomerHome } from '../navigation/customerRoutes';
import { loadActiveSubscription, saveActiveSubscription, checkSubscriptionRenewalReminders, hasActiveSubscription } from '../services/subscriptionService';
import { loadCustomerRegistration } from '../services/userRegistryService';
import { getPlanBaseAmount, getPlanBillingMonths } from '../utils/subscription';
import { getAutoCouponForPlan, redeemCoupon, validateCoupon } from '../services/couponService';
import { launchOnlinePayment, processOnlinePayment } from '../services/paymentService';
import { sendCustomerSmsAndWhatsApp } from '../services/messagingService';

type SubscriptionNavigation = NativeStackNavigationProp<RootStackParamList & ProfileStackParamList>;

type PaymentDraft = {
  amountPaid: number;
  discountAmount: number;
  couponCode?: string;
  description: string;
};

export function SubscriptionScreen() {
  const navigation = useNavigation<SubscriptionNavigation>();
  const route = useRoute();
  const isOnboarding = route.name === 'SubscriptionOnboarding';
  const { user } = useAuth();
  const { bookPickup } = useDelivery();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [paying, setPaying] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(isOnboarding);

  const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId);

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) return;

      if (isOnboarding) {
        const phone = user.phone;
        setCheckingAccess(true);
        hasActiveSubscription(phone).then(async (active) => {
          if (active) {
            goToCustomerHome(navigation);
            return;
          }
          const registration = await loadCustomerRegistration(phone);
          const defaultPlanId = getDefaultPlanIdForRegistrationType(registration?.registrationType);
          setSelectedPlanId((current) => current ?? defaultPlanId);
          setCheckingAccess(false);
        });
        return;
      }

      setCheckingAccess(false);

      loadActiveSubscription(user.phone).then((plan) => {
        setSelectedPlanId(plan.id);
      });
    }, [user?.phone, isOnboarding, navigation]),
  );

  const buildPaymentDraft = async (): Promise<PaymentDraft | null> => {
    if (!selectedPlan || !user?.phone) return null;

    const months = getPlanBillingMonths(selectedPlan);
    const baseAmount = getPlanBaseAmount(selectedPlan);
    let amountPaid = baseAmount;
    let discountAmount = 0;
    let couponCode: string | undefined;

    const autoCode = getAutoCouponForPlan(selectedPlan.id, months);
    if (autoCode) {
      const coupon = await validateCoupon(autoCode, months, baseAmount);
      if (coupon.valid && coupon.offer) {
        discountAmount = coupon.discount;
        amountPaid = baseAmount - discountAmount;
        couponCode = coupon.offer.code;
      }
    }

    return {
      amountPaid,
      discountAmount,
      couponCode,
      description: `${SUBSCRIPTION_SECTIONS.find((s) => s.category === selectedPlan.category)?.title ?? 'Plan'} · ${selectedPlan.name} subscription`,
    };
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user?.phone) {
      setMessage('Please select a subscription plan first.');
      return;
    }

    const draft = await buildPaymentDraft();
    if (!draft) return;

    setMessage('');
    setPaymentDraft(draft);
    setPaymentVisible(true);
  };

  const handlePaymentSelect = async (methodId: string) => {
    if (!selectedPlan || !user?.phone || !paymentDraft) return;

    setPaying(true);
    setMessage('');

    try {
      const { launched, methodLabel } = await launchOnlinePayment(
        methodId,
        paymentDraft.amountPaid,
        paymentDraft.description,
      );

      if (!launched) {
        setMessage('Could not open payment app. Please try another method.');
        setPaying(false);
        return;
      }

      if (paymentDraft.couponCode) {
        const months = getPlanBillingMonths(selectedPlan);
        const baseAmount = getPlanBaseAmount(selectedPlan);
        const coupon = await validateCoupon(paymentDraft.couponCode, months, baseAmount);
        if (coupon.valid && coupon.offer) {
          await redeemCoupon(user.phone, coupon.offer);
        }
      }

      await processOnlinePayment(
        user.phone,
        paymentDraft.amountPaid,
        paymentDraft.description,
        methodLabel,
        selectedPlan.id,
      );

      await saveActiveSubscription(
        user.phone,
        selectedPlan.id,
        paymentDraft.amountPaid,
        paymentDraft.couponCode,
        paymentDraft.discountAmount,
      );

      const pickupError = await bookPickup();
      if (pickupError) {
        setMessage(`Payment received via ${methodLabel}, but pickup booking failed: ${pickupError}`);
        setPaymentVisible(false);
        setPaying(false);
        return;
      }

      await checkSubscriptionRenewalReminders(user.phone);

      const discountNote =
        paymentDraft.discountAmount > 0 ? ` (₹${paymentDraft.discountAmount} off applied)` : '';

      await sendCustomerSmsAndWhatsApp(
        user.phone,
        `LunchFlow: Payment of ₹${paymentDraft.amountPaid} received via ${methodLabel} for ${selectedPlan.name}${discountNote}.`,
        `Your ${selectedPlan.name} subscription payment was successful.`,
      );

      setPaymentVisible(false);
      if (isOnboarding) {
        goToCustomerHome(navigation);
        return;
      }
      setMessage(
        `Paid ₹${paymentDraft.amountPaid} via ${methodLabel}. ${selectedPlan.name} active. Pickup booked for today.`,
      );
    } catch {
      setMessage('Payment could not be completed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (isOnboarding && checkingAccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Checking your subscription…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OnlinePaymentDialog
        visible={paymentVisible}
        amount={paymentDraft?.amountPaid ?? 0}
        description={paymentDraft?.description ?? 'Subscription payment'}
        paying={paying}
        onSelect={handlePaymentSelect}
        onCancel={() => {
          if (!paying) {
            setPaymentVisible(false);
          }
        }}
      />
      <ScreenHeader
        title="Subscription Plans"
        subtitle={isOnboarding ? 'Choose a plan to get started' : 'Choose the plan that fits you'}
        onBack={isOnboarding ? undefined : () => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {SUBSCRIPTION_SECTIONS.map((section) => (
          <View key={section.category}>
            <Text style={styles.section}>{section.title}</Text>
            {SUBSCRIPTION_PLANS.filter((plan) => plan.category === section.category).map((plan) => (
              <PlanCard
                key={plan.id}
                name={plan.name}
                price={plan.price}
                period={plan.period}
                selected={selectedPlanId === plan.id}
                onPress={() => {
                  setSelectedPlanId(plan.id);
                  setMessage('');
                }}
              />
            ))}
          </View>
        ))}
        {message ? <Text style={[styles.message, message.includes('select') ? styles.messageHint : null]}>{message}</Text> : null}
        <Button title="Subscribe Now" onPress={handleSubscribe} style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  name,
  price,
  period,
  selected,
  onPress,
}: {
  name: string;
  price: string;
  period: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.plan,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {selected ? <Text style={styles.selectedBadge}>Selected</Text> : null}
      <Text style={styles.planName}>{name}</Text>
      <Text style={styles.price}>
        {price} <Text style={styles.period}>/ {period}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 4 },
  plan: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  selected: { borderColor: colors.orange, borderWidth: 3, backgroundColor: colors.orangeLight },
  pressed: { opacity: 0.92 },
  selectedBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: colors.orange,
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  planName: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  price: { fontSize: 28, fontWeight: '800', color: colors.orange },
  period: { fontSize: 14, fontWeight: '600', color: colors.muted },
  message: { fontSize: 13, color: colors.green, marginTop: 8, fontWeight: '600' },
  messageHint: { color: colors.orange },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loadingText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
});
