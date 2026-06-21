import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../constants/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BASE = [8, 12, 10, 15, 14, 18, 16];

type Props = {
  totalRevenue: number;
};

export function AdminRevenueChart({ totalRevenue }: Props) {
  const max = Math.max(...BASE, 1);
  const scale = totalRevenue > 0 ? totalRevenue / (max * 1000) : 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.chart}>
        {DAYS.map((day, index) => {
          const heightPct = (BASE[index] / max) * 100 * Math.max(scale, 0.35);
          return (
            <View key={day} style={styles.column}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${heightPct}%` }]} />
              </View>
              <Text style={styles.day}>{day}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.dot} />
        <Text style={styles.legendText}>Revenue trend this week</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 220 },
  chart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 8,
    minHeight: 180,
  },
  column: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: '100%',
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '72%',
    maxWidth: 36,
    backgroundColor: colors.orange,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    minHeight: 8,
    opacity: 0.85,
  },
  day: { fontSize: 11, color: colors.muted, marginTop: 8, fontWeight: '600' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.orange },
  legendText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
});
