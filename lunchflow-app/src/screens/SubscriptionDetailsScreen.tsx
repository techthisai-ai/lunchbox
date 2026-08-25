import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnlinePaymentDialog } from '../components/OnlinePaymentDialog';
import { ScreenHeader } from '../components/ScreenHeader';
import { SubscriptionPlanPriceText } from '../components/SubscriptionPlanPriceText';
import { SubscriptionPlan, getSubscriptionDetailLineLabel, isAddonSubscriptionPlan } from '../constants/subscriptions';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useSubscriptionDetailPlans } from '../hooks/useSubscriptionDetailPlans';
import { useSubscriptionPayment } from '../hooks/useSubscriptionPayment';
import { ProfileStackParamList } from '../navigation/types';
import { hasActiveMonthlySubscription } from '../services/subscriptionService';
import { goBackInProfileStack } from '../navigation/customerRoutes';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SubscriptionDetails'>;

function DetailPlanCard({
  plan,
  disabled,
  onPress,
}: {
  plan: SubscriptionPlan;
  disabled?: boolean;
  onPress: () => void;
}) {
  const iconName = (plan.detailIcon ?? 'document-text-outline') as keyof typeof Ionicons.glyphMap;
  const lineLabel = getSubscriptionDetailLineLabel(plan);
  const dashIndex = lineLabel.lastIndexOf(' - ');
  const titlePart = dashIndex >= 0 ? lineLabel.slice(0, dashIndex) : lineLabel;
  const pricePart = dashIndex >= 0 ? lineLabel.slice(dashIndex + 3) : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.planCard, disabled && styles.planCardDisabled, pressed && !disabled && styles.planCardPressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.planRow}>
        <View style={styles.planIcon}>
          <Ionicons name={iconName} size={18} color={colors.orange} />
        </View>
        <Text style={styles.planLine} numberOfLines={2}>
          <Text style={styles.planLabel}>{titlePart}</Text>
          {pricePart ? <SubscriptionPlanPriceText plan={plan} amountText={pricePart} /> : null}
        </Text>
      </View>
    </Pressable>
  );
}

export function SubscriptionDetailsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { horizontalPadding } = useResponsive();
  const { plans } = useSubscriptionDetailPlans();
  const [monthlyActive, setMonthlyActive] = useState(false);
  const {
    paymentVisible,
    paymentDraft,
    paying,
    message,
    startPaymentForPlan,
    handlePaymentSelect,
    closePayment,
  } = useSubscriptionPayment({ bookPickupAfterPurchase: true });

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) {
        setMonthlyActive(false);
        return;
      }
      void hasActiveMonthlySubscription(user.phone).then(setMonthlyActive);
    }, [user?.phone]),
  );

  const handlePlanPress = (plan: SubscriptionPlan) => {
    if (isAddonSubscriptionPlan(plan) && !monthlyActive) {
      Alert.alert('Monthly plan required', 'Add-on plans are available only when you have an active monthly subscription.');
      return;
    }
    void startPaymentForPlan(plan);
  };

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
      <ScreenHeader title="Subscription Details" onBack={() => goBackInProfileStack(navigation)} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
      >
        {plans.map((plan) => (
          <DetailPlanCard
            key={plan.id}
            plan={plan}
            disabled={isAddonSubscriptionPlan(plan) && !monthlyActive}
            onPress={() => handlePlanPress(plan)}
          />
        ))}

        {message ? <Text style={styles.successMessage}>{message}</Text> : null}

        <View style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Ionicons name="alert-circle-outline" size={18} color="#B7791F" />
            <Text style={styles.noteTitle}>Please Note</Text>
          </View>
          <Text style={styles.noteItem}>• All prices are inclusive of taxes.</Text>
          <Text style={styles.noteItem}>• Monthly plan will be auto-renewed until cancelled.</Text>
          <Text style={styles.noteItem}>• Single-order plans expire after delivery is completed.</Text>
          <Text style={styles.noteItem}>• You can manage your plan from the Plan section.</Text>
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
  scroll: { paddingTop: spacing.sm, paddingBottom: 32, gap: 12 },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
    ...shadow.subtle,
  },
  planCardPressed: { opacity: 0.95 },
  planCardDisabled: { opacity: 0.72 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planLine: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
  },
  planLabel: {
    fontWeight: '700',
    color: colors.text,
  },
  successMessage: {
    fontSize: 13,
    color: colors.green,
    fontWeight: '600',
    marginTop: 4,
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
