import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import {
  iosReadGalleryPermission,
  iosRequestReadWriteGalleryPermission,
  type CameraRollAuthorizationStatus,
} from '@react-native-camera-roll/camera-roll';

/**
 * - `granted` / `limited`: the library (or a user-selected subset) is readable.
 * - `undetermined` / `denied`: the system prompt can still be shown.
 * - `blocked`: only the Settings app can grant access.
 * - `unavailable`: the device does not allow library access at all.
 */
export type MediaPermissionStatus =
  | 'granted'
  | 'limited'
  | 'undetermined'
  | 'denied'
  | 'blocked'
  | 'unavailable';

export function hasMediaAccess(status: MediaPermissionStatus): boolean {
  return status === 'granted' || status === 'limited';
}

export function checkMediaPermission(): Promise<MediaPermissionStatus> {
  return Platform.OS === 'ios' ? checkIos() : checkAndroid();
}

export function requestMediaPermission(): Promise<MediaPermissionStatus> {
  return Platform.OS === 'ios' ? requestIos() : requestAndroid();
}

// iOS cannot re-prompt after a denial, so "denied" is reported as "blocked".
const IOS_STATUS: Record<CameraRollAuthorizationStatus, MediaPermissionStatus> =
  {
    granted: 'granted',
    limited: 'limited',
    'not-determined': 'undetermined',
    denied: 'blocked',
    blocked: 'blocked',
    unavailable: 'unavailable',
  };

async function checkIos(): Promise<MediaPermissionStatus> {
  return IOS_STATUS[await iosReadGalleryPermission('readWrite')];
}

async function requestIos(): Promise<MediaPermissionStatus> {
  return IOS_STATUS[await iosRequestReadWriteGalleryPermission()];
}

interface AndroidMediaPermissions {
  full: Permission;
  partial: Permission | null;
}

function getAndroidPermissions(): AndroidMediaPermissions {
  const apiLevel = Number(Platform.Version);
  if (apiLevel >= 33) {
    return {
      full: PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      partial:
        apiLevel >= 34
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED
          : null,
    };
  }
  return {
    full: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    partial: null,
  };
}

async function checkAndroid(): Promise<MediaPermissionStatus> {
  const { full, partial } = getAndroidPermissions();
  if (await PermissionsAndroid.check(full)) {
    return 'granted';
  }
  if (partial && (await PermissionsAndroid.check(partial))) {
    return 'limited';
  }
  // Android only reveals "never ask again" in a request result.
  return 'undetermined';
}

async function requestAndroid(): Promise<MediaPermissionStatus> {
  const { full, partial } = getAndroidPermissions();
  // Requesting the partial permission alongside the full one lets Android 14+
  // offer the "Select videos" option in the same dialog.
  const results = await PermissionsAndroid.requestMultiple(
    partial ? [full, partial] : [full],
  );
  const { GRANTED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;
  if (results[full] === GRANTED) {
    return 'granted';
  }
  if (partial && results[partial] === GRANTED) {
    return 'limited';
  }
  return results[full] === NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}
