export const colors = {
  background: '#0B0B0F',
  surface: '#15151C',
  surfaceRaised: '#1F1F29',
  border: '#2A2A36',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  accent: '#FF5A1F',
  onAccent: '#FFFFFF',
  danger: '#F87171',
  black: '#000000',
  playerScrim: 'rgba(0, 0, 0, 0.45)',
  playerPanel: 'rgba(12, 12, 16, 0.78)',
  trackInactive: 'rgba(255, 255, 255, 0.28)',
  trackBuffered: 'rgba(255, 255, 255, 0.5)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  body: 15,
  subtitle: 17,
  title: 20,
} as const;
