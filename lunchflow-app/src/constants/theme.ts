/**
 * LunchFlow Design System — 60-30-10 rule
 *
 * 60%  Off-white backgrounds (#F4F2ED)
 * 30%  Hot pink + light pink brand (#F23898, #EA6BB8)
 * 10%  Soft yellow highlights + dark purple-black (#E8D978, #3A2942)
 */

export const palette = {
  // 60% — backgrounds & neutrals
  offWhite: '#F4F2ED',
  offWhiteSoft: '#FAF8F4',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEBE4',
  border: '#E5E0D8',
  borderSubtle: '#EDE9E2',

  // 30% — brand pinks
  hotPink: '#F23898',
  hotPinkDark: '#D42E85',
  hotPinkLight: '#FDE8F3',
  lightPink: '#EA6BB8',
  lightPinkDark: '#D456A0',
  lightPinkLight: '#FBEAF5',

  // 10% — accents
  softYellow: '#E8D978',
  softYellowLight: '#F5F0C8',
  softYellowDark: '#3A2942',
  dark: '#3A2942',
  darkMuted: '#5C4D66',

  // semantic
  text: '#3A2942',
  textSecondary: '#6B5D75',
  ink: '#3A2942',
  error: '#D42E55',
  errorLight: '#FCE8EE',
};

/**
 * Backward-compatible tokens — existing screens use `colors.orange`, etc.
 */
export const colors = {
  // primary brand (legacy: orange → hot pink)
  orange: palette.hotPink,
  orangeDark: palette.hotPinkDark,
  orangeLight: palette.hotPinkLight,

  // secondary brand (legacy: green → light pink)
  green: palette.lightPink,
  greenDark: palette.lightPinkDark,
  greenLight: palette.lightPinkLight,

  // admin / premium dark (legacy: blue → dark purple-black)
  blue: palette.dark,
  blueDark: palette.dark,
  blueLight: '#EDE8F0',

  // surfaces & text
  white: palette.surface,
  bg: palette.offWhite,
  surfaceMuted: palette.surfaceMuted,
  text: palette.text,
  muted: palette.textSecondary,
  border: palette.border,
  borderSubtle: palette.borderSubtle,

  // accent tokens
  purple: palette.dark,
  purpleDark: palette.dark,
  purpleLight: '#EDE8F0',
  yellow: palette.softYellow,
  yellowLight: palette.softYellowLight,
  yellowDark: palette.softYellowDark,
  dark: palette.dark,

  // semantic
  red: palette.error,
  redLight: palette.errorLight,
};

export const gradients = {
  brand: [palette.hotPink, palette.lightPink] as const,
  primary: [palette.hotPink, palette.hotPinkDark] as const,
  secondary: [palette.lightPink, palette.lightPinkDark] as const,
  premium: [palette.dark, '#2A1D32'] as const,
};

export const typography = {
  display: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34, letterSpacing: -0.5 },
  h1: { fontSize: 22, fontWeight: '800' as const, lineHeight: 28, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '800' as const, lineHeight: 24 },
  h3: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyStrong: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
};

export const radius = {
  sm: 14,
  md: 18,
  lg: 22,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  elevated: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  subtle: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
};
