import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export function Avatar({
  initials,
  large,
  onDark,
  size,
}: {
  initials: string;
  large?: boolean;
  onDark?: boolean;
  size?: number;
}) {
  const dim = large ? 56 : size ?? 48;
  const fontSize = large ? 18 : size && size <= 42 ? 12 : 14;
  return (
    <View
      style={[
        styles.avatar,
        large && styles.large,
        onDark && styles.onDark,
        size && !large ? { width: dim, height: dim, borderRadius: dim / 2 } : null,
      ]}
    >
      <Text style={[styles.text, large && styles.largeText, size && !large ? { fontSize } : null]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { width: 56, height: 56, borderRadius: 28 },
  onDark: { backgroundColor: 'rgba(255,255,255,0.2)' },
  text: { fontWeight: '700', color: colors.onPrimary, fontSize: 14 },
  largeText: { fontSize: 18 },
});
