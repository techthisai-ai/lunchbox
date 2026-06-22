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
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
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

const scrollableStatusFilters = ['All', 'Delivered', 'In Transit'] as const;
const cancelledFilter = 'Cancelled';
const periodFilters = ['Today', 'This Week', 'This Month'] as const;

type PeriodFilter = (typeof periodFilters)[number];

function matchesPeriod(entry: DeliveryHistoryEntry, period: PeriodFilter): boolean {
  const dateKey = resolveHistoryDateKey(entry);
  if (period === 'Today') return isHistoryToday(dateKey);
  if (period === 'This Week') return isHistoryThisWeek(dateKey);
  return isHistoryThisMonth(dateKey);
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

  const toggleMenu = () => {
    if (open) {
      closeMenu();
      return;
    }
    openMenu();
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false} style={styles.dropdownWrap}>
        <Pressable style={styles.dropdown} onPress={toggleMenu}>
          <Text style={styles.dropdownText}>{value}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.onPrimary} />
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
            underlineColorAndroid="transparent"
          />
        </View>
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statusScroll}
            contentContainerStyle={styles.statusFilters}
          >
            {scrollableStatusFilters.map((f) => (
              <Pressable
                key={f}
                style={[styles.chip, activeFilter === f && styles.chipActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={[styles.chip, styles.cancelledChip, activeFilter === cancelledFilter && styles.chipActive]}
            onPress={() => setActiveFilter(cancelledFilter)}
          >
            <Text style={[styles.chipText, activeFilter === cancelledFilter && styles.chipTextActive]}>
              {cancelledFilter}
            </Text>
          </Pressable>
          <PeriodDropdown value={activePeriod} onChange={setActivePeriod} />
        </View>
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  } as const,
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  statusScroll: {
    flexShrink: 1,
    minWidth: 0,
  },
  statusFilters: { alignItems: 'center', paddingRight: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: 8,
  },
  cancelledChip: {
    marginRight: 0,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  dropdownWrap: { flexShrink: 0, zIndex: 2 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.orange,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  dropdownText: { fontSize: 12, fontWeight: '700', color: colors.onPrimary },
  dropdownOverlay: {
    flex: 1,
  },
  dropdownDismissArea: {
    ...StyleSheet.absoluteFill,
  },
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
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionActive: { backgroundColor: colors.orange },
  dropdownOptionText: { fontSize: 13, fontWeight: '600', color: colors.text },
  dropdownOptionTextActive: { color: colors.onPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowMeta: { alignItems: 'flex-end' },
  date: { fontWeight: '700', fontSize: 14 },
  route: { fontSize: 12, color: colors.muted, marginTop: 2 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
  empty: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
