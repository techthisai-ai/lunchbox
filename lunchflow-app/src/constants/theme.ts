/**
 * LunchFlow Design System — pink & white theme
 *
 * 60%  Soft cream / pink — page backgrounds
 * 30%  White — cards, inputs, content panels
 * 10%  Magenta pink — primary buttons & CTAs; dark navy — headings & sidebar
 */

export const palette = {
  // 60% — soft backgrounds
  pink60: '#E91E63',
  pink60Soft: '#F8F7F2',
  pink60Muted: '#FDF2F8',
  pink60Border: '#E8E4E0',

  // 30% — white content sections
  yellow30: '#FFFFFF',
  yellow30Soft: '#FFFFFF',
  yellow30Muted: '#FAFAFA',
  yellow30Border: '#EDE7F6',

  // 10% — dark navy accents, sidebar, headings
  purple10: '#2D2D44',
  purple10Soft: '#3D3D5C',
  purple10Muted: '#6B7280',

  // text & semantic
  onPrimary: '#FFFFFF',
  text: '#2D2D44',
  textSecondary: '#6B7280',
  ink: '#2D2D44',
  error: '#C62828',
  errorLight: '#FCE4EC',
};

/**
 * Backward-compatible tokens — existing screens use `colors.orange`, `colors.white`, etc.
 */
export const colors = {
  // primary accent / CTA (legacy: orange → magenta pink)
  orange: palette.pink60,
  orangeDark: '#C2185B',
  orangeLight: '#FCE4EC',

  // secondary / success surfaces (legacy: green)
  green: '#43A047',
  greenDark: palette.purple10,
  greenLight: '#E8F5E9',

  // admin / info (legacy: blue)
  blue: palette.purple10Soft,
  blueDark: palette.purple10,
  blueLight: '#F3E5F5',

  // page backgrounds
  bg: palette.pink60Soft,
  surfaceMuted: palette.pink60Muted,

  // cards, panels, inputs, tab bars
  surface: palette.yellow30Soft,
  card: palette.yellow30Soft,
  white: palette.yellow30Soft,

  // text
  text: palette.text,
  muted: palette.textSecondary,
  border: palette.pink60Border,
  borderSubtle: '#F0F0F0',
  onPrimary: palette.onPrimary,

  // legacy accent aliases
  purple: palette.purple10,
  purpleDark: palette.purple10,
  purpleLight: '#EDE7F6',
  yellow: '#FFF8E1',
  yellowLight: '#FDF2F8',
  yellowDark: palette.purple10,
  dark: palette.purple10,

  // semantic
  red: palette.error,
  redLight: palette.errorLight,
};

export const gradients = {
  brand: [palette.pink60, '#C2185B'] as const,
  primary: [palette.pink60, '#AD1457'] as const,
  secondary: [palette.pink60Soft, palette.pink60Muted] as const,
  premium: [palette.purple10, palette.purple10Soft] as const,
  surface: [palette.pink60Soft, '#FFFFFF'] as const,
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
