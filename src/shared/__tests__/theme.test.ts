import { Platform } from 'react-native';

import { font } from '../theme';

afterEach(() => {
  jest.restoreAllMocks();
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
