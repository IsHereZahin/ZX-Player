import type { TextStyle } from 'react-native';

/**
 * ZX Player design tokens. Blue is the single brand colour: filled buttons and active
 * states use `primary`, progress/selection marks use `primaryBright`, and blue text or
 * icons on dark surfaces use `primaryText` (chosen for WCAG AA contrast on `background`).
 */
export const colors = {
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primaryBright: '#3B82F6',
  primaryText: '#60A5FA',
  primarySoft: 'rgba(59, 130, 246, 0.16)',
  primarySoftPressed: 'rgba(59, 130, 246, 0.26)',
  onPrimary: '#FFFFFF',

  background: '#0A0C11',
  surface: '#12151C',
  surfaceRaised: '#191D26',
  surfaceHigh: '#232835',
  border: '#272C38',
  divider: 'rgba(255, 255, 255, 0.06)',
  pressed: 'rgba(255, 255, 255, 0.06)',

  textPrimary: '#F3F5F9',
  textSecondary: '#A1A9B8',
  textMuted: '#6B7385',

  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  success: '#34D399',

  white: '#FFFFFF',
  black: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  playerPanel: 'rgba(17, 20, 27, 0.94)',
  playerChip: 'rgba(17, 20, 27, 0.72)',
  playerButton: 'rgba(255, 255, 255, 0.12)',
  trackInactive: 'rgba(255, 255, 255, 0.24)',
  trackBuffered: 'rgba(255, 255, 255, 0.42)',
} as const;

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
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headline: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
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
