import { PermissionsAndroid, Platform } from 'react-native';
import {
  iosReadGalleryPermission,
  iosRequestReadWriteGalleryPermission,
} from '@react-native-camera-roll/camera-roll';

import {
  checkMediaPermission,
  hasMediaAccess,
  requestMediaPermission,
} from '../mediaPermissions';

const {
  READ_MEDIA_VIDEO,
  READ_MEDIA_VISUAL_USER_SELECTED,
  READ_EXTERNAL_STORAGE,
} = PermissionsAndroid.PERMISSIONS;
const { GRANTED, DENIED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;

function useAndroid(apiLevel: number) {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(apiLevel);
}

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('iOS', () => {
  it.each([
    ['granted', 'granted'],
    ['limited', 'limited'],
    ['not-determined', 'undetermined'],
    ['denied', 'blocked'],
    ['blocked', 'blocked'],
    ['unavailable', 'unavailable'],
  ])('maps photo-library status %p to %p', async (native, expected) => {
    (iosReadGalleryPermission as jest.Mock).mockResolvedValueOnce(native);
    await expect(checkMediaPermission()).resolves.toBe(expected);
    expect(iosReadGalleryPermission).toHaveBeenCalledWith('readWrite');
  });

  it('requests read/write access', async () => {
    (iosRequestReadWriteGalleryPermission as jest.Mock).mockResolvedValueOnce(
      'limited',
    );
    await expect(requestMediaPermission()).resolves.toBe('limited');
  });
});

describe('Android 14+', () => {
  beforeEach(() => useAndroid(34));

  it('reports full, partial or unknown access from a check', async () => {
    const check = jest.spyOn(PermissionsAndroid, 'check');

    check.mockResolvedValueOnce(true);
    await expect(checkMediaPermission()).resolves.toBe('granted');

    check.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(checkMediaPermission()).resolves.toBe('limited');

    check.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    await expect(checkMediaPermission()).resolves.toBe('undetermined');
  });

  it('asks for full and partial access in one dialog', async () => {
    const request = jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue({ [READ_MEDIA_VIDEO]: GRANTED } as never);

    await expect(requestMediaPermission()).resolves.toBe('granted');
    expect(request).toHaveBeenCalledWith([
      READ_MEDIA_VIDEO,
      READ_MEDIA_VISUAL_USER_SELECTED,
    ]);
  });

  it.each([
    [
      {
        [READ_MEDIA_VIDEO]: DENIED,
        [READ_MEDIA_VISUAL_USER_SELECTED]: GRANTED,
      },
      'limited',
    ],
    [
      {
        [READ_MEDIA_VIDEO]: NEVER_ASK_AGAIN,
        [READ_MEDIA_VISUAL_USER_SELECTED]: DENIED,
      },
      'blocked',
    ],
    [
      { [READ_MEDIA_VIDEO]: DENIED, [READ_MEDIA_VISUAL_USER_SELECTED]: DENIED },
      'denied',
    ],
  ])('maps request results %p to %p', async (results, expected) => {
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue(results as never);
    await expect(requestMediaPermission()).resolves.toBe(expected);
  });
});

describe('Android 13', () => {
  beforeEach(() => useAndroid(33));

  it('requests only READ_MEDIA_VIDEO', async () => {
    const request = jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue({ [READ_MEDIA_VIDEO]: GRANTED } as never);
    await requestMediaPermission();
    expect(request).toHaveBeenCalledWith([READ_MEDIA_VIDEO]);
  });
});

describe('Android 12 and below', () => {
  beforeEach(() => useAndroid(31));

  it('falls back to legacy storage permission', async () => {
    const check = jest
      .spyOn(PermissionsAndroid, 'check')
      .mockResolvedValue(true);
    await expect(checkMediaPermission()).resolves.toBe('granted');
    expect(check).toHaveBeenCalledWith(READ_EXTERNAL_STORAGE);
  });
});

describe('hasMediaAccess', () => {
  it('allows browsing with full or partial access only', () => {
    expect(hasMediaAccess('granted')).toBe(true);
    expect(hasMediaAccess('limited')).toBe(true);
    expect(hasMediaAccess('denied')).toBe(false);
    expect(hasMediaAccess('blocked')).toBe(false);
    expect(hasMediaAccess('undetermined')).toBe(false);
    expect(hasMediaAccess('unavailable')).toBe(false);
  });
});
