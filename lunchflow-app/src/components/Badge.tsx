import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';

type Tone = 'orange' | 'green' | 'blue' | 'gray' | 'yellow' | 'red';

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  orange: { bg: colors.orangeLight, fg: colors.orangeDark },
  green: { bg: colors.greenLight, fg: colors.greenDark },
  blue: { bg: colors.blueLight, fg: colors.blue },
  gray: { bg: colors.surfaceMuted, fg: colors.muted },
  yellow: { bg: colors.yellowLight, fg: colors.dark },
  red: { bg: colors.redLight, fg: colors.red },
};

export function Badge({ label, tone = 'orange' }: { label: string; tone?: Tone }) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  text: { fontSize: 11, fontWeight: '700' },
});
