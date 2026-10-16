import { Platform } from 'react-native';

import { makeVideo, sampleSong } from '../../../../test/fixtures';
import { orientationOfItem, orientationOfSize } from '../orientation';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('orientationOfSize', () => {
  it.each([
    [{ width: 1920, height: 1080 }, 'landscape'],
    [{ width: 1080, height: 1920 }, 'portrait'],
    [{ width: 1080, height: 1080 }, null],
    [{ width: 0, height: 0 }, null],
  ])('reads %p as %p', (size, expected) => {
    expect(orientationOfSize(size)).toBe(expected);
  });
});

describe('orientationOfItem', () => {
  it('trusts library sizes on iOS and Android 10+', () => {
    expect(
      orientationOfItem(makeVideo('1', { width: 720, height: 1280 })),
    ).toBe('portrait');
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(29);
    expect(orientationOfItem(makeVideo('1'))).toBe('landscape');
  });

  it('does not guess before Android 10 or for audio', () => {
    expect(orientationOfItem(sampleSong)).toBeNull();
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(28);
    expect(orientationOfItem(makeVideo('1'))).toBeNull();
  });
});
