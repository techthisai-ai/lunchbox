import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { buildDriverProfileDetails, DriverRow, getStatusTone } from '../../utils/adminDriverHelpers';

type DetailTab = 'details' | 'documents' | 'performance' | 'attendance';

type Props = {
  driver: DriverRow;
  onMarkLeave: () => void;
  onClose: () => void;
};

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'performance', label: 'Performance' },
  { id: 'attendance', label: 'Attendance' },
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AdminDriverDetailPanel({ driver, onMarkLeave, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>('details');
  const { isSidebarCollapsed } = useAdminLayout();
  const profile = buildDriverProfileDetails(driver);

  return (
    <View style={[styles.panel, isSidebarCollapsed && styles.panelFull]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Driver Profile</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.profileBlock}>
        <View style={styles.largeAvatar}>
          <Text style={styles.largeAvatarText}>{initials(driver.name)}</Text>
        </View>
        <Text style={styles.name}>{driver.name}</Text>
        <Text style={styles.driverId}>{driver.displayId}</Text>
        <Badge label={driver.uiStatus} tone={getStatusTone(driver.uiStatus)} />
      </View>

      <View style={styles.contactList}>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>+91 {driver.phone}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="bicycle-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>{driver.vehicleLabel}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>Joined {driver.joinedDate}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="location-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>{driver.location}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Orders Today', value: String(driver.ordersToday) },
          { label: 'Earnings Today', value: `₹${driver.earningsToday}` },
          { label: 'Total Orders', value: String(driver.totalOrders) },
          { label: 'Total Earnings', value: `₹${driver.totalEarnings.toLocaleString('en-IN')}` },
        ].map((item) => (
          <View key={item.label} style={styles.statBox}>
            <Text style={styles.statValue}>{item.value}</Text>
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

      <View style={styles.detailBody}>
        {tab === 'details' ? (
          <>
            {[
              ['Date of Birth', profile.dateOfBirth],
              ['Address', profile.address],
              ['Aadhaar Number', profile.aadhaar],
              ['License Number', profile.licenseNumber],
              ['License Expiry', profile.licenseExpiry],
              ['Emergency Contact', profile.emergencyContact],
            ].map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}
          </>
        ) : tab === 'documents' ? (
          <Text style={styles.placeholder}>License and ID documents are on file for this driver.</Text>
        ) : tab === 'performance' ? (
          <Text style={styles.placeholder}>
            {driver.name} completed {driver.totalOrders} deliveries with ₹{driver.totalEarnings} total earnings.
          </Text>
        ) : (
          <Text style={styles.placeholder}>
            {driver.uiStatus === 'On Leave' ? 'Currently marked on leave.' : `${driver.uiStatus} — attendance synced from live status.`}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.outlineBtn} onPress={onMarkLeave}>
          <Ionicons name="calendar-clear-outline" size={16} color={colors.text} />
          <Text style={styles.outlineBtnText}>Mark Leave</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn}>
          <Ionicons name="stats-chart-outline" size={16} color={colors.white} />
          <Text style={styles.primaryBtnText}>View Performance</Text>
        </Pressable>
      </View>
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
  driverId: { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 8, fontWeight: '600' },
  contactList: { gap: 10, marginBottom: spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactText: { fontSize: 12, color: colors.text, fontWeight: '600', flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  statBox: {
    width: '48%',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.text },
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
  detailBody: { minHeight: 160, marginBottom: spacing.md },
  detailRow: { marginBottom: 12 },
  detailLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 12, color: colors.text, fontWeight: '600', lineHeight: 18 },
  placeholder: { fontSize: 12, color: colors.muted, lineHeight: 18, fontWeight: '600' },
  footer: { gap: 10 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: radius.sm,
    paddingVertical: 12,
  },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: colors.white },
});
