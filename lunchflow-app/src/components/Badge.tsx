import { StyleSheet, View } from 'react-native';
import { fontStyle } from '../constants/fonts';
import { colors, radius } from '../constants/theme';
import { AppText } from './AppText';

type Tone = 'orange' | 'green' | 'blue' | 'gray' | 'yellow' | 'red';

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  orange: { bg: colors.yellowLight, fg: colors.dark },
  green: { bg: colors.greenLight, fg: colors.greenDark },
  blue: { bg: colors.blueLight, fg: colors.blue },
  gray: { bg: colors.surfaceMuted, fg: colors.muted },
  yellow: { bg: colors.yellow, fg: colors.dark },
  red: { bg: colors.redLight, fg: colors.red },
};

export function Badge({ label, tone = 'orange' }: { label: string; tone?: Tone }) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <AppText style={[styles.text, { color: t.fg }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  text: { fontSize: 11, letterSpacing: 0.2, ...fontStyle('bold') },
});
