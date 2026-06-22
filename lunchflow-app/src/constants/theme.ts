/**
 * LunchFlow Design System — 60-30-10 rule
 *
 * 60%  Pink — dominant backgrounds & page surfaces
 * 30%  Light Yellow — cards, inputs, tab bars, content sections
 * 10%  Dark Purple — buttons, icons, highlights, CTAs
 */

export const palette = {
  // 60% — pink backgrounds & dominant surfaces
  pink60: '#FF5BAE',
  pink60Soft: '#FFD6E8',
  pink60Muted: '#FFB8D4',
  pink60Border: '#FF9EC8',

  // 30% — light yellow content sections
  yellow30: '#FFF0A8',
  yellow30Soft: '#FFFBE6',
  yellow30Muted: '#F5E48A',
  yellow30Border: '#E8D978',

  // 10% — dark purple accents, CTAs, highlights
  purple10: '#2A1645',
  purple10Soft: '#3D2463',
  purple10Muted: '#5C4878',

  // text & semantic
  onPrimary: '#FFFFFF',
  text: '#2A1645',
  textSecondary: '#5C4878',
  ink: '#2A1645',
  error: '#B91C4A',
  errorLight: '#FCE8EE',
};

/**
 * Backward-compatible tokens — existing screens use `colors.orange`, `colors.white`, etc.
 */
export const colors = {
  // 10% — primary accent / CTA (legacy: orange)
  orange: palette.purple10,
  orangeDark: palette.purple10,
  orangeLight: palette.yellow30Soft,

  // 30% — secondary surfaces (legacy: green)
  green: palette.yellow30Border,
  greenDark: palette.purple10,
  greenLight: palette.yellow30Soft,

  // admin / info (legacy: blue)
  blue: palette.purple10Soft,
  blueDark: palette.purple10,
  blueLight: palette.yellow30Soft,

  // 60% — page backgrounds
  bg: palette.pink60Soft,
  surfaceMuted: palette.pink60Muted,

  // 30% — cards, panels, inputs, tab bars
  surface: palette.yellow30Soft,
  card: palette.yellow30Soft,
  white: palette.yellow30Soft,

  // text
  text: palette.text,
  muted: palette.textSecondary,
  border: palette.pink60Border,
  borderSubtle: palette.pink60Muted,
  onPrimary: palette.onPrimary,

  // legacy accent aliases
  purple: palette.purple10,
  purpleDark: palette.purple10,
  purpleLight: palette.yellow30Soft,
  yellow: palette.yellow30,
  yellowLight: palette.yellow30Soft,
  yellowDark: palette.purple10,
  dark: palette.purple10,

  // semantic
  red: palette.error,
  redLight: palette.errorLight,
};

export const gradients = {
  brand: [palette.purple10, palette.purple10Soft] as const,
  primary: [palette.purple10, '#1E0F33'] as const,
  secondary: [palette.yellow30, palette.yellow30Muted] as const,
  premium: [palette.purple10, palette.purple10Soft] as const,
  surface: [palette.pink60Soft, palette.pink60Muted] as const,
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
