import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import {
  approveDriver,
  loadPendingDrivers,
  rejectDriver,
  RegisteredDriver,
} from '../../services/userRegistryService';

type Props = {
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function AdminDriverApprovalModal({ visible, onClose, onChanged }: Props) {
  const [pending, setPending] = useState<RegisteredDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPending(await loadPendingDrivers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      refresh();
    } else {
      setBusyId(null);
    }
  }, [visible, refresh]);

  const handleClose = () => {
    if (busyId) return;
    onClose();
  };

  const handleApprove = async (driverId: string) => {
    setBusyId(driverId);
    try {
      await approveDriver(driverId);
      await refresh();
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (driverId: string) => {
    setBusyId(driverId);
    try {
      await rejectDriver(driverId);
      await refresh();
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Driver Approvals</Text>
              <Text style={styles.subtitle}>Review and approve new employee registrations.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
            {loading ? (
              <Text style={styles.emptyText}>Loading pending approvals…</Text>
            ) : pending.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="checkmark-circle-outline" size={36} color={colors.muted} />
                <Text style={styles.emptyTitle}>No pending approvals</Text>
                <Text style={styles.emptyText}>New driver registrations will appear here for review.</Text>
              </View>
            ) : (
              pending.map((driver) => {
                const busy = busyId === driver.id;
                return (
                  <View key={driver.id} style={styles.card}>
                    <View style={styles.cardBody}>
                      <Text style={styles.driverName}>{driver.name}</Text>
                      <Text style={styles.driverMeta}>+91 {driver.phone}</Text>
                      <Text style={styles.driverMeta}>{driver.vehicle}</Text>
                      <Text style={styles.driverMeta}>License: {driver.licenseNumber}</Text>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable
                        style={[styles.approveBtn, busy && styles.btnDisabled]}
                        onPress={() => handleApprove(driver.id)}
                        disabled={!!busyId}
                      >
                        <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                        <Text style={styles.approveBtnText}>{busy ? 'Saving…' : 'Approve'}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.rejectBtn, busy && styles.btnDisabled]}
                        onPress={() => handleReject(driver.id)}
                        disabled={!!busyId}
                      >
                        <Ionicons name="close" size={14} color={colors.red} />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(58, 41, 66, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, fontWeight: '600', lineHeight: 18 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  listScroll: { flexGrow: 0 },
  listContent: { padding: spacing.lg, gap: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.bg,
    gap: 12,
  },
  cardBody: { gap: 4 },
  driverName: { fontSize: 15, fontWeight: '800', color: colors.text },
  driverMeta: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 10 },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.orange,
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  approveBtnText: { fontSize: 13, fontWeight: '800', color: colors.onPrimary },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: colors.red },
  btnDisabled: { opacity: 0.6 },
});
