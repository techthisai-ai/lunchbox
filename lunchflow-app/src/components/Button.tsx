import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../constants/theme';

type Variant = 'primary' | 'green' | 'outline' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  small?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', small, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        styles[variant],
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'outline' && styles.outlineText, variant === 'danger' && styles.dangerText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
  },
  small: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  primary: { backgroundColor: colors.orange },
  green: { backgroundColor: colors.green },
  outline: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.orange },
  danger: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.red },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  text: { color: colors.white, fontSize: 16, fontWeight: '700' },
  outlineText: { color: colors.orange },
  dangerText: { color: colors.red },
});
