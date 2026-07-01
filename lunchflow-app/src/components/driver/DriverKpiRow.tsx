import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

export type DriverKpiItem = {
  label: string;
  value: string;
  tone: 'purple' | 'green' | 'pink' | 'orange' | 'blue' | 'red';
  icon?: keyof typeof Ionicons.glyphMap;
};

const toneStyles: Record<DriverKpiItem['tone'], { bg: string; border: string; icon: string }> = {
  purple: { bg: colors.purpleLight, border: 'rgba(124, 58, 237, 0.12)', icon: colors.purple },
  green: { bg: colors.greenLight, border: 'rgba(34, 197, 94, 0.15)', icon: colors.green },
  pink: { bg: colors.orangeLight, border: 'rgba(236, 72, 153, 0.15)', icon: colors.orange },
  orange: { bg: colors.orangeLight, border: 'rgba(255, 107, 53, 0.2)', icon: colors.orange },
  blue: { bg: colors.blueLight, border: 'rgba(59, 130, 246, 0.15)', icon: colors.blue },
  red: { bg: colors.redLight, border: 'rgba(239, 68, 68, 0.15)', icon: colors.red },
};

type Props = {
  items: DriverKpiItem[];
  compact?: boolean;
};

export function DriverKpiRow({ items, compact }: Props) {
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const tone = toneStyles[item.tone];
        return (
          <View key={item.label} style={[styles.box, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            {item.icon ? (
              <Ionicons name={item.icon} size={compact ? 14 : 16} color={tone.icon} style={styles.icon} />
            ) : null}
            <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={2}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  icon: { marginBottom: 4 },
  value: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  valueCompact: { fontSize: 15 },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  labelCompact: { fontSize: 8 },
});
