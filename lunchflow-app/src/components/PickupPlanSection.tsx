import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PICKUP_PRICING,
  PickupPrimaryPlan,
  calculatePickupTotal,
} from '../constants/pickupPricing';
import {
  SubscriptionPlan,
  getSubscriptionPlan,
  isMonthlySubscriptionPlan,
  isSingleOrderPlan,
} from '../constants/subscriptions';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { openRazorpayCheckout } from '../services/razorpayCheckout';
import {
  calculateSingleOrderPayment,
  getFoodReadyDeliveryQuota,
  hasActiveMonthlySubscription,
  hasActiveSubscription,
  loadActiveSubscriptionRecord,
  saveActiveSubscription,
} from '../services/subscriptionService';
import { CustomerSubscription } from '../types/subscription';
import { loadSubscriptionDetailPlans } from '../services/slotPricingService';
import { formatPlanPrice } from '../utils/subscription';
import { resolveSubscriptionPlanForDisplay } from '../utils/subscriptionPlanDisplay';

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
  const paidPeople = subscription.paidPeopleCount ?? 1;
  const displayPrice =
    isSingleOrderPlan(plan) && subscription.amountPaid > 0
      ? formatPlanPrice(subscription.amountPaid)
      : plan.price;

  return (
    <View style={[styles.activeBanner, urgent && styles.activeBannerUrgent]}>
      <View style={styles.activeBannerTop}>
        <View style={styles.activeIcon}>
          <Ionicons
            name={(plan.detailIcon ?? 'document-text-outline') as keyof typeof Ionicons.glyphMap}
            size={18}
            color={colors.orange}
          />
        </View>
        <View style={styles.activeCopy}>
          <Text style={styles.activeTitle}>{plan.detailTitle ?? plan.name}</Text>
          <Text style={styles.activePrice}>{displayPrice}</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>
      <Text style={[styles.activeStatus, urgent && styles.activeStatusUrgent]}>{statusText}</Text>
      {!isSingleOrderPlan(plan) ? (
        <Text style={styles.activeMeta}>Renews on {subscription.endDate}</Text>
      ) : paidPeople > 1 ? (
        <Text style={styles.activeMeta}>Covers {paidPeople} people</Text>
      ) : null}
    </View>
  );
}

function PrimaryPlanOption({
  label,
  priceLabel,
  subtitle,
  selected,
  onPress,
}: {
  label: string;
  priceLabel: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.radioCard,
        selected && styles.radioCardSelected,
        pressed && styles.radioCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <View style={styles.radioCopy}>
        <Text style={styles.radioTitle}>{label}</Text>
        <Text style={styles.radioSub}>{subtitle}</Text>
      </View>
      <Text style={styles.radioPrice}>{priceLabel}</Text>
    </Pressable>
  );
}

function AddonCounterRow({
  title,
  subtitle,
  unitPrice,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  unitPrice: number;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.addonRow}>
      <View style={styles.addonCopy}>
        <Text style={styles.addonTitle}>{title}</Text>
        <Text style={styles.addonSub}>{subtitle}</Text>
        <Text style={styles.addonRate}>+{formatPlanPrice(unitPrice)}/person</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepperBtn, value <= 0 && styles.stepperBtnDisabled]}
          onPress={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable style={styles.stepperBtn} onPress={() => onChange(value + 1)}>
          <Ionicons name="add" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function PickupPlanPicker({
  peopleCount,
  onPlanReady,
  addonsOnly = false,
}: {
  peopleCount: number;
  onPlanReady?: () => void;
  addonsOnly?: boolean;
}) {
  const { user } = useAuth();
  const [primaryPlan, setPrimaryPlan] = useState<PickupPrimaryPlan>('single');
  const [sameDropCount, setSameDropCount] = useState(0);
  const [diffDropCount, setDiffDropCount] = useState(0);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState('');

  const totalAmount = useMemo(() => {
    if (addonsOnly) {
      return (
        sameDropCount * PICKUP_PRICING.sameDropPerPerson +
        diffDropCount * PICKUP_PRICING.diffDropPerPerson
      );
    }
    return calculatePickupTotal(primaryPlan, sameDropCount, diffDropCount);
  }, [addonsOnly, primaryPlan, sameDropCount, diffDropCount]);

  const totalPeople = 1 + sameDropCount + diffDropCount;

  const handlePayment = async () => {
    if (!user?.phone) {
      Alert.alert('Sign in required', 'Please log in to continue with payment.');
      return;
    }

    setPaying(true);
    setMessage('');

    try {
      const description = `Pickup Plan — ${primaryPlan === 'single' ? 'Single Order' : 'Monthly'}${sameDropCount || diffDropCount ? ' + add-ons' : ''}`;

      const payment = await openRazorpayCheckout({
        amountInr: totalAmount,
        description,
        name: 'LunchBox Delivery',
        prefillName: user.name,
        prefillEmail: user.email,
        prefillContact: user.phone,
      });

      const paymentLabel = `Razorpay (${payment.razorpay_payment_id})`;
      if (!addonsOnly) {
        const primaryPlanId = primaryPlan === 'single' ? 'single-order' : 'monthly-standard';
        await saveActiveSubscription(
          user.phone,
          primaryPlanId,
          primaryPlan === 'single' ? PICKUP_PRICING.singleDay : PICKUP_PRICING.monthly,
          undefined,
          undefined,
          paymentLabel,
          primaryPlan === 'single' ? Math.max(totalPeople, peopleCount) : undefined,
        );
      }

      if (addonsOnly || primaryPlan === 'monthly') {
        for (let i = 0; i < sameDropCount; i += 1) {
          await saveActiveSubscription(
            user.phone,
            'addon-same-drop',
            PICKUP_PRICING.sameDropPerPerson,
            undefined,
            undefined,
            paymentLabel,
          );
        }
        for (let i = 0; i < diffDropCount; i += 1) {
          await saveActiveSubscription(
            user.phone,
            'addon-diff-drop',
            PICKUP_PRICING.diffDropPerPerson,
            undefined,
            undefined,
            paymentLabel,
          );
        }
      }

      if (addonsOnly && sameDropCount === 0 && diffDropCount === 0) {
        throw new Error('Add at least one person using the counters above.');
      }

      Alert.alert(
        'Payment successful',
        `Payment ID: ${payment.razorpay_payment_id}\nAmount: ${formatPlanPrice(totalAmount)}`,
        [{ text: 'Continue', onPress: () => onPlanReady?.() }],
      );
      setMessage(`Paid ${formatPlanPrice(totalAmount)} successfully.`);
    } catch (error) {
      const note = error instanceof Error ? error.message : 'Payment could not be completed.';
      if (note !== 'Payment cancelled.') {
        Alert.alert('Payment failed', note);
      }
      setMessage(note);
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{addonsOnly ? 'Add Extra People' : 'Choose Your Plan'}</Text>
      <Text style={styles.sectionSub}>
        {addonsOnly
          ? 'Your monthly plan is active. Add seats for extra people, then pay to continue.'
          : 'Select a base plan, add extra people if needed, then pay to continue your pickup request.'}
      </Text>

      {!addonsOnly ? (
        <>
          <Text style={styles.groupLabel}>Primary plan</Text>
          <PrimaryPlanOption
            label="Single Order (1 Day)"
            priceLabel={formatPlanPrice(PICKUP_PRICING.singleDay)}
            subtitle="One-day delivery for a single pickup request"
            selected={primaryPlan === 'single'}
            onPress={() => setPrimaryPlan('single')}
          />
          <PrimaryPlanOption
            label="Monthly Subscription"
            priceLabel={formatPlanPrice(PICKUP_PRICING.monthly)}
            subtitle="Best for regular daily lunch delivery"
            selected={primaryPlan === 'monthly'}
            onPress={() => setPrimaryPlan('monthly')}
          />
        </>
      ) : null}

      <Text style={styles.groupLabel}>{addonsOnly ? 'Add-on seats' : 'Add-ons (optional)'}</Text>
      <View style={styles.addonCard}>
        <AddonCounterRow
          title="Same Drop Location"
          subtitle="Extra person at the same drop point"
          unitPrice={PICKUP_PRICING.sameDropPerPerson}
          value={sameDropCount}
          onChange={setSameDropCount}
        />
        <View style={styles.addonDivider} />
        <AddonCounterRow
          title="Different Drop Location"
          subtitle="Extra person at a different drop point"
          unitPrice={PICKUP_PRICING.diffDropPerPerson}
          value={diffDropCount}
          onChange={setDiffDropCount}
        />
      </View>

      <View style={styles.summaryCard}>
        {!addonsOnly ? (
          <Text style={styles.summaryLine}>
            Base plan:{' '}
            <Text style={styles.summaryValue}>
              {formatPlanPrice(primaryPlan === 'single' ? PICKUP_PRICING.singleDay : PICKUP_PRICING.monthly)}
            </Text>
          </Text>
        ) : null}
        {sameDropCount > 0 ? (
          <Text style={styles.summaryLine}>
            Same drop × {sameDropCount}:{' '}
            <Text style={styles.summaryValue}>
              {formatPlanPrice(sameDropCount * PICKUP_PRICING.sameDropPerPerson)}
            </Text>
          </Text>
        ) : null}
        {diffDropCount > 0 ? (
          <Text style={styles.summaryLine}>
            Different drop × {diffDropCount}:{' '}
            <Text style={styles.summaryValue}>
              {formatPlanPrice(diffDropCount * PICKUP_PRICING.diffDropPerPerson)}
            </Text>
          </Text>
        ) : null}
        <Text style={styles.summaryTotal}>
          Total: <Text style={styles.summaryTotalValue}>{formatPlanPrice(totalAmount)}</Text>
        </Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable
        style={({ pressed }) => [styles.payBtn, (paying || pressed) && styles.payBtnPressed]}
        onPress={() => void handlePayment()}
        disabled={paying}
      >
        <Ionicons name="card-outline" size={18} color={colors.onPrimary} />
        <Text style={styles.payBtnText}>
          {paying ? 'Processing…' : `Pay & Continue • ${formatPlanPrice(totalAmount)}`}
        </Text>
      </Pressable>
    </View>
  );
}

type Props = {
  mode?: 'picker' | 'status';
  peopleCount?: number;
  onPlanReady?: () => void;
};

export function PickupPlanSection({ mode = 'status', peopleCount = 1, onPlanReady }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [record, setRecord] = useState<CustomerSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [singleUpgradeAmount, setSingleUpgradeAmount] = useState<number | null>(null);
  const [needsMoreSeats, setNeedsMoreSeats] = useState(false);
  const [paying, setPaying] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.phone) {
      setActive(false);
      setRecord(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    const [hasPlan, subscriptionRecord, pricedPlans] = await Promise.all([
      hasActiveSubscription(user.phone),
      loadActiveSubscriptionRecord(user.phone),
      loadSubscriptionDetailPlans(),
    ]);

    void pricedPlans;
    setActive(hasPlan);
    setRecord(subscriptionRecord?.status === 'active' ? subscriptionRecord : null);
    setPlan(
      subscriptionRecord?.status === 'active'
        ? await resolveSubscriptionPlanForDisplay(subscriptionRecord.planId)
        : null,
    );

    if (hasPlan && subscriptionRecord?.status === 'active') {
      const activePlan = getSubscriptionPlan(subscriptionRecord.planId);
      if (isSingleOrderPlan(activePlan)) {
        const quote = await calculateSingleOrderPayment(user.phone, peopleCount);
        setSingleUpgradeAmount(quote.amountDue);
        setNeedsMoreSeats(peopleCount > (subscriptionRecord.paidPeopleCount ?? 1));
      } else if (isMonthlySubscriptionPlan(activePlan)) {
        const quota = await getFoodReadyDeliveryQuota(user.phone);
        setNeedsMoreSeats(peopleCount > quota.maxPeople);
        setSingleUpgradeAmount(null);
      } else {
        setNeedsMoreSeats(false);
        setSingleUpgradeAmount(null);
      }
    } else if (user.phone && peopleCount > 1) {
      const quote = await calculateSingleOrderPayment(user.phone, peopleCount);
      setSingleUpgradeAmount(quote.amountDue);
      setNeedsMoreSeats(false);
    } else {
      setSingleUpgradeAmount(null);
      setNeedsMoreSeats(false);
    }

    setLoading(false);

    if (hasPlan && mode === 'status') {
      onPlanReady?.();
    }
  }, [user?.phone, mode, onPlanReady, peopleCount]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const payUpgrade = async (amount: number, description: string, planId: string) => {
    if (!user?.phone) return;
    setPaying(true);
    try {
      const payment = await openRazorpayCheckout({
        amountInr: amount,
        description,
        name: 'LunchBox Delivery',
        prefillName: user.name,
        prefillContact: user.phone,
      });
      await saveActiveSubscription(
        user.phone,
        planId,
        amount,
        undefined,
        undefined,
        `Razorpay (${payment.razorpay_payment_id})`,
        isSingleOrderPlan(getSubscriptionPlan(planId)) ? peopleCount : undefined,
      );
      Alert.alert('Payment successful', `Payment ID: ${payment.razorpay_payment_id}`);
      await refresh();
      onPlanReady?.();
    } catch (error) {
      const note = error instanceof Error ? error.message : 'Payment failed.';
      if (note !== 'Payment cancelled.') Alert.alert('Payment failed', note);
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
    const paidPeople = record.paidPeopleCount ?? 1;
    const needsSingleUpgrade = isSingleOrderPlan(plan) && peopleCount > paidPeople && (singleUpgradeAmount ?? 0) > 0;

    if (needsSingleUpgrade) {
      return (
        <View style={styles.wrap}>
          <ActivePlanBanner plan={plan} subscription={record} />
          <Text style={styles.sectionSub}>
            Pay {formatPlanPrice(singleUpgradeAmount ?? 0)} for {peopleCount - paidPeople} more{' '}
            {peopleCount - paidPeople === 1 ? 'person' : 'people'} ({formatPlanPrice(PICKUP_PRICING.singleDay)} each).
          </Text>
          <Pressable
            style={({ pressed }) => [styles.payBtn, (paying || pressed) && styles.payBtnPressed]}
            onPress={() =>
              void payUpgrade(
                singleUpgradeAmount ?? 0,
                'Single order upgrade',
                plan.id,
              )
            }
            disabled={paying}
          >
            <Ionicons name="card-outline" size={18} color={colors.onPrimary} />
            <Text style={styles.payBtnText}>
              {paying ? 'Processing…' : `Pay & Continue • ${formatPlanPrice(singleUpgradeAmount ?? 0)}`}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (needsMoreSeats && isMonthlySubscriptionPlan(plan)) {
      return (
        <View style={styles.wrap}>
          <ActivePlanBanner plan={plan} subscription={record} />
          <Text style={styles.sectionSub}>
            Add extra people using the counters below, then pay to continue.
          </Text>
          <PickupPlanPicker peopleCount={peopleCount} onPlanReady={onPlanReady} addonsOnly />
        </View>
      );
    }

    return (
      <View style={styles.wrap}>
        <ActivePlanBanner plan={plan} subscription={record} />
        <Pressable style={styles.continueBtn} onPress={() => onPlanReady?.()}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
        </Pressable>
      </View>
    );
  }

  return <PickupPlanPicker peopleCount={peopleCount} onPlanReady={onPlanReady} />;
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
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
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
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    padding: 14,
  },
  radioCardSelected: {
    borderColor: colors.orange,
    backgroundColor: '#FFF8FB',
  },
  radioCardPressed: { opacity: 0.94 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: colors.orange },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orange,
  },
  radioCopy: { flex: 1, minWidth: 0 },
  radioTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  radioSub: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  radioPrice: { fontSize: 14, fontWeight: '800', color: colors.orange },
  addonCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: 12,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addonCopy: { flex: 1, minWidth: 0 },
  addonTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  addonSub: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  addonRate: { fontSize: 11, fontWeight: '800', color: colors.green, marginTop: 4 },
  addonDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.45 },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.greenLight,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  summaryLine: { fontSize: 12, color: colors.text, fontWeight: '600' },
  summaryValue: { fontWeight: '800', color: colors.orange },
  summaryTotal: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  summaryTotalValue: { color: colors.orange, fontSize: 16 },
  message: { fontSize: 12, color: colors.orange, fontWeight: '700' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingVertical: 14,
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
