import { Platform, TextStyle } from 'react-native';

/** Bundled Inter faces — same look on every Android OEM / iOS device. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export type AppFontWeight = keyof typeof fonts;

/**
 * Android applies fontWeight on top of fontFamily and often picks a wrong face.
 * Use the weight-specific Inter file and keep fontWeight normal on Android.
 */
export function fontStyle(weight: AppFontWeight = 'regular'): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  const fontFamily = fonts[weight];
  if (Platform.OS === 'android') {
    return { fontFamily, fontWeight: 'normal' };
  }
  const iosWeight =
    weight === 'regular'
      ? ('400' as const)
      : weight === 'medium'
        ? ('500' as const)
        : weight === 'semibold'
          ? ('600' as const)
          : weight === 'bold'
            ? ('700' as const)
            : ('800' as const);
  return { fontFamily, fontWeight: iosWeight };
}
