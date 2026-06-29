import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { AdminSearchField } from '../../components/admin/AdminSearchField';
import { AdminCustomerDetailPanel } from '../../components/admin/AdminCustomerDetailPanel';
import { AdminMobileOverlay } from '../../components/admin/AdminMobileOverlay';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { useAdminTableColumn } from '../../hooks/useAdminTableColumn';
import { listAllOrdersToday } from '../../services/orderHubService';
import { loadSubscriptionAmountsByPhone, loadActiveSubscriptionRecord } from '../../services/subscriptionService';
import { loadRegisteredCustomers, RegisteredCustomer } from '../../services/userRegistryService';
import { getDeliveryTypeLabel } from '../../types/delivery';
import {
  buildCustomerDetailByPhone,
  CustomerDetail,
  formatCustomerDisplayId,
  formatCustomerName,
} from '../../utils/adminCustomerHelpers';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AdminCustomersScreen() {
  const [customers, setCustomers] = useState<RegisteredCustomer[]>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listAllOrdersToday>>>([]);
  const [amountsByPhone, setAmountsByPhone] = useState<Map<string, number>>(new Map());
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [activeSubscriptionCount, setActiveSubscriptionCount] = useState(0);
  const [query, setQuery] = useState('');
  const { showMobileHeader, pageTitleSize, isSidebarCollapsed } = useAdminLayout();
  const col = useAdminTableColumn();
  const c = {
    id: col(0.95, 100),
    name: col(1.25, 170),
    phone: col(1.05, 115),
    type: col(0.6, 88, { alignItems: 'flex-start' }),
    school: col(1.15, 150),
    sub: col(0.75, 95, { alignItems: 'flex-end' }),
    status: col(0.7, 88, { alignItems: 'flex-start' }),
  };
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [customerList, orderList] = await Promise.all([loadRegisteredCustomers(), listAllOrdersToday()]);
      setCustomers(customerList);
      setOrders(orderList);
      const phones = customerList.map((customer) => customer.phone);
      if (phones.length > 0) {
        setAmountsByPhone(await loadSubscriptionAmountsByPhone(phones));
        const records = await Promise.all(phones.map((phone) => loadActiveSubscriptionRecord(phone)));
        const today = new Date().toISOString().slice(0, 10);
        let totalSubs = 0;
        let activeSubs = 0;
        for (const record of records) {
          if (!record) continue;
          totalSubs += 1;
          if (record.status === 'active' && today <= record.endDate) {
            activeSubs += 1;
          }
        }
        setSubscriptionCount(totalSubs);
        setActiveSubscriptionCount(activeSubs);
      } else {
        setAmountsByPhone(new Map());
        setSubscriptionCount(0);
        setActiveSubscriptionCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!selectedPhone) {
      setCustomerDetail(null);
      return;
    }
    buildCustomerDetailByPhone(selectedPhone, orders).then(setCustomerDetail);
  }, [selectedPhone, orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.phone,
        formatCustomerDisplayId(customer.phone),
        customer.school,
        customer.studentName,
        getDeliveryTypeLabel(customer.registrationType),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, query]);

  return (
    <AdminPageLayout wide>
      <View style={styles.header}>
        {!showMobileHeader ? (
          <View>
            <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Customers</Text>
          </View>
        ) : (
          <View />
        )}
      </View>

      <AdminKpiRow dense>
        <AdminKpiCard compact label="Total Customers" value={String(customers.length)} icon="people" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard compact label="Total Subscription" value={String(subscriptionCount)} icon="layers" iconBg={colors.blueLight} iconColor={colors.blue} />
        <AdminKpiCard compact label="Active Subscription" value={String(activeSubscriptionCount)} icon="card" iconBg={colors.greenLight} iconColor={colors.greenDark} />
      </AdminKpiRow>

      <View style={[styles.toolbar, isSidebarCollapsed && styles.toolbarMobile]}>
        <AdminSearchField
          placeholder="Search customers by name, phone..."
          value={query}
          onChangeText={setQuery}
          fullWidth={isSidebarCollapsed}
        />
      </View>

      <View style={styles.contentRow}>
        <View style={styles.tableCard}>
          {loading ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Loading customers…</Text>
            </View>
          ) : (
            <View style={styles.tableWrap}>
              <AdminTableScroll minWidth={920}>
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <View style={c.id}>
                    <Text style={styles.th}>Customer ID</Text>
                  </View>
                  <View style={c.name}>
                    <Text style={styles.th}>Customer Name</Text>
                  </View>
                  <View style={c.phone}>
                    <Text style={styles.th}>Phone</Text>
                  </View>
                  <View style={c.type}>
                    <Text style={styles.th}>Type</Text>
                  </View>
                  <View style={c.school}>
                    <Text style={styles.th}>School / Office</Text>
                  </View>
                  <View style={c.sub}>
                    <Text style={styles.th}>Subscription</Text>
                  </View>
                  <View style={c.status}>
                    <Text style={styles.th}>Status</Text>
                  </View>
                </View>

                {filtered.length > 0 ? (
                  filtered.map((customer) => {
                    const displayName = formatCustomerName(customer.name);
                    const amount = amountsByPhone.get(customer.phone) ?? 0;
                    const isActive = amount > 0;
                    return (
                      <Pressable
                        key={customer.phone}
                        style={[styles.tableRow, selectedPhone === customer.phone && styles.tableRowActive]}
                        onPress={() => setSelectedPhone(customer.phone)}
                      >
                        <View style={c.id}>
                          <Text style={[styles.td, styles.idText]} numberOfLines={1}>
                            {formatCustomerDisplayId(customer.phone)}
                          </Text>
                        </View>
                        <View style={[c.name, styles.personCell]}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials(displayName)}</Text>
                          </View>
                          <Text style={[styles.td, styles.personText]} numberOfLines={1}>
                            {displayName}
                          </Text>
                        </View>
                        <View style={c.phone}>
                          <Text style={styles.td} numberOfLines={1}>
                            +91 {customer.phone}
                          </Text>
                        </View>
                        <View style={c.type}>
                          <Badge label={getDeliveryTypeLabel(customer.registrationType)} tone="blue" />
                        </View>
                        <View style={c.school}>
                          <Text style={styles.td} numberOfLines={1}>
                            {customer.school || '—'}
                          </Text>
                        </View>
                        <View style={c.sub}>
                          <Text style={[styles.td, styles.earningsText]} numberOfLines={1}>
                            {isActive ? `₹${amount.toLocaleString('en-IN')}` : '—'}
                          </Text>
                        </View>
                        <View style={c.status}>
                          <Badge label={isActive ? 'Active' : 'Inactive'} tone={isActive ? 'green' : 'gray'} />
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyTitle}>No customers yet</Text>
                    <Text style={styles.emptyText}>Customers appear here after they register in the app.</Text>
                  </View>
                )}
              </View>
              </AdminTableScroll>
            </View>
          )}
        </View>

        <AdminMobileOverlay visible={!!customerDetail} onClose={() => setSelectedPhone(null)}>
          {customerDetail ? (
            <AdminCustomerDetailPanel customer={customerDetail} onClose={() => setSelectedPhone(null)} />
          ) : null}
        </AdminMobileOverlay>
      </View>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: spacing.lg,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.lg },
  toolbar: { flexDirection: 'row', marginBottom: spacing.md },
  toolbarMobile: { flexDirection: 'column', alignItems: 'stretch' },
  contentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  tableCard: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableWrap: { width: '100%', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  table: { width: '100%' },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 8,
  },
  tableRowActive: { backgroundColor: colors.orangeLight },
  th: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  td: { fontSize: 12, color: colors.text, fontWeight: '600' },
  personText: { flex: 1, minWidth: 0 },
  idText: { fontWeight: '800' },
  earningsText: { fontWeight: '800' },
  personCell: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 10, fontWeight: '800', color: colors.orange },
  emptyRow: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
