import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { fontStyle } from '../constants/fonts';
import { colors, radius } from '../constants/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'green' | 'outline' | 'danger' | 'premium' | 'highlight';

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
      style={({ pressed, hovered }) => [
        styles.base,
        small && styles.small,
        styles[variant],
        hovered && styles.hovered,
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppText
        style={[
          styles.text,
          small && styles.smallText,
          variant === 'outline' && styles.outlineText,
          variant === 'danger' && styles.dangerText,
          variant === 'highlight' && styles.highlightText,
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius.full,
  },
  small: {
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  primary: { backgroundColor: colors.orange },
  green: { backgroundColor: colors.green },
  premium: { backgroundColor: colors.green },
  highlight: { backgroundColor: colors.yellow },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.orange },
  danger: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.red },
  hovered: { opacity: 0.94 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  text: { color: colors.onPrimary, fontSize: 15, letterSpacing: 0.2, ...fontStyle('semibold') },
  smallText: { fontSize: 13 },
  outlineText: { color: colors.orange },
  highlightText: { color: colors.dark },
  dangerText: { color: colors.red },
});
