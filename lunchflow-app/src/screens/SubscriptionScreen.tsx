import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnlinePaymentDialog } from '../components/OnlinePaymentDialog';
import { ScreenHeader } from '../components/ScreenHeader';
import { SubscriptionPlanPriceText } from '../components/SubscriptionPlanPriceText';
import { SubscriptionPlan, getSubscriptionDetailLineLabel, isAddonSubscriptionPlan } from '../constants/subscriptions';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useSubscriptionDetailPlans } from '../hooks/useSubscriptionDetailPlans';
import { useSubscriptionPayment } from '../hooks/useSubscriptionPayment';
import { RootStackParamList } from '../navigation/types';
import { goToCustomerHome } from '../navigation/customerRoutes';
import { hasActiveMonthlySubscription, hasActiveSubscription } from '../services/subscriptionService';

type SubscriptionNavigation = NativeStackNavigationProp<RootStackParamList>;

export function SubscriptionScreen() {
  const navigation = useNavigation<SubscriptionNavigation>();
  const route = useRoute();
  const isOnboarding = route.name === 'SubscriptionOnboarding';
  const { user } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(isOnboarding);
  const [monthlyActive, setMonthlyActive] = useState(false);
  const { plans } = useSubscriptionDetailPlans();

  const {
    paymentVisible,
    paymentDraft,
    paying,
    message,
    startPaymentForPlan,
    handlePaymentSelect,
    closePayment,
  } = useSubscriptionPayment({
    bookPickupAfterPurchase: true,
    onSuccess: () => {
      if (isOnboarding) {
        goToCustomerHome(navigation);
      }
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) return;

      if (isOnboarding) {
        setCheckingAccess(true);
        hasActiveSubscription(user.phone).then((active) => {
          if (active) {
            goToCustomerHome(navigation);
            return;
          }
          setCheckingAccess(false);
        });
        return;
      }

      setCheckingAccess(false);
      void hasActiveMonthlySubscription(user.phone).then(setMonthlyActive);
    }, [user?.phone, isOnboarding, navigation]),
  );

  const handlePlanPress = async (plan: SubscriptionPlan) => {
    if (isAddonSubscriptionPlan(plan) && !monthlyActive) {
      Alert.alert(
        'Monthly plan required',
        'Add-on plans are available only when you have an active monthly subscription.',
      );
      return;
    }
    await startPaymentForPlan(plan);
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
        onCancel={closePayment}
      />
      <ScreenHeader
        title="Choose Plan"
        subtitle="Tap a plan to pay with GPay, UPI, or PhonePe"
        onBack={isOnboarding ? undefined : () => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            disabled={isAddonSubscriptionPlan(plan) && !monthlyActive}
            onPress={() => void handlePlanPress(plan)}
          />
        ))}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  plan,
  disabled,
  onPress,
}: {
  plan: SubscriptionPlan;
  disabled?: boolean;
  onPress: () => void;
}) {
  const label = getSubscriptionDetailLineLabel(plan);
  const dashIndex = label.lastIndexOf(' - ');
  const titlePart = dashIndex >= 0 ? label.slice(0, dashIndex) : label;
  const pricePart = dashIndex >= 0 ? label.slice(dashIndex + 3) : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.plan, disabled && styles.planDisabled, pressed && !disabled && styles.pressed]}
      accessibilityRole="button"
    >
      <Text style={styles.planLine} numberOfLines={2}>
        <Text style={styles.planLabel}>{titlePart}</Text>
        {pricePart ? <SubscriptionPlanPriceText plan={plan} amountText={pricePart} /> : null}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32, gap: 8 },
  plan: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    minHeight: 48,
    justifyContent: 'center',
  },
  planDisabled: { opacity: 0.65 },
  pressed: { opacity: 0.92 },
  planLine: {
    fontSize: 14,
    lineHeight: 20,
  },
  planLabel: {
    fontWeight: '700',
    color: colors.text,
  },
  message: { fontSize: 13, color: colors.green, marginTop: 8, fontWeight: '600' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loadingText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
});
