import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { approveDriver, rejectDriver } from '../../services/userRegistryService';
import { DriverRow } from '../../utils/adminDriverHelpers';

type Props = {
  driver: DriverRow;
  onMarkLeave: () => void;
  onClose: () => void;
  onApprovalChanged: () => void;
};

export function AdminDriverDetailPanel({ driver, onMarkLeave, onClose, onApprovalChanged }: Props) {
  const [saving, setSaving] = useState(false);
  const { isSidebarCollapsed } = useAdminLayout();
  const isPending = driver.approvalStatus === 'pending';
  const isOnLeave = driver.uiStatus === 'On Leave';

  const handleApprove = async () => {
    setSaving(true);
    try {
      await approveDriver(driver.id);
      onApprovalChanged();
    } catch (error) {
      Alert.alert('Approval failed', error instanceof Error ? error.message : 'Could not approve driver');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await rejectDriver(driver.id);
      onApprovalChanged();
    } catch (error) {
      Alert.alert('Reject failed', error instanceof Error ? error.message : 'Could not reject driver');
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

      <View style={styles.profileSummary}>
        <Text style={styles.name}>{driver.name}</Text>
        <Text style={styles.driverId}>{driver.displayId}</Text>
      </View>

      <View style={styles.contactList}>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={16} color={colors.orange} />
          <Text style={styles.contactText}>+91 {driver.phone}</Text>
        </View>
      </View>

      <View style={styles.detailBlock}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle Number</Text>
          <Text style={styles.detailValue}>{driver.vehicle || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>License Number</Text>
          <Text style={styles.detailValue}>{driver.licenseNumber || '—'}</Text>
        </View>
      </View>

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
  profileSummary: { gap: 4, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  driverId: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  contactList: { gap: 8, marginBottom: spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  contactText: { fontSize: 12, color: colors.text, fontWeight: '600', flex: 1, lineHeight: 18 },
  detailBlock: { gap: 12, marginBottom: spacing.md },
  detailRow: { gap: 4 },
  detailLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: '700', lineHeight: 18 },
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
