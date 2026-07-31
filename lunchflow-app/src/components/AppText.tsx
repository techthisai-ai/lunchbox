import { Platform, StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { fonts } from '../constants/fonts';

function familyForWeight(fontWeight: TextStyle['fontWeight'] | undefined, existingFamily?: string): string {
  if (existingFamily && !String(existingFamily).startsWith('Inter_')) {
    return existingFamily;
  }
  if (existingFamily && String(existingFamily).startsWith('Inter_')) {
    return existingFamily;
  }
  const w = String(fontWeight ?? '400');
  if (w === '800' || w === '900') return fonts.extrabold;
  if (w === '700' || w === 'bold') return fonts.bold;
  if (w === '600') return fonts.semibold;
  if (w === '500') return fonts.medium;
  return fonts.regular;
}

/**
 * Drop-in Text that maps fontWeight to bundled Inter faces (Android-safe).
 * Prefer this for new UI; default Text still gets Inter Regular via defaultProps.
 */
export function AppText({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontFamily = familyForWeight(flat.fontWeight, flat.fontFamily);
  return (
    <RNText
      {...props}
      style={[
        style,
        {
          fontFamily,
          ...(Platform.OS === 'android' ? { fontWeight: 'normal' as const } : null),
        },
      ]}
    />
  );
}
