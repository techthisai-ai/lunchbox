import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { DeliveryHistoryEntry, syncDeliveryHistory } from '../services/deliveryHistoryService';
import { buildMonthlyInvoiceText, downloadMonthlyInvoice } from '../services/invoiceService';
import { listCustomerOrders } from '../services/orderHubService';
import { DeliveryType } from '../types/delivery';
import {
  HistoryPeriodFilter,
  historyPeriodLabel,
  isHistoryInPeriod,
  resolveHistoryDateKey,
} from '../utils/date';

const PERIOD_FILTERS: { id: HistoryPeriodFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

function deliveryTitle(type: DeliveryType): string {
  if (type === 'office') return 'Home to Office Delivery';
  if (type === 'college') return 'Home to Workplace Delivery';
  return 'Home to School Delivery';
}

function statusBadgeStyle(status: string) {
  if (status === 'Delivered') {
    return { bg: colors.greenLight, text: colors.green, iconBg: colors.greenLight, iconColor: colors.green, icon: 'checkmark-circle-outline' as const };
  }
  if (status === 'In Transit') {
    return { bg: colors.orangeLight, text: colors.orange, iconBg: colors.orangeLight, iconColor: colors.orange, icon: 'time-outline' as const };
  }
  return { bg: colors.redLight, text: colors.red, iconBg: colors.redLight, iconColor: colors.red, icon: 'close-circle-outline' as const };
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoBoxLabel}>{label}</Text>
      <Text style={styles.infoBoxValue}>{value}</Text>
    </View>
  );
}

function HistoryOrderCard({ entry }: { entry: DeliveryHistoryEntry }) {
  const tone = statusBadgeStyle(entry.status);
  const subtitle = entry.destinationAddress
    ? `${entry.destinationName}, ${entry.destinationAddress}`
    : entry.destinationName;

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <View style={[styles.orderIcon, { backgroundColor: tone.iconBg }]}>
          <Ionicons name={tone.icon} size={18} color={tone.iconColor} />
        </View>
        <View style={styles.orderCopy}>
          <Text style={styles.orderTitle}>{deliveryTitle(entry.deliveryType)}</Text>
          <Text style={styles.orderSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusPillText, { color: tone.text }]}>{entry.status}</Text>
        </View>
      </View>

      {entry.status === 'Delivered' ? (
        <>
          <View style={styles.infoRow}>
            <InfoBox label="Date" value={entry.date} />
            <InfoBox label="Time" value={entry.time} />
          </View>
          <View style={styles.orderFooter}>
            <Text style={styles.footerMuted}>Amount paid</Text>
            <Text style={styles.footerPrice}>{entry.price}</Text>
          </View>
        </>
      ) : entry.status === 'In Transit' ? (
        <>
          <View style={styles.infoRow}>
            <InfoBox label="Pickup Slot" value={entry.time} />
            <InfoBox label="ETA" value="Soon" />
          </View>
          <View style={styles.orderFooter}>
            <Text style={styles.footerMuted}>Live updates sent by SMS & WhatsApp</Text>
            <Text style={styles.footerOrderId}>#{entry.id.slice(-6).toUpperCase()}</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.infoRow}>
            <InfoBox label="Date" value={entry.date} />
            <InfoBox label="Time" value={entry.time} />
          </View>
          <View style={styles.orderFooter}>
            <Text style={styles.footerMuted}>Trip cancelled</Text>
            <Text style={styles.footerOrderId}>#{entry.id.slice(-6).toUpperCase()}</Text>
          </View>
        </>
      )}
    </View>
  );
}

export function HistoryScreen() {
  const { user } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [history, setHistory] = useState<DeliveryHistoryEntry[]>([]);
  const [period, setPeriod] = useState<HistoryPeriodFilter>('today');
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.phone) {
      setHistory([]);
      return;
    }
    const orders = await listCustomerOrders(user.phone);
    setHistory(await syncDeliveryHistory(user.phone, orders));
  }, [user?.phone]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filteredHistory = useMemo(
    () =>
      history.filter((entry) => isHistoryInPeriod(resolveHistoryDateKey(entry), period)),
    [history, period],
  );

  const totalDeliveries = filteredHistory.length;
  const cancelledCount = useMemo(
    () => filteredHistory.filter((entry) => entry.status === 'Cancelled').length,
    [filteredHistory],
  );

  const periodEyebrow = historyPeriodLabel(period).toUpperCase();

  const handleDownloadInvoice = async () => {
    if (!user?.phone) return;

    const deliveredInPeriod = filteredHistory.filter((entry) => entry.status === 'Delivered');
    if (deliveredInPeriod.length === 0) {
      Alert.alert('No invoice', `No delivered orders for ${historyPeriodLabel(period).toLowerCase()} to download yet.`);
      return;
    }

    setDownloadingInvoice(true);
    try {
      const result = await downloadMonthlyInvoice(filteredHistory, user.name || 'Customer', user.phone);
      if (result === 'downloaded') {
        Alert.alert('Invoice downloaded', 'Your monthly invoice file has been saved.');
        return;
      }
      if (result === 'shared') return;
      if (result === 'failed') {
        Alert.alert('Invoice', buildMonthlyInvoiceText(filteredHistory, user.name || 'Customer', user.phone));
      }
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
      >
        <LinearGradient colors={['#E91E63', '#C2185B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>{periodEyebrow}</Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{totalDeliveries}</Text>
                <Text style={styles.heroStatLabel}>Total Deliveries</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{cancelledCount}</Text>
                <Text style={styles.heroStatLabel}>Cancelled Orders</Text>
              </View>
            </View>
          </View>
          <Ionicons name="clipboard-outline" size={54} color="rgba(255,255,255,0.22)" style={styles.heroArt} />
        </LinearGradient>

        <View style={styles.filterRow}>
          {PERIOD_FILTERS.map((item) => {
            const active = period === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setPeriod(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Pressable onPress={() => void handleDownloadInvoice()} disabled={downloadingInvoice}>
            <Text style={[styles.downloadLink, downloadingInvoice && styles.downloadLinkDisabled]}>
              {downloadingInvoice ? 'Preparing…' : 'Download Invoice'}
            </Text>
          </Pressable>
        </View>

        {filteredHistory.length > 0 ? (
          filteredHistory.map((entry) => <HistoryOrderCard key={entry.id} entry={entry} />)
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>No orders for {historyPeriodLabel(period).toLowerCase()}.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32, paddingTop: spacing.sm },
  heroBanner: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    minHeight: 112,
    justifyContent: 'center',
  },
  heroCopy: { maxWidth: '82%', zIndex: 1 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
    marginBottom: 10,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroStat: {
    flex: 1,
    minWidth: 0,
  },
  heroStatValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.onPrimary,
    lineHeight: 30,
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 14,
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  heroArt: {
    position: 'absolute',
    right: 16,
    top: 24,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  downloadLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.orange,
  },
  downloadLinkDisabled: {
    opacity: 0.55,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    ...shadow.subtle,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  orderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orderCopy: { flex: 1, minWidth: 0 },
  orderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  orderSubtitle: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 14,
  },
  statusPill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  infoBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoBoxLabel: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
    fontWeight: '600',
  },
  infoBoxValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerMuted: {
    flex: 1,
    fontSize: 10,
    color: colors.muted,
    lineHeight: 14,
  },
  footerPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.orange,
  },
  footerOrderId: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
  },
  empty: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
