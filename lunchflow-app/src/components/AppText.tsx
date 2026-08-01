import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { resolveAppFontFamily } from '../constants/fonts';

/**
 * Drop-in Text that maps fontWeight to bundled Roboto faces (device-safe).
 * Content (≤500) → Roboto Regular 400; headings / bold (≥600) → Roboto Bold 700.
 *
 * Note: Metro already patches RN Text globally; AppText remains for explicit use.
 */
export function AppText({ style, ...props }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fontFamily = resolveAppFontFamily(flat.fontWeight, flat.fontFamily);
  return (
    <RNText
      {...props}
      style={[
        style,
        {
          fontFamily,
          fontWeight: 'normal',
        },
      ]}
    />
  );
}
