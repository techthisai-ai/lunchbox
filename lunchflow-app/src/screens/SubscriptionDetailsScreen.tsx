import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckoutStatusBanner } from '../components/CheckoutStatusBanner';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { ScreenHeader } from '../components/ScreenHeader';
import { SubscriptionDetailPlanCard } from '../components/SubscriptionDetailPlanCard';
import { SubscriptionPlan, isAddonSubscriptionPlan } from '../constants/subscriptions';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useSubscriptionDetailPlans } from '../hooks/useSubscriptionDetailPlans';
import { useSubscriptionPayment } from '../hooks/useSubscriptionPayment';
import { ProfileStackParamList } from '../navigation/types';
import { hasActiveMonthlySubscription } from '../services/subscriptionService';
import { goBackInProfileStack } from '../navigation/customerRoutes';
import { formatPlanPrice } from '../utils/subscription';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SubscriptionDetails'>;

export function SubscriptionDetailsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { horizontalPadding } = useResponsive();
  const { plans } = useSubscriptionDetailPlans();
  const [monthlyActive, setMonthlyActive] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'addon-same-drop': 1,
    'addon-diff-drop': 1,
  });
  const {
    paymentMethodChoice,
    setPaymentMethodChoice,
    paying,
    message,
    messageTone,
    handleCheckout,
  } = useSubscriptionPayment({
    bookPickupAfterPurchase: true,
    onSuccess: () => {
      if (user?.phone) {
        void hasActiveMonthlySubscription(user.phone).then(setMonthlyActive);
      }
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) {
        setMonthlyActive(false);
        return;
      }
      void hasActiveMonthlySubscription(user.phone).then(setMonthlyActive);
    }, [user?.phone]),
  );

  const summaryTotal = useMemo(() => {
    let total = 0;
    for (const plan of plans) {
      if (!isAddonSubscriptionPlan(plan)) continue;
      const qty = quantities[plan.id] ?? 1;
      total += plan.baseAmount * qty;
    }
    return total;
  }, [plans, quantities]);

  const handlePlanPress = (plan: SubscriptionPlan) => {
    if (isAddonSubscriptionPlan(plan) && !monthlyActive) {
      Alert.alert('Monthly plan required', 'Add-on plans are available only when you have an active monthly subscription.');
      return;
    }
    const quantity = isAddonSubscriptionPlan(plan) ? quantities[plan.id] ?? 1 : 1;
    void handleCheckout(plan, quantity);
  };

  const setQuantity = (planId: string, next: number) => {
    setQuantities((current) => ({ ...current, [planId]: Math.max(1, next) }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Subscription Details" onBack={() => goBackInProfileStack(navigation)} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Choose the plan that fits you</Text>
          <Text style={styles.heroSub}>
            All prices are shown in Indian Rupees (₹). Select a plan to continue to payment.
          </Text>
        </View>

        <CheckoutStatusBanner paying={paying} message={message} tone={messageTone} />

        <PaymentMethodSelector
          value={paymentMethodChoice}
          onChange={setPaymentMethodChoice}
          disabled={paying}
        />

        {plans.map((plan) => (
          <SubscriptionDetailPlanCard
            key={plan.id}
            plan={plan}
            disabled={isAddonSubscriptionPlan(plan) && !monthlyActive}
            quantity={isAddonSubscriptionPlan(plan) ? quantities[plan.id] ?? 1 : 1}
            onQuantityChange={
              isAddonSubscriptionPlan(plan) ? (next) => setQuantity(plan.id, next) : undefined
            }
            paymentChoice={paymentMethodChoice}
            checkoutDisabled={paying}
            onSelect={() => handlePlanPress(plan)}
          />
        ))}

        {summaryTotal > 0 && monthlyActive ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Add-on summary</Text>
            <Text style={styles.summaryText}>
              Selected add-ons total: <Text style={styles.summaryAmount}>{formatPlanPrice(summaryTotal)}</Text>
            </Text>
            <Text style={styles.summaryHint}>Totals update when you change the quantity on each add-on card.</Text>
          </View>
        ) : null}

        <View style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Ionicons name="alert-circle-outline" size={18} color="#B7791F" />
            <Text style={styles.noteTitle}>Please Note</Text>
          </View>
          <Text style={styles.noteItem}>• All prices are inclusive of taxes.</Text>
          <Text style={styles.noteItem}>• Monthly plan will be auto-renewed until cancelled.</Text>
          <Text style={styles.noteItem}>• Single-order plans expire after delivery is completed.</Text>
          <Text style={styles.noteItem}>
            • Add-on plans (₹149 or ₹249 per month, was ₹499) require an active monthly subscription.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.manageBtn, pressed && styles.manageBtnPressed]}
          onPress={() => navigation.getParent()?.navigate('Subscription')}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.onPrimary} />
          <Text style={styles.manageBtnText}>Manage My Subscription</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: spacing.sm, paddingBottom: 32, gap: 14 },
  hero: {
    gap: 6,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: 6,
    ...shadow.subtle,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  summaryAmount: {
    color: colors.green,
    fontWeight: '800',
  },
  summaryHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 16,
  },
  successMessage: {
    fontSize: 13,
    color: colors.green,
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F6E05E',
    padding: spacing.md,
    gap: 6,
    marginTop: 4,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#975A16',
  },
  noteItem: {
    fontSize: 12,
    color: '#744210',
    lineHeight: 18,
    fontWeight: '600',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingVertical: 14,
    marginTop: 8,
    ...shadow.card,
  },
  manageBtnPressed: { opacity: 0.94 },
  manageBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.onPrimary,
  },
});
