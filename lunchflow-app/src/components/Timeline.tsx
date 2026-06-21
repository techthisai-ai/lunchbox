import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export type TimelineStep = {
  title: string;
  time: string;
  status: 'done' | 'active' | 'pending';
};

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View style={styles.wrap}>
      {steps.map((step, i) => (
        <View key={step.title} style={[styles.item, i === steps.length - 1 && styles.last]}>
          <View
            style={[
              styles.dot,
              step.status === 'done' && styles.done,
              step.status === 'active' && styles.active,
              step.status === 'pending' && styles.pending,
            ]}
          />
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.time}>{step.time}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingLeft: 28, borderLeftWidth: 2, borderLeftColor: colors.border, marginLeft: 9 },
  item: { paddingBottom: 20, position: 'relative' },
  last: { paddingBottom: 0 },
  dot: {
    position: 'absolute',
    left: -38,
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  done: { backgroundColor: colors.green, borderColor: colors.green },
  active: { backgroundColor: colors.orange, borderColor: colors.orange },
  pending: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  time: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
