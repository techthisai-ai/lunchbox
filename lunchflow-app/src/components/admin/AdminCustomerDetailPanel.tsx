import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { CustomerDetail, getOrderStatusLabel } from '../../utils/adminCustomerHelpers';
import { formatOrderDateTime, formatOrderDisplayId } from '../../utils/adminOrderHelpers';

type DetailTab = 'details' | 'subscription' | 'orders';

type Props = {
  customer: CustomerDetail;
  onClose: () => void;
};

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'orders', label: 'Orders' },
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AdminCustomerDetailPanel({ customer, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>('details');
  const { isSidebarCollapsed } = useAdminLayout();

  return (
    <View style={[styles.panel, isSidebarCollapsed && styles.panelFull]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Customer Profile</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.profileBlock}>
        <View style={styles.largeAvatar}>
          <Text style={styles.largeAvatarText}>{initials(customer.name)}</Text>
        </View>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.customerId}>{customer.displayId}</Text>
        <Badge label={customer.registrationType} tone="blue" />
      </View>

      <View style={styles.contactList}>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>+91 {customer.phone}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="home-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>{customer.address}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="school-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>{customer.school}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>Emergency: {customer.emergencyContact}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Orders Today', value: String(customer.ordersToday) },
          { label: 'Total Orders', value: String(customer.totalOrders) },
          { label: 'Subscription', value: `₹${customer.subscriptionAmount.toLocaleString('en-IN')}` },
          { label: 'Plan', value: customer.subscriptionPlan },
        ].map((item) => (
          <View key={item.label} style={styles.statBox}>
            <Text style={styles.statValue} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.detailTabs}>
        {DETAIL_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable key={item.id} style={[styles.detailTab, active && styles.detailTabActive]} onPress={() => setTab(item.id)}>
              <Text style={[styles.detailTabText, active && styles.detailTabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
        {tab === 'details' ? (
          <>
            {[
              [customer.personLabel, customer.studentName],
              [customer.institutionLabel, customer.school],
              ['Class / Section', customer.classSection],
              ['Pickup Address', customer.order.pickupAddress],
              ['Delivery Address', customer.order.school || customer.order.dropAddress],
              ['Current Order', formatOrderDisplayId(customer.order.id)],
            ].map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}
          </>
        ) : tab === 'subscription' ? (
          <>
            {[
              ['Plan', customer.subscriptionPlan],
              ['Amount Paid', `₹${customer.subscriptionAmount.toLocaleString('en-IN')}`],
              ['Status', customer.subscriptionStatus],
              ['Valid Until', customer.subscriptionEndDate],
            ].map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}
          </>
        ) : customer.recentOrders.length > 0 ? (
          customer.recentOrders.map((order) => {
            const { date, time } = formatOrderDateTime(order);
            return (
              <View key={order.id} style={styles.orderRow}>
                <Text style={styles.orderId}>{formatOrderDisplayId(order.id)}</Text>
                <Text style={styles.orderMeta}>
                  {date} · {time}
                </Text>
                <Badge label={getOrderStatusLabel(order.status)} tone={order.status === 'delivered' ? 'green' : 'orange'} />
              </View>
            );
          })
        ) : (
          <Text style={styles.placeholder}>No orders found for this customer.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 320,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignSelf: 'flex-start',
    maxHeight: '100%' as unknown as number,
  },
  panelFull: {
    width: '100%',
    alignSelf: 'stretch',
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  panelTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  profileBlock: { alignItems: 'center', marginBottom: spacing.md },
  largeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  largeAvatarText: { fontSize: 24, fontWeight: '800', color: colors.orange },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  customerId: { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 8, fontWeight: '600' },
  contactList: { gap: 10, marginBottom: spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  contactText: { fontSize: 12, color: colors.text, fontWeight: '600', flex: 1, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  statBox: {
    width: '48%',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statValue: { fontSize: 14, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 4, fontWeight: '600' },
  detailTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  detailTab: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  detailTabActive: { backgroundColor: colors.orangeLight },
  detailTabText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  detailTabTextActive: { color: colors.orange },
  detailBody: { maxHeight: 220, marginBottom: spacing.sm },
  detailRow: { marginBottom: 12 },
  detailLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 12, color: colors.text, fontWeight: '600', lineHeight: 18 },
  orderRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 4,
  },
  orderId: { fontSize: 13, fontWeight: '800', color: colors.text },
  orderMeta: { fontSize: 11, color: colors.muted, marginBottom: 6 },
  placeholder: { fontSize: 12, color: colors.muted, lineHeight: 18, fontWeight: '600' },
});
