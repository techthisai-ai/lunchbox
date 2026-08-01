import type { TextStyle } from 'react-native';

/** Bundled Roboto faces — same look on every Android OEM / iOS / web device. */
export const fonts = {
  regular: 'Roboto_400Regular',
  /** Content / UI weight — alias of regular (only 400 + 700 shipped). */
  medium: 'Roboto_400Regular',
  /** Emphasis — maps to bold (only 400 + 700 shipped). */
  semibold: 'Roboto_700Bold',
  bold: 'Roboto_700Bold',
  /** Headings — maps to bold (only 400 + 700 shipped). */
  extrabold: 'Roboto_700Bold',
} as const;

export type AppFontWeight = keyof typeof fonts;

const APP_FONT_PREFIXES = ['Roboto_', 'Inter_'] as const;

export function isAppFontFamily(family: string | undefined): boolean {
  if (!family) return false;
  return APP_FONT_PREFIXES.some((prefix) => family.startsWith(prefix)) || Object.values(fonts).includes(family as (typeof fonts)[AppFontWeight]);
}

/**
 * Map numeric/named fontWeight to the bundled Roboto face.
 * Content → 400 Regular; headings / bold UI → 700 Bold.
 */
export function resolveAppFontFamily(
  fontWeight?: TextStyle['fontWeight'],
  existingFamily?: string,
): string {
  if (existingFamily && !isAppFontFamily(existingFamily)) {
    return existingFamily;
  }
  if (existingFamily === fonts.bold || existingFamily === 'Roboto_700Bold') {
    return fonts.bold;
  }
  if (existingFamily === fonts.regular || existingFamily === 'Roboto_400Regular') {
    // Still honor an explicit bold weight on top of regular family.
    const w = String(fontWeight ?? '400');
    if (w === 'bold' || w === '600' || w === '700' || w === '800' || w === '900') {
      return fonts.bold;
    }
    return fonts.regular;
  }

  const w = String(fontWeight ?? '400');
  if (w === 'bold' || w === '600' || w === '700' || w === '800' || w === '900') {
    return fonts.bold;
  }
  return fonts.regular;
}

/**
 * Use the weight-specific Roboto file and keep fontWeight normal so platforms
 * do not fall back to the system font.
 */
export function fontStyle(weight: AppFontWeight = 'regular'): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return {
    fontFamily: fonts[weight],
    fontWeight: 'normal',
  };
}
