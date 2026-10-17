import { Platform } from 'react-native';

import {
  COLOR_THEMES,
  contrastRatio as contrast,
  font,
  paletteFor,
} from '../theme';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('palettes', () => {
  const combinations = COLOR_THEMES.flatMap(theme =>
    (['light', 'dark'] as const).map(scheme => [theme, scheme] as const),
  );

  it.each(combinations)(
    'keeps text readable on screens and cards (%s, %s)',
    (theme, scheme) => {
      const colors = paletteFor(scheme, theme);
      for (const ground of [colors.background, colors.surface]) {
        for (const text of [
          colors.textPrimary,
          colors.textSecondary,
          colors.accentText,
        ]) {
          // WCAG AA for body text.
          expect(contrast(text, ground)).toBeGreaterThanOrEqual(4.5);
        }
      }
    },
  );

  it.each(combinations)(
    'keeps icons on the accent visible (%s, %s)',
    (theme, scheme) => {
      const colors = paletteFor(scheme, theme);
      // WCAG AA for icons and other non-text UI.
      expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(
        3,
      );
    },
  );

  it('builds each palette once', () => {
    expect(paletteFor('dark', 'forest')).toBe(paletteFor('dark', 'forest'));
    expect(paletteFor('light', 'ocean').accent).not.toBe(
      paletteFor('light', 'racing').accent,
    );
  });
});

describe('font', () => {
  it('uses the system font weights on iOS', () => {
    expect(font('semibold', 17)).toEqual({ fontWeight: '600' });
  });

  it('uses one Inter file per weight on Android, tracked tighter as it grows', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const body = font('regular', 17);
    const largeTitle = font('bold', 34);

    expect(body.fontFamily).toBe('Inter-Regular');
    expect(largeTitle.fontFamily).toBe('Inter-Bold');
    expect(body).not.toHaveProperty('fontWeight');
    expect(largeTitle.letterSpacing).toBeLessThan(body.letterSpacing ?? 0);
  });
});
