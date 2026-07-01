import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { colors, radius, shadow, spacing } from '../constants/theme';
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

const statusFilters = ['All', 'Delivered', 'Cancelled'] as const;
const periodFilters = ['Today', 'This Week', 'This Month'] as const;

type StatusFilter = (typeof statusFilters)[number];
type PeriodFilter = (typeof periodFilters)[number];

function matchesPeriod(entry: DeliveryHistoryEntry, period: PeriodFilter): boolean {
  const dateKey = resolveHistoryDateKey(entry);
  if (period === 'Today') return isHistoryToday(dateKey);
  if (period === 'This Week') return isHistoryThisWeek(dateKey);
  return isHistoryThisMonth(dateKey);
}

function statusTone(status: string): 'green' | 'red' | 'orange' {
  if (status === 'Delivered') return 'green';
  if (status === 'Cancelled') return 'red';
  return 'orange';
}

function PeriodDropdown({
  value,
  onChange,
}: {
  value: PeriodFilter;
  onChange: (period: PeriodFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const [menuLeft, setMenuLeft] = useState(0);
  const [menuWidth, setMenuWidth] = useState(148);
  const triggerRef = useRef<View>(null);
  const { width: windowWidth } = useWindowDimensions();

  const closeMenu = () => setOpen(false);

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const dropdownWidth = Math.max(width, 148);
      const left = Math.max(8, Math.min(x + width - dropdownWidth, windowWidth - dropdownWidth - 8));
      setMenuTop(y + height + 6);
      setMenuLeft(left);
      setMenuWidth(dropdownWidth);
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false} style={styles.periodWrap}>
        <Pressable style={styles.periodChip} onPress={() => (open ? closeMenu() : openMenu())}>
          <Text style={styles.periodChipText}>{value}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.orange} />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.dropdownOverlay}>
          <Pressable style={styles.dropdownDismissArea} onPress={closeMenu} />
          <View style={[styles.dropdownMenu, { top: menuTop, left: menuLeft, width: menuWidth }]}>
            {periodFilters.map((option, index) => {
              const active = value === option;
              const isLast = index === periodFilters.length - 1;
              return (
                <Pressable
                  key={option}
                  style={[styles.dropdownOption, active && styles.dropdownOptionActive, isLast && styles.dropdownOptionLast]}
                  onPress={() => {
                    onChange(option);
                    closeMenu();
                  }}
                >
                  <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>
                    {option}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={14} color={colors.onPrimary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

function RouteTimeline({
  pickupLabel,
  destinationName,
  destinationAddress,
}: {
  pickupLabel: string;
  destinationName: string;
  destinationAddress: string;
}) {
  const showAddress = Boolean(destinationAddress && destinationAddress !== destinationName);

  return (
    <View style={styles.routeTimeline}>
      <View style={styles.routeStopRow}>
        <View style={styles.routePinCol}>
          <View style={[styles.routePin, styles.pickupPin]}>
            <Ionicons name="location" size={12} color={colors.onPrimary} />
          </View>
        </View>
        <Text style={styles.routeStopLabel} numberOfLines={1}>
          {pickupLabel}
        </Text>
      </View>

      <View style={styles.routeConnectorRow}>
        <View style={styles.routePinCol}>
          <View style={styles.routeLine} />
        </View>
      </View>

      <View style={[styles.routeStopRow, styles.routeStopRowDrop]}>
        <View style={styles.routePinCol}>
          <View style={[styles.routePin, styles.dropPin]}>
            <Ionicons name="location" size={12} color={colors.onPrimary} />
          </View>
        </View>
        <View style={styles.routeStopText}>
          <Text style={styles.routeDestination} numberOfLines={3}>
            {destinationName}
          </Text>
          {showAddress ? (
            <Text style={styles.routeAddress} numberOfLines={2}>
              {destinationAddress}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function HistoryCard({ entry }: { entry: DeliveryHistoryEntry }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{entry.date}</Text>
        <Badge label={entry.status} tone={statusTone(entry.status)} />
      </View>

      <RouteTimeline
        pickupLabel={entry.pickupLabel}
        destinationName={entry.destinationName}
        destinationAddress={entry.destinationAddress}
      />

      <View style={styles.cardFooter}>
        <Text style={styles.cardTime}>{entry.time}</Text>
        <Text style={styles.cardPrice}>{entry.price}</Text>
      </View>
    </View>
  );
}

export function HistoryScreen() {
  const { user } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [history, setHistory] = useState<DeliveryHistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('All');
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
      item.status.toLowerCase() === activeFilter.toLowerCase();
    const haystack = [
      item.route,
      item.date,
      item.destinationName,
      item.destinationAddress,
      item.pickupLabel,
    ]
      .join(' ')
      .toLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase());
    return matchesPeriod(item, activePeriod) && matchesStatus && matchesQuery;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <Pressable
          style={styles.searchBtn}
          onPress={() => setSearchOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel="Search deliveries"
        >
          <Ionicons name="search" size={20} color={colors.text} />
        </Pressable>
      </View>

      {searchOpen ? (
        <View style={[styles.search, { marginHorizontal: horizontalPadding }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search deliveries..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            underlineColorAndroid="transparent"
            autoFocus
          />
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={[styles.filterRow, { paddingHorizontal: horizontalPadding }]}
      >
        {statusFilters.map((filter) => (
          <Pressable
            key={filter}
            style={[styles.chip, activeFilter === filter && styles.chipActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.chipText, activeFilter === filter && styles.chipTextActive]}>{filter}</Text>
          </Pressable>
        ))}
        <PeriodDropdown value={activePeriod} onChange={setActivePeriod} />
      </ScrollView>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length > 0 ? (
          filtered.map((entry) => <HistoryCard key={entry.id} entry={entry} />)
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>No deliveries for {activePeriod.toLowerCase()}.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  } as const,
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: spacing.sm,
  },
  listScroll: { flex: 1 },
  listContent: { paddingBottom: 32 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  periodWrap: { flexShrink: 0 },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  periodChipText: { fontSize: 12, fontWeight: '700', color: colors.orange },
  dropdownOverlay: { flex: 1 },
  dropdownDismissArea: { ...StyleSheet.absoluteFillObject },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionLast: { borderBottomWidth: 0 },
  dropdownOptionActive: { backgroundColor: colors.orange },
  dropdownOptionText: { fontSize: 13, fontWeight: '600', color: colors.text },
  dropdownOptionTextActive: { color: colors.onPrimary },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardDate: { fontSize: 13, fontWeight: '700', color: colors.text },
  routeTimeline: { marginBottom: spacing.md },
  routeStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeStopRowDrop: {
    alignItems: 'flex-start',
  },
  routePinCol: {
    width: 20,
    alignItems: 'center',
  },
  routePin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupPin: { backgroundColor: colors.orange },
  dropPin: { backgroundColor: colors.blue },
  routeConnectorRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.orangeLight,
    borderRadius: 1,
  },
  routeStopText: { flex: 1, minWidth: 0 },
  routeStopLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text },
  routeDestination: { fontSize: 12, fontWeight: '600', color: colors.text, lineHeight: 17 },
  routeAddress: { fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 16 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  cardTime: { fontSize: 11, color: colors.muted, fontWeight: '500' },
  cardPrice: { fontSize: 13, fontWeight: '700', color: colors.text },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
  },
  empty: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
