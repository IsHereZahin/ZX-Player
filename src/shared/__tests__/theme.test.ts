import { Platform } from 'react-native';

import { COLOR_THEMES, font, paletteFor } from '../theme';

/** WCAG relative luminance of an opaque #RRGGBB colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

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
