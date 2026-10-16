import { Platform, type TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

/**
 * ZX Player design tokens, modelled on Apple's system colours. Blue is the tint: filled
 * buttons and active states use `primary`, progress/selection marks use `primaryBright`,
 * and tinted text or icons use `primaryText`. Screens with grouped lists sit on
 * `background` with `surface` cells; plain lists sit on `canvas`.
 * Components read the active palette through `useColors` / `makeStyles` (theming.tsx).
 */
export const darkColors = {
  primary: '#0A84FF',
  primaryPressed: '#3D9BFF',
  primaryBright: '#0A84FF',
  primaryText: '#0A84FF',
  primarySoft: 'rgba(10, 132, 255, 0.18)',
  primarySoftPressed: 'rgba(10, 132, 255, 0.28)',
  onPrimary: '#FFFFFF',

  background: '#000000',
  canvas: '#000000',
  surface: '#1C1C1E',
  surfaceRaised: '#2C2C2E',
  surfaceHigh: '#3A3A3C',
  border: '#38383A',
  divider: 'rgba(84, 84, 88, 0.6)',
  pressed: 'rgba(255, 255, 255, 0.1)',
  /** Navigation and tab bars. */
  chrome: 'rgba(22, 22, 24, 0.94)',
  /** Search fields, segmented-control tracks, switch tracks. */
  fill: 'rgba(118, 118, 128, 0.24)',
  fillStrong: 'rgba(118, 118, 128, 0.36)',
  /** Sheets, and the grouped cards inside them. */
  sheet: '#1C1C1E',
  sheetCell: '#2C2C2E',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textMuted: 'rgba(235, 235, 245, 0.3)',

  danger: '#FF453A',
  dangerSoft: 'rgba(255, 69, 58, 0.18)',
  success: '#30D158',

  // System accents, e.g. for settings icons and badges.
  blue: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  pink: '#FF375F',
  purple: '#BF5AF2',
  indigo: '#5E5CE6',
  teal: '#40C8E0',
  yellow: '#FFD60A',
  gray: '#8E8E93',

  white: '#FFFFFF',
  black: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  playerPanel: 'rgba(30, 30, 32, 0.94)',
  playerChip: 'rgba(30, 30, 32, 0.72)',
  playerButton: 'rgba(255, 255, 255, 0.14)',
  trackInactive: 'rgba(255, 255, 255, 0.24)',
  trackBuffered: 'rgba(255, 255, 255, 0.42)',
};

export type ColorTokens = { readonly [K in keyof typeof darkColors]: string };

export const lightColors: ColorTokens = {
  primary: '#007AFF',
  primaryPressed: '#0062CC',
  primaryBright: '#007AFF',
  primaryText: '#007AFF',
  primarySoft: 'rgba(0, 122, 255, 0.12)',
  primarySoftPressed: 'rgba(0, 122, 255, 0.2)',
  onPrimary: '#FFFFFF',

  background: '#F2F2F7',
  canvas: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceRaised: '#E5E5EA',
  surfaceHigh: '#D1D1D6',
  border: '#C6C6C8',
  divider: 'rgba(60, 60, 67, 0.29)',
  pressed: 'rgba(0, 0, 0, 0.08)',
  chrome: 'rgba(249, 249, 249, 0.94)',
  fill: 'rgba(118, 118, 128, 0.12)',
  fillStrong: 'rgba(118, 118, 128, 0.2)',
  sheet: '#F2F2F7',
  sheetCell: '#FFFFFF',

  textPrimary: '#000000',
  textSecondary: 'rgba(60, 60, 67, 0.6)',
  textMuted: 'rgba(60, 60, 67, 0.3)',

  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.12)',
  success: '#34C759',

  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  pink: '#FF2D55',
  purple: '#AF52DE',
  indigo: '#5856D6',
  teal: '#30B0C7',
  yellow: '#FFCC00',
  gray: '#8E8E93',

  white: '#FFFFFF',
  black: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.35)',
  playerPanel: 'rgba(30, 30, 32, 0.94)',
  playerChip: 'rgba(30, 30, 32, 0.72)',
  playerButton: 'rgba(0, 0, 0, 0.06)',
  trackInactive: 'rgba(60, 60, 67, 0.18)',
  trackBuffered: 'rgba(60, 60, 67, 0.3)',
};

export const palettes: Record<ColorScheme, ColorTokens> = {
  dark: darkColors,
  light: lightColors,
};

/** The player is always dark, whatever the app appearance: video reads best on black. */
export const playerColors: ColorTokens = darkColors;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  /** Grouped list sections, search fields. */
  md: 10,
  /** Artwork and cards. */
  lg: 12,
  /** Sheets. */
  xl: 14,
  pill: 999,
} as const;

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

const ANDROID_FACES: Record<Weight, string> = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};
const IOS_WEIGHTS: Record<Weight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

/**
 * iOS uses the system font (SF Pro), which tracks itself per size. Android uses Inter, the
 * closest open typeface, with one file per weight (a fontWeight on a custom font would be
 * synthesised) and Inter's recommended size-dependent tracking.
 */
export function font(weight: Weight, size: number): TextStyle {
  if (Platform.OS === 'ios') {
    return { fontWeight: IOS_WEIGHTS[weight] };
  }
  const trackingEm = -0.0223 + 0.185 * Math.exp(-0.1745 * size);
  return {
    fontFamily: ANDROID_FACES[weight],
    letterSpacing: Math.round(trackingEm * size * 100) / 100,
  };
}

function textStyle(
  size: number,
  lineHeight: number,
  weight: Weight,
): TextStyle {
  return { fontSize: size, lineHeight, ...font(weight, size) };
}

/** Apple's text styles (points at the default Dynamic Type size). */
export const typography = {
  largeTitle: textStyle(34, 41, 'bold'),
  title1: textStyle(28, 34, 'bold'),
  title2: textStyle(22, 28, 'bold'),
  title3: textStyle(20, 25, 'semibold'),
  headline: textStyle(17, 22, 'semibold'),
  body: textStyle(17, 22, 'regular'),
  bodyStrong: textStyle(17, 22, 'semibold'),
  callout: textStyle(16, 21, 'regular'),
  calloutStrong: textStyle(16, 21, 'semibold'),
  subheadline: textStyle(15, 20, 'regular'),
  subheadlineStrong: textStyle(15, 20, 'semibold'),
  footnote: textStyle(13, 18, 'regular'),
  footnoteStrong: textStyle(13, 18, 'semibold'),
  caption: textStyle(12, 16, 'regular'),
  captionStrong: textStyle(12, 16, 'semibold'),
  caption2: textStyle(11, 13, 'medium'),
  /** Grouped-list section headers. */
  overline: {
    ...textStyle(13, 18, 'regular'),
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 30,
} as const;

/** Minimum touch target recommended by both platform guidelines. */
export const TOUCH_TARGET = 44;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
