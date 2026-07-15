import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SubscriptionPlan, getSubscriptionPlan, isSingleOrderPlan } from '../constants/subscriptions';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { MainTabParamList, ProfileStackParamList, RootStackParamList } from '../navigation/types';
import { DeliveryHistoryEntry, syncDeliveryHistory } from '../services/deliveryHistoryService';
import { listCustomerOrders } from '../services/orderHubService';
import {
  checkSubscriptionRenewalReminders,
  getSubscriptionDurationLabel,
  getSubscriptionEndLabel,
  getSubscriptionRemainingDays,
  hasActiveSubscription,
  loadActiveSubscriptionRecord,
} from '../services/subscriptionService';
import { CustomerSubscription } from '../types/subscription';
import { DeliveryType, normalizeDeliveryType } from '../types/delivery';
import { isHistoryThisMonth, resolveHistoryDateKey } from '../utils/date';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Subscription'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: Nav;
};

function getPlanDisplayName(plan: SubscriptionPlan): string {
  if (plan.detailTitle) return plan.detailTitle;
  const category = plan.category === 'student' ? 'Student' : plan.category === 'college' ? 'College' : 'Office';
  const period = plan.billingMonths === 3 ? '3M' : plan.billingMonths === 1 ? '1M' : '';
  return period ? `${category} Meal Plan (${period})` : plan.name;
}

function getDeliveryTypeLabel(type?: DeliveryType): string {
  if (type === 'office') return 'Home to Office Delivery';
  if (type === 'college') return 'Home to Workplace Delivery';
  return 'Home to School Delivery';
}

function formatFullDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}


function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function MySubscriptionScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<CustomerSubscription | null>(null);
  const [history, setHistory] = useState<DeliveryHistoryEntry[]>([]);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('school');

  const refresh = useCallback(async () => {
    if (!user?.phone) {
      setPlan(null);
      setSubscription(null);
      setHistory([]);
      return;
    }

    const orders = await listCustomerOrders(user.phone);
    const syncedHistory = await syncDeliveryHistory(user.phone, orders);
    setHistory(syncedHistory);

    await checkSubscriptionRenewalReminders(user.phone);
    const active = await hasActiveSubscription(user.phone);
    const record = await loadActiveSubscriptionRecord(user.phone);

    if (active && record) {
      setSubscription(record);
      setPlan(getSubscriptionPlan(record.planId));
    } else {
      setSubscription(null);
      setPlan(null);
    }

    const latestDelivered = syncedHistory.find((entry) => entry.status === 'Delivered');
    const latestEntry = syncedHistory[0];
    const typeSource = latestDelivered ?? latestEntry;
    if (typeSource) {
      setDeliveryType(normalizeDeliveryType(typeSource.deliveryType));
    }
  }, [user?.phone]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const daysRemaining = useMemo(() => {
    if (!subscription || !plan) return 0;
    return getSubscriptionRemainingDays(subscription);
  }, [subscription, plan]);

  const remainingLabel = plan && isSingleOrderPlan(plan) ? 'Valid For' : 'Days Remaining';
  const remainingValue =
    plan && isSingleOrderPlan(plan) ? '1 delivery' : String(daysRemaining);

  const deliveredHistory = useMemo(
    () => history.filter((entry) => entry.status === 'Delivered'),
    [history],
  );

  const totalDeliveries = deliveredHistory.length;

  const monthDeliveries = useMemo(
    () =>
      deliveredHistory.filter((entry) => isHistoryThisMonth(resolveHistoryDateKey(entry))).length,
    [deliveredHistory],
  );

  const goToProfile = (screen: keyof ProfileStackParamList) => {
    navigation.navigate('Profile', { screen });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
      >
        {plan && subscription ? (
          <LinearGradient colors={['#FCE4EC', '#F8BBD0']} style={styles.activeCard}>
            <View style={styles.activeTop}>
              <View style={styles.activeTopCopy}>
                <Text style={styles.activePlanName} numberOfLines={1}>
                  {getPlanDisplayName(plan)}
                </Text>
                <Text style={styles.activeRoute} numberOfLines={1}>
                  {getDeliveryTypeLabel(deliveryType)}
                </Text>
              </View>
              <Text style={styles.activePrice}>{plan.price}</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>

            <View style={styles.activeMetaRow}>
              <View style={styles.activeMetaItem}>
                <Text style={styles.activeMetaLabel}>
                  {plan && isSingleOrderPlan(plan) ? 'Plan Validity' : 'Next Billing Date'}
                </Text>
                <Text style={styles.activeMetaValue}>
                  {plan && isSingleOrderPlan(plan)
                    ? 'Until delivery completes'
                    : formatFullDate(subscription.renewalDate)}
                </Text>
              </View>
              <View style={styles.activeMetaItem}>
                <Text style={styles.activeMetaLabel}>Auto-Renew</Text>
                <Text style={styles.autoRenewOn}>{plan && isSingleOrderPlan(plan) ? 'OFF' : 'ON'}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalDeliveries}</Text>
                <Text style={styles.statLabel}>Total Deliveries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthDeliveries}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{remainingValue}</Text>
                <Text style={styles.statLabel}>{remainingLabel}</Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active subscription</Text>
            <Text style={styles.emptySub}>Choose a plan to start your meal deliveries.</Text>
            <Pressable style={styles.exploreLinkBtn} onPress={() => goToProfile('SubscriptionDetails')}>
              <Text style={styles.exploreLinkText}>Explore Plans</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.orange} />
            </Pressable>
          </View>
        )}

        {plan && subscription ? (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Plan Details</Text>
            <DetailRow label="Plan Name" value={getPlanDisplayName(plan)} />
            <DetailRow label="Delivery Type" value={getDeliveryTypeLabel(deliveryType)} />
            <DetailRow label="Meal Type" value="Lunch" />
            <DetailRow label="Plan Duration" value={getSubscriptionDurationLabel(plan)} />
            <DetailRow label="Start Date" value={formatFullDate(subscription.startDate)} />
            <DetailRow label="End Date" value={getSubscriptionEndLabel(plan, subscription)} />
            <Pressable
              style={({ pressed }) => [styles.invoiceBtn, pressed && styles.invoiceBtnPressed]}
              onPress={() => navigation.navigate('History')}
            >
              <Text style={styles.invoiceBtnText}>View Invoice History</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.orange} />
            </Pressable>
          </View>
        ) : null}

        <LinearGradient colors={['#E91E63', '#C2185B']} style={styles.upgradeBanner}>
          <View style={styles.upgradeCopy}>
            <Text style={styles.upgradeTitle}>Upgrade your plan!</Text>
            <Pressable style={styles.upgradeLinkRow} onPress={() => goToProfile('SubscriptionDetails')}>
              <Text style={styles.upgradeLink}>Explore Plans</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.onPrimary} />
            </Pressable>
          </View>
          <View style={styles.upgradeArt}>
            <Ionicons name="bicycle" size={28} color={colors.onPrimary} />
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: spacing.sm, paddingBottom: 32, gap: 14 },
  activeCard: { borderRadius: 18, padding: spacing.md, ...shadow.subtle },
  activeTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeTopCopy: { flex: 1, minWidth: 0 },
  activePlanName: { fontSize: 15, fontWeight: '800', color: colors.text },
  activeRoute: { fontSize: 11, color: colors.muted, marginTop: 3, fontWeight: '600' },
  activeBadge: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '800', color: colors.green },
  activePrice: { fontSize: 16, fontWeight: '800', color: colors.orange, lineHeight: 18, flexShrink: 0 },
  activeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(233,30,99,0.12)',
  },
  activeMetaItem: { flex: 1, minWidth: 0 },
  activeMetaLabel: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  activeMetaValue: { fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 2 },
  autoRenewOn: { fontSize: 14, fontWeight: '800', color: colors.green, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 12,
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center', minWidth: 0, gap: 4 },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(233,30,99,0.15)',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 9, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadow.subtle,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptySub: { fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  exploreLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 },
  exploreLinkText: { fontSize: 14, fontWeight: '800', color: colors.orange },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    ...shadow.subtle,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  detailLabel: { fontSize: 12, color: colors.muted, fontWeight: '600', flex: 1 },
  detailValue: { fontSize: 12, fontWeight: '800', color: colors.text, flex: 1.2, textAlign: 'right' },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
  invoiceBtnPressed: { opacity: 0.92 },
  invoiceBtnText: { fontSize: 13, fontWeight: '800', color: colors.orange },
  upgradeBanner: {
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow.card,
  },
  upgradeCopy: { flex: 1, minWidth: 0 },
  upgradeTitle: { fontSize: 15, fontWeight: '800', color: colors.onPrimary },
  upgradeLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  upgradeLink: { fontSize: 12, fontWeight: '800', color: colors.onPrimary },
  upgradeArt: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
