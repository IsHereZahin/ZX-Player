import { DEFAULT_SETTINGS, parseSettings } from '../settingsStore';

describe('parseSettings', () => {
  it('returns defaults for anything that is not an object', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('dark')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and replaces invalid ones individually', () => {
    expect(
      parseSettings({
        resumePlayback: false,
        autoPlayNext: 'yes',
        skipSeconds: 15,
        defaultAspectMode: 'zoom',
        subtitleSize: 'large',
        gestureVolume: false,
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      resumePlayback: false,
      skipSeconds: 15,
      subtitleSize: 'large',
      gestureVolume: false,
    });
  });

  it('keeps a valid theme choice and defaults to following the device', () => {
    expect(parseSettings({ appearance: 'light' }).appearance).toBe('light');
    expect(parseSettings({ appearance: 'sepia' }).appearance).toBe('system');
  });

  it('keeps a known colour theme and falls back to Sky', () => {
    expect(parseSettings({ colorTheme: 'forest' }).colorTheme).toBe('forest');
    expect(parseSettings({ colorTheme: 'neon' }).colorTheme).toBe('sky');
  });

  it('rejects skip intervals outside the offered choices', () => {
    expect(parseSettings({ skipSeconds: 7 }).skipSeconds).toBe(
      DEFAULT_SETTINGS.skipSeconds,
    );
  });
});
