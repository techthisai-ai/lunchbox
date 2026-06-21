import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { DeliveryHistoryEntry, syncDeliveryHistory } from '../services/deliveryHistoryService';
import { listCustomerOrders } from '../services/orderHubService';
import {
  isHistoryThisMonth,
  isHistoryThisWeek,
  isHistoryToday,
  resolveHistoryDateKey,
} from '../utils/date';

const statusFilters = ['All', 'Delivered', 'In Transit', 'Cancelled'];
const periodFilters = ['Today', 'This Week', 'This Month'] as const;

type PeriodFilter = (typeof periodFilters)[number];

function matchesPeriod(entry: DeliveryHistoryEntry, period: PeriodFilter): boolean {
  const dateKey = resolveHistoryDateKey(entry);
  if (period === 'Today') return isHistoryToday(dateKey);
  if (period === 'This Week') return isHistoryThisWeek(dateKey);
  return isHistoryThisMonth(dateKey);
}

export function HistoryScreen() {
  const { user } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [history, setHistory] = useState<DeliveryHistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('This Week');

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

  const filtered = history.filter((item) => {
    const matchesStatus =
      activeFilter === 'All' ||
      item.status.toLowerCase() === activeFilter.toLowerCase() ||
      (activeFilter === 'In Transit' && item.status === 'In Transit');
    const matchesQuery =
      !query.trim() ||
      item.route.toLowerCase().includes(query.toLowerCase()) ||
      item.date.toLowerCase().includes(query.toLowerCase());
    return matchesPeriod(item, activePeriod) && matchesStatus && matchesQuery;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Delivery History" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search deliveries..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {periodFilters.map((f) => (
            <Pressable
              key={f}
              style={[styles.chip, activePeriod === f && styles.periodChipActive]}
              onPress={() => setActivePeriod(f)}
            >
              <Text style={[styles.chipText, activePeriod === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {statusFilters.map((f) => (
            <Pressable
              key={f}
              style={[styles.chip, activeFilter === f && styles.chipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {filtered.length > 0 ? (
          filtered.map((d) => (
            <Card key={d.id}>
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.date}>{d.date}</Text>
                  <Text style={styles.route} numberOfLines={2}>
                    {d.route}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  <Badge label={d.status} tone={d.status === 'Delivered' ? 'green' : 'orange'} />
                  <Text style={styles.time}>{d.time}</Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card flat>
            <Text style={styles.empty}>No deliveries for {activePeriod.toLowerCase()}.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: spacing.md, paddingBottom: 32, flexGrow: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filters: { marginBottom: 14, flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: 8,
  },
  periodChipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.white },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowMeta: { alignItems: 'flex-end' },
  date: { fontWeight: '700', fontSize: 14 },
  route: { fontSize: 12, color: colors.muted, marginTop: 2 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
  empty: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
