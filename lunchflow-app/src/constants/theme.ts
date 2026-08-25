import { brandHeadingStyle, fontStyle, taglineStyle } from './fonts';

/**
 * Chef Queen / LunchFlow design tokens.
 * Brand: #515B2F olive  ·  #E45E1A orange  ·  #FFF6E8 cream
 */

export const palette = {
  forest: '#515B2F',
  forestSoft: '#6A7348',
  orange: '#E45E1A',
  terracotta: '#C8503A',
  chocolate: '#4B2010',
  cream: '#FFF6E8',
  creamMuted: '#F7EBDA',
  creamBorder: '#E8D7C2',

  yellow30: '#FFFFFF',
  yellow30Soft: '#FFFFFF',
  yellow30Muted: '#FAF4EA',
  yellow30Border: '#EDE3D4',

  onPrimary: '#FFFFFF',
  text: '#3F4724',
  textSecondary: '#6B5E52',
  ink: '#3F4724',
  error: '#C8503A',
  errorLight: '#F8E4DC',
};

export const colors = {
  primary: palette.orange,
  secondary: palette.forest,
  orange: palette.orange,
  orangeDark: '#C44E14',
  orangeLight: '#FBE4D4',

  green: palette.forest,
  greenDark: palette.forest,
  greenLight: '#E8ECD8',

  blue: palette.forestSoft,
  blueDark: palette.forest,
  blueLight: '#E8ECD8',

  bg: palette.cream,
  surfaceMuted: palette.creamMuted,
  surface: palette.yellow30Soft,
  card: palette.yellow30Soft,
  white: palette.yellow30Soft,

  text: palette.text,
  muted: palette.textSecondary,
  border: palette.creamBorder,
  borderSubtle: '#F0E6D8',
  onPrimary: palette.onPrimary,

  purple: palette.forest,
  purpleDark: palette.forest,
  purpleLight: '#E8ECD8',
  yellow: '#FBE8D0',
  yellowLight: palette.cream,
  yellowDark: palette.chocolate,
  dark: palette.forest,

  red: palette.error,
  redLight: palette.errorLight,
};

export const gradients = {
  brand: [palette.orange, palette.terracotta] as const,
  primary: [palette.orange, '#C44E14'] as const,
  secondary: [palette.cream, palette.creamMuted] as const,
  premium: [palette.forest, palette.forestSoft] as const,
  surface: [palette.cream, '#FFFFFF'] as const,
};

export const typography = {
  display: { ...fontStyle('bold'), fontSize: 28, lineHeight: 36, letterSpacing: -0.6 },
  h1: { ...fontStyle('semibold'), fontSize: 22, lineHeight: 30, letterSpacing: -0.4 },
  h2: { ...fontStyle('semibold'), fontSize: 18, lineHeight: 26, letterSpacing: -0.2 },
  h3: { ...fontStyle('semibold'), fontSize: 16, lineHeight: 24 },
  body: { ...fontStyle('regular'), fontSize: 14, lineHeight: 22 },
  bodyStrong: { ...fontStyle('bold'), fontSize: 14, lineHeight: 22 },
  caption: { ...fontStyle('medium'), fontSize: 12, lineHeight: 18 },
  label: { ...fontStyle('medium'), fontSize: 13, lineHeight: 18 },
  brandHeading: { ...brandHeadingStyle(), fontSize: 24, lineHeight: 30 },
  tagline: { ...taglineStyle(), fontSize: 18, lineHeight: 24 },
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

export const motion = {
  fast: 160,
  base: 220,
  slow: 280,
};

export const shadow = {
  card: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  elevated: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 8,
  },
  subtle: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
};
