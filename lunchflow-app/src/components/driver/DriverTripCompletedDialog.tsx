import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '../Button';
import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  visible: boolean;
  ordersDelivered: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalEarnings: number;
  completedAt: string | null;
  onClose: () => void;
};

export function DriverTripCompletedDialog({
  visible,
  ordersDelivered,
  totalDistanceKm,
  totalDurationMinutes,
  totalEarnings,
  completedAt,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Trip Completed Successfully</Text>
          <View style={styles.stats}>
            <StatRow label="Total Orders Delivered" value={String(ordersDelivered)} />
            <StatRow label="Total Distance" value={`${totalDistanceKm.toFixed(1)} km`} />
            <StatRow label="Total Travel Time" value={`${totalDurationMinutes} min`} />
            <StatRow label="Total Earnings" value={`₹${totalEarnings.toLocaleString('en-IN')}`} />
            <StatRow label="Completed Time" value={completedAt ?? '—'} />
          </View>
          <Button title="Done" onPress={onClose} style={{ marginTop: 14 }} />
        </View>
      </View>
    </Modal>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.green, textAlign: 'center' },
  stats: { marginTop: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1, fontSize: 13, color: colors.muted, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '800', color: colors.text },
});
