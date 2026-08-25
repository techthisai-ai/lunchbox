import type { TextStyle } from 'react-native';

/**
 * Chef Queen brand type — load faces from assets/fonts (Android + iOS + web).
 * Poppins is the UI font. Playfair Display and Tahu are accents only.
 */
export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  /** No ExtraBold file shipped — use Bold. */
  extrabold: 'Poppins_700Bold',
  brand: 'PlayfairDisplay_700Bold',
  brandRegular: 'PlayfairDisplay_400Regular',
  decorative: 'Tahu',
} as const;

export type AppFontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const POPPINS_PREFIX = 'Poppins_';
const ACCENT_FAMILIES = new Set<string>([fonts.brand, fonts.brandRegular, fonts.decorative]);

export function isAccentFontFamily(family: string | undefined): boolean {
  if (!family) return false;
  return ACCENT_FAMILIES.has(family) || family.startsWith('PlayfairDisplay_') || family === 'Tahu';
}

export function isAppFontFamily(family: string | undefined): boolean {
  if (!family) return false;
  if (family.startsWith(POPPINS_PREFIX)) return true;
  if (isAccentFontFamily(family)) return true;
  return Object.values(fonts).includes(family as (typeof fonts)[keyof typeof fonts]);
}

function poppinsFaceForWeight(fontWeight?: TextStyle['fontWeight']): string {
  const w = String(fontWeight ?? '400');
  if (w === '500') return fonts.medium;
  if (w === '600') return fonts.semibold;
  if (w === 'bold' || w === '700' || w === '800' || w === '900') return fonts.bold;
  return fonts.regular;
}

/**
 * Map numeric/named fontWeight to a real Poppins file.
 * Playfair Display and Tahu are never remapped to Poppins.
 */
export function resolveAppFontFamily(
  fontWeight?: TextStyle['fontWeight'],
  existingFamily?: string,
): string {
  if (isAccentFontFamily(existingFamily)) {
    return existingFamily as string;
  }
  if (existingFamily?.startsWith(POPPINS_PREFIX)) {
    const w = String(fontWeight ?? 'normal');
    if (fontWeight == null || w === 'normal' || w === '400') {
      return existingFamily;
    }
    return poppinsFaceForWeight(fontWeight);
  }
  if (existingFamily && !isAppFontFamily(existingFamily) && !existingFamily.startsWith('Roboto_') && !existingFamily.startsWith('Inter_')) {
    return existingFamily;
  }
  return poppinsFaceForWeight(fontWeight);
}

/**
 * Use the weight-specific Poppins file and keep fontWeight normal so platforms
 * do not fake-bold a Regular face.
 */
export function fontStyle(weight: AppFontWeight = 'regular'): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return {
    fontFamily: fonts[weight],
    fontWeight: 'normal',
  };
}

export function brandHeadingStyle(): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return { fontFamily: fonts.brand, fontWeight: 'normal' };
}

export function taglineStyle(): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return { fontFamily: fonts.decorative, fontWeight: 'normal' };
}
