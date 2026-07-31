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
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        styles[variant],
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppText
        style={[
          styles.text,
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
  premium: { backgroundColor: colors.dark },
  highlight: { backgroundColor: colors.yellow },
  outline: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.orange },
  danger: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.red },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  text: { color: colors.onPrimary, fontSize: 16, ...fontStyle('bold') },
  outlineText: { color: colors.orange },
  highlightText: { color: colors.dark },
  dangerText: { color: colors.red },
});
