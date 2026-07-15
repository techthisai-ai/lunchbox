import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { OnlinePaymentDialog } from './OnlinePaymentDialog';
import {
  SubscriptionPlan,
  getSubscriptionPlan,
  isAddonSubscriptionPlan,
  isSingleOrderPlan,
} from '../constants/subscriptions';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { launchOnlinePayment, processOnlinePayment } from '../services/paymentService';
import {
  hasActiveMonthlySubscription,
  hasActiveSubscription,
  loadActiveSubscriptionRecord,
  saveActiveSubscription,
} from '../services/subscriptionService';
import { CustomerSubscription } from '../types/subscription';
import { loadSubscriptionDetailPlans, resolvePlanAmount } from '../services/slotPricingService';

type PaymentDraft = {
  amountPaid: number;
  description: string;
};

function getDaysRemaining(endDate: string): number {
  const end = new Date(`${endDate}T23:59:59`);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
}

function getPlanStatusText(plan: SubscriptionPlan, subscription: CustomerSubscription): string {
  if (isSingleOrderPlan(plan)) {
    return 'Valid until your delivery is completed';
  }
  const days = getDaysRemaining(subscription.endDate);
  if (days === 0) return 'Plan ends today';
  if (days === 1) return 'Plan ending in 1 day';
  return `Plan ending in ${days} days`;
}

function ActivePlanBanner({
  plan,
  subscription,
}: {
  plan: SubscriptionPlan;
  subscription: CustomerSubscription;
}) {
  const statusText = getPlanStatusText(plan, subscription);
  const urgent = !isSingleOrderPlan(plan) && getDaysRemaining(subscription.endDate) <= 3;

  return (
    <View style={[styles.activeBanner, urgent && styles.activeBannerUrgent]}>
      <View style={styles.activeBannerTop}>
        <View style={styles.activeIcon}>
          <Ionicons name="document-text-outline" size={18} color={colors.orange} />
        </View>
        <View style={styles.activeCopy}>
          <Text style={styles.activeTitle}>{plan.detailTitle ?? plan.name}</Text>
          <Text style={styles.activePrice}>{plan.price}</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>
      <Text style={[styles.activeStatus, urgent && styles.activeStatusUrgent]}>{statusText}</Text>
      {!isSingleOrderPlan(plan) ? (
        <Text style={styles.activeMeta}>Renews on {subscription.endDate}</Text>
      ) : null}
    </View>
  );
}

function PlanOptionCard({
  plan,
  selected,
  disabled,
  onPress,
}: {
  plan: SubscriptionPlan;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const iconName = (plan.detailIcon ?? 'document-text-outline') as keyof typeof Ionicons.glyphMap;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.planOption,
        selected && styles.planOptionSelected,
        disabled && styles.planOptionDisabled,
        pressed && !disabled && styles.planOptionPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.planOptionIcon}>
        <Ionicons name={iconName} size={18} color={colors.orange} />
      </View>
      <View style={styles.planOptionCopy}>
        <Text style={styles.planOptionTitle}>{plan.detailTitle ?? plan.name}</Text>
        <Text style={styles.planOptionSub}>{plan.detailSubtitle ?? plan.desc}</Text>
      </View>
      <Text style={styles.planOptionPrice}>{plan.price}</Text>
    </Pressable>
  );
}

type Props = {
  mode?: 'picker' | 'status';
  onPlanReady?: () => void;
};

export function PickupPlanSection({ mode = 'status', onPlanReady }: Props) {
  const { user } = useAuth();
  const { bookPickup } = useDelivery();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [monthlyActive, setMonthlyActive] = useState(false);
  const [record, setRecord] = useState<CustomerSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [detailPlans, setDetailPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [paying, setPaying] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.phone) {
      setActive(false);
      setRecord(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    const [hasPlan, hasMonthly, subscriptionRecord, pricedPlans] = await Promise.all([
      hasActiveSubscription(user.phone),
      hasActiveMonthlySubscription(user.phone),
      loadActiveSubscriptionRecord(user.phone),
      loadSubscriptionDetailPlans(),
    ]);

    setDetailPlans(pricedPlans);

    setActive(hasPlan);
    setMonthlyActive(hasMonthly);
    setRecord(subscriptionRecord?.status === 'active' ? subscriptionRecord : null);
    setPlan(subscriptionRecord ? getSubscriptionPlan(subscriptionRecord.planId) : null);
    setLoading(false);

    if (hasPlan && mode === 'status') {
      onPlanReady?.();
    }
  }, [user?.phone, mode, onPlanReady]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const selectedPlan = detailPlans.find((item) => item.id === selectedPlanId);

  const startPayment = async () => {
    if (!selectedPlan) {
      setMessage('Please choose a plan to continue.');
      return;
    }
    if (isAddonSubscriptionPlan(selectedPlan) && !monthlyActive) {
      Alert.alert('Monthly plan required', 'Add-on plans are available only with an active monthly subscription.');
      return;
    }
    setMessage('');
    const amountPaid = await resolvePlanAmount(selectedPlan.id);
    setPaymentDraft({
      amountPaid,
      description: `${selectedPlan.detailTitle ?? selectedPlan.name} subscription`,
    });
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

      await processOnlinePayment(
        user.phone,
        paymentDraft.amountPaid,
        paymentDraft.description,
        methodLabel,
        selectedPlan.id,
      );

      await saveActiveSubscription(user.phone, selectedPlan.id, paymentDraft.amountPaid);

      if (!isAddonSubscriptionPlan(selectedPlan)) {
        await bookPickup();
      }

      setPaymentVisible(false);
      await refresh();
      onPlanReady?.();
      setMessage(`Paid ₹${paymentDraft.amountPaid} via ${methodLabel}. Plan is active.`);
    } catch (error) {
      const note = error instanceof Error ? error.message : 'Payment could not be completed.';
      setMessage(note);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <Text style={styles.loadingText}>Checking your plan…</Text>
      </View>
    );
  }

  if (active && record && plan && mode === 'status') {
    return <ActivePlanBanner plan={plan} subscription={record} />;
  }

  if (active && record && plan && mode === 'picker') {
    return (
      <View style={styles.wrap}>
        <ActivePlanBanner plan={plan} subscription={record} />
        <Pressable style={styles.continueBtn} onPress={() => onPlanReady?.()}>
          <Text style={styles.continueBtnText}>Continue to Drop Address</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Choose Your Plan</Text>
      <Text style={styles.sectionSub}>Select a plan and pay to continue your pickup request.</Text>

      {detailPlans.map((item) => (
        <PlanOptionCard
          key={item.id}
          plan={item}
          selected={selectedPlanId === item.id}
          disabled={isAddonSubscriptionPlan(item) && !monthlyActive}
          onPress={() => {
            setSelectedPlanId(item.id);
            setMessage('');
          }}
        />
      ))}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable
        style={({ pressed }) => [styles.payBtn, pressed && styles.payBtnPressed]}
        onPress={() => void startPayment()}
      >
        <Ionicons name="card-outline" size={18} color={colors.onPrimary} />
        <Text style={styles.payBtnText}>
          {selectedPlan ? `Pay ${selectedPlan.price} & Continue` : 'Pay & Continue'}
        </Text>
      </Pressable>

      <OnlinePaymentDialog
        visible={paymentVisible}
        amount={paymentDraft?.amountPaid ?? 0}
        description={paymentDraft?.description ?? 'Subscription payment'}
        paying={paying}
        onSelect={handlePaymentSelect}
        onCancel={() => {
          if (!paying) setPaymentVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: spacing.md },
  loadingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  loadingText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 4 },
  activeBanner: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  activeBannerUrgent: {
    borderColor: colors.orange,
    backgroundColor: '#FFF8FB',
  },
  activeBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCopy: { flex: 1, minWidth: 0 },
  activeTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  activePrice: { fontSize: 13, fontWeight: '800', color: colors.orange, marginTop: 2 },
  activeBadge: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: colors.green },
  activeStatus: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  activeStatusUrgent: { color: colors.orange },
  activeMeta: { marginTop: 4, fontSize: 11, color: colors.muted, fontWeight: '600' },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
  },
  planOptionSelected: {
    borderColor: colors.orange,
    backgroundColor: '#FFF8FB',
  },
  planOptionDisabled: { opacity: 0.65 },
  planOptionPressed: { opacity: 0.94 },
  planOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planOptionCopy: { flex: 1, minWidth: 0 },
  planOptionTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  planOptionSub: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  planOptionPrice: { fontSize: 13, fontWeight: '800', color: colors.orange },
  message: { fontSize: 12, color: colors.orange, fontWeight: '700' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingVertical: 13,
    marginTop: 4,
  },
  payBtnPressed: { opacity: 0.94 },
  payBtnText: { fontSize: 14, fontWeight: '800', color: colors.onPrimary },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingVertical: 13,
  },
  continueBtnText: { fontSize: 14, fontWeight: '800', color: colors.onPrimary },
});
