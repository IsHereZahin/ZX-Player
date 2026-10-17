import { Platform, type TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

/** The colour themes offered in Settings. Sky is the default and the app icon's. */
export const COLOR_THEMES = [
  'sky',
  'forest',
  'crimson',
  'ocean',
  'racing',
] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];
export const DEFAULT_COLOR_THEME: ColorTheme = 'sky';

/** What a colour theme changes in one scheme; everything else stays neutral. */
interface Tint {
  /** Progress, the playing item, unplayed dots, switches, active player shortcuts. */
  accent: string;
  /** The accent as text: darker on light screens, lighter on dark, to keep AA contrast. */
  accentText: string;
  /** Screen background, faintly tinted with the theme's colour. */
  background: string;
  /** Top colour of the soft gradient behind screen headers. */
  glow: string;
}

export interface ColorThemeSpec {
  name: string;
  light: Tint;
  dark: Tint;
  /** App logo gradient, from the top-left corner to the bottom-right. */
  logo: readonly [string, string];
}

export const COLOR_THEME_SPECS: Record<ColorTheme, ColorThemeSpec> = {
  sky: {
    name: 'Sky',
    light: {
      accent: '#3D8EF0',
      accentText: '#1E6BCB',
      background: '#F4F7FB',
      glow: '#A9D1FB',
    },
    dark: {
      accent: '#5AA8F8',
      accentText: '#7DBBFA',
      background: '#0B0F15',
      glow: '#1C4F86',
    },
    logo: ['#8CC6FB', '#2F7FE0'],
  },
  forest: {
    name: 'Forest',
    light: {
      accent: '#1F8A5B',
      accentText: '#17694A',
      background: '#F2F6F3',
      glow: '#BFE3C9',
    },
    dark: {
      accent: '#8FD46B',
      accentText: '#A6E08A',
      background: '#0A110D',
      glow: '#1E5A43',
    },
    logo: ['#4FBF7E', '#145A3F'],
  },
  crimson: {
    name: 'Crimson',
    light: {
      accent: '#E5173F',
      accentText: '#C0102F',
      background: '#EFEFEF',
      glow: '#F6C9D2',
    },
    dark: {
      accent: '#FF3B5C',
      accentText: '#FF6B82',
      background: '#0E0E10',
      glow: '#5A1222',
    },
    logo: ['#FF5470', '#B30E2C'],
  },
  ocean: {
    name: 'Ocean',
    light: {
      accent: '#1565A8',
      accentText: '#0F5C9E',
      background: '#F1F5F9',
      glow: '#B6CFE6',
    },
    dark: {
      accent: '#4FA3E0',
      accentText: '#7CC0F0',
      background: '#07111C',
      glow: '#0F3A63',
    },
    logo: ['#3B8FD6', '#0A3A6B'],
  },
  racing: {
    name: 'Racing',
    light: {
      accent: '#C8302C',
      accentText: '#B02A26',
      background: '#F6F3F2',
      glow: '#F0C5C3',
    },
    dark: {
      accent: '#F0524D',
      accentText: '#FF7A75',
      background: '#120D0D',
      glow: '#5C1614',
    },
    logo: ['#E85A54', '#9A1F1C'],
  },
};

/** `#RRGGBB` with an alpha, as `rgba(…)`. */
export function withAlpha(hex: string, alpha: number): string {
  const [red, green, blue] = [1, 3, 5].map(index =>
    parseInt(hex.slice(index, index + 2), 16),
  );
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * ZX Player design tokens: a calm, neutral base in light and dark, plus one colour theme.
 * Ink (near-black, white in dark) is the tint: filled buttons, the current tab and icons
 * use `primary` / `primaryText`. The theme's `accent` marks what is live or new, and
 * `accentText` is its readable text form. Screens sit on `background` / `canvas` with
 * white `surface` cards. Components read the active palette through `useColors` /
 * `makeStyles` (theming.tsx).
 */
const darkNeutral = {
  primary: '#F2F4F7',
  primaryPressed: '#D3D7DE',
  primaryText: '#F2F4F7',
  primarySoft: 'rgba(255, 255, 255, 0.08)',
  primarySoftPressed: 'rgba(255, 255, 255, 0.14)',
  onPrimary: '#0E1014',

  surface: '#17191D',
  surfaceRaised: '#22252B',
  surfaceHigh: '#2E323A',
  border: '#2A2E35',
  divider: 'rgba(255, 255, 255, 0.08)',
  pressed: 'rgba(255, 255, 255, 0.08)',
  /** Segmented-control and switch tracks, icon tiles. */
  fill: 'rgba(255, 255, 255, 0.08)',
  fillStrong: 'rgba(255, 255, 255, 0.14)',
  /** The grouped cards inside sheets. */
  sheetCell: '#22252B',

  textPrimary: '#F2F4F7',
  textSecondary: '#9AA1AC',
  textMuted: '#5B616B',

  danger: '#FF453A',
  dangerSoft: 'rgba(255, 69, 58, 0.18)',
  success: '#30D158',

  // System colours, e.g. for badges.
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

const lightNeutral: typeof darkNeutral = {
  primary: '#111318',
  primaryPressed: '#363A42',
  primaryText: '#111318',
  primarySoft: 'rgba(17, 19, 24, 0.06)',
  primarySoftPressed: 'rgba(17, 19, 24, 0.12)',
  onPrimary: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceRaised: '#ECEEF1',
  surfaceHigh: '#DFE2E7',
  border: '#E4E7EB',
  divider: 'rgba(17, 19, 24, 0.08)',
  pressed: 'rgba(17, 19, 24, 0.06)',
  fill: 'rgba(17, 19, 24, 0.06)',
  fillStrong: 'rgba(17, 19, 24, 0.12)',
  sheetCell: '#FFFFFF',

  textPrimary: '#111318',
  textSecondary: '#5F6673',
  textMuted: '#A3AAB5',

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

type ThemedKey =
  | 'accent'
  | 'accentText'
  | 'accentSoft'
  | 'onAccent'
  | 'background'
  | 'canvas'
  | 'sheet'
  | 'chrome'
  | 'glow';

export type ColorTokens = Readonly<
  Record<keyof typeof darkNeutral | ThemedKey, string>
>;

function buildPalette(scheme: ColorScheme, theme: ColorTheme): ColorTokens {
  const base = scheme === 'light' ? lightNeutral : darkNeutral;
  const tint = COLOR_THEME_SPECS[theme][scheme];
  return {
    ...base,
    accent: tint.accent,
    accentText: tint.accentText,
    accentSoft: withAlpha(tint.accent, scheme === 'light' ? 0.12 : 0.18),
    onAccent: '#FFFFFF',
    background: tint.background,
    canvas: tint.background,
    // Sheets take the screen colour when light and a raised card colour when dark.
    sheet: scheme === 'light' ? tint.background : base.surface,
    // Headers and bars once content scrolls under them.
    chrome: withAlpha(tint.background, 0.92),
    glow: tint.glow,
  };
}

const paletteCache = new Map<string, ColorTokens>();

/** The palette for a scheme and colour theme, built once and then reused. */
export function paletteFor(
  scheme: ColorScheme,
  theme: ColorTheme = DEFAULT_COLOR_THEME,
): ColorTokens {
  const key = `${scheme}:${theme}`;
  let palette = paletteCache.get(key);
  if (!palette) {
    palette = buildPalette(scheme, theme);
    paletteCache.set(key, palette);
  }
  return palette;
}

export const lightColors = paletteFor('light');
export const darkColors = paletteFor('dark');

/**
 * The player is always dark, whatever the app appearance: video reads best on black.
 * Its neutral styles use this; accents come from `useColors`, so they follow the theme.
 */
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

/** Generous, soft corners: cards and large artwork use `lg`, sheets `xl`. */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
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
  /** Small spaced capitals for section labels ("FOLDERS") and grouped-list headers. */
  overline: {
    ...textStyle(12, 16, 'semibold'),
    letterSpacing: 0.8,
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
