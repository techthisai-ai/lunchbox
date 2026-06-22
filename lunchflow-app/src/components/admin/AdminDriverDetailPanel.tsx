import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { approveDriver, rejectDriver } from '../../services/userRegistryService';
import { buildDriverProfileDetails, DriverRow } from '../../utils/adminDriverHelpers';

type DetailTab = 'details' | 'documents' | 'attendance';

type Props = {
  driver: DriverRow;
  onMarkLeave: () => void;
  onClose: () => void;
  onApprovalChanged: () => void;
};

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'attendance', label: 'Attendance' },
];

export function AdminDriverDetailPanel({ driver, onMarkLeave, onClose, onApprovalChanged }: Props) {
  const [tab, setTab] = useState<DetailTab | null>(null);
  const [saving, setSaving] = useState(false);
  const { isSidebarCollapsed } = useAdminLayout();
  const profile = buildDriverProfileDetails(driver);
  const isPending = driver.approvalStatus === 'pending';
  const isOnLeave = driver.uiStatus === 'On Leave';

  useEffect(() => {
    setTab(null);
  }, [driver.id]);

  const handleApprove = async () => {
    setSaving(true);
    try {
      await approveDriver(driver.id);
      onApprovalChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await rejectDriver(driver.id);
      onApprovalChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.panel, isSidebarCollapsed && styles.panelFull]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Driver Profile</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.contactList}>
        <View style={styles.profileSummary}>
          <Text style={styles.name}>{driver.name}</Text>
          <Text style={styles.driverId}>{driver.displayId}</Text>
        </View>

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
          { label: 'Earnings Today', value: `₹${driver.earningsToday.toLocaleString('en-IN')}` },
          { label: 'Total Orders', value: String(driver.totalOrders) },
          { label: 'Total Earnings', value: `₹${driver.totalEarnings.toLocaleString('en-IN')}` },
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
            <Pressable
              key={item.id}
              style={[styles.detailTab, active && styles.detailTabActive]}
              onPress={() => setTab(item.id)}
            >
              <Text style={[styles.detailTabText, active && styles.detailTabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
        {tab === null ? (
          <Text style={styles.placeholder}>Select Details, Documents, or Attendance to view.</Text>
        ) : tab === 'details' ? (
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
        ) : (
          <Text style={styles.placeholder}>
            {isOnLeave
              ? `${driver.name} is currently marked on leave.`
              : `${driver.uiStatus} — attendance synced from live status.`}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isPending ? (
          <>
            <Pressable style={styles.primaryBtn} onPress={handleApprove} disabled={saving}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
              <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Approve Driver'}</Text>
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={handleReject} disabled={saving}>
              <Ionicons name="close-circle-outline" size={16} color={colors.red} />
              <Text style={[styles.outlineBtnText, { color: colors.red }]}>Reject</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.outlineBtn} onPress={onMarkLeave}>
            <Ionicons
              name={isOnLeave ? 'checkmark-circle-outline' : 'calendar-clear-outline'}
              size={16}
              color={colors.text}
            />
            <Text style={styles.outlineBtnText}>{isOnLeave ? 'Mark Available' : 'Mark Leave'}</Text>
          </Pressable>
        )}
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
    maxHeight: '100%' as unknown as number,
  },
  panelFull: {
    width: '100%',
    alignSelf: 'stretch',
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  panelTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  contactList: { gap: 8, marginBottom: spacing.sm },
  profileSummary: { gap: 4, marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  driverId: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  contactText: { fontSize: 12, color: colors.text, fontWeight: '600', flex: 1, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  detailTabActive: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.border,
  },
  detailTabText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  detailTabTextActive: { color: colors.orange, fontWeight: '800' },
  detailBody: { maxHeight: 220, marginBottom: spacing.sm },
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
    paddingVertical: 11,
    backgroundColor: colors.white,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: radius.sm,
    paddingVertical: 11,
  },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: colors.onPrimary },
});
