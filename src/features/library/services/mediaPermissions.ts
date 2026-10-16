import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import {
  iosReadGalleryPermission,
  iosRequestReadWriteGalleryPermission,
  type CameraRollAuthorizationStatus,
} from '@react-native-camera-roll/camera-roll';

import type { MediaScope } from '../types';

/**
 * - `granted` / `limited`: the library (or part of it: user-selected videos, or only one
 *   of the kinds a combined scope needs) is readable.
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

export function checkMediaPermission(
  scope: MediaScope = 'video',
): Promise<MediaPermissionStatus> {
  if (Platform.OS === 'ios') {
    // The Photos library holds no audio; iOS offers no other library to read.
    return scope === 'audio' ? Promise.resolve('unavailable') : checkIos();
  }
  return checkAndroid(scope);
}

export function requestMediaPermission(
  scope: MediaScope = 'video',
): Promise<MediaPermissionStatus> {
  if (Platform.OS === 'ios') {
    return scope === 'audio' ? Promise.resolve('unavailable') : requestIos();
  }
  return requestAndroid(scope);
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
  /** Every one of these is needed for full access to the scope. */
  full: Permission[];
  partial: Permission | null;
}

function getAndroidPermissions(scope: MediaScope): AndroidMediaPermissions {
  const apiLevel = Number(Platform.Version);
  if (apiLevel >= 33) {
    const {
      READ_MEDIA_VIDEO,
      READ_MEDIA_AUDIO,
      READ_MEDIA_VISUAL_USER_SELECTED,
    } = PermissionsAndroid.PERMISSIONS;
    const full: Permission[] = [];
    if (scope !== 'audio') {
      full.push(READ_MEDIA_VIDEO);
    }
    if (scope !== 'video') {
      full.push(READ_MEDIA_AUDIO);
    }
    return {
      full,
      // "Select photos and videos" covers videos only; audio is all or nothing.
      partial:
        apiLevel >= 34 && scope !== 'audio'
          ? READ_MEDIA_VISUAL_USER_SELECTED
          : null,
    };
  }
  return {
    full: [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE],
    partial: null,
  };
}

async function checkAndroid(scope: MediaScope): Promise<MediaPermissionStatus> {
  const { full, partial } = getAndroidPermissions(scope);
  const granted = await Promise.all(
    full.map(permission => PermissionsAndroid.check(permission)),
  );
  if (granted.every(Boolean)) {
    return 'granted';
  }
  if (
    granted.some(Boolean) ||
    (partial && (await PermissionsAndroid.check(partial)))
  ) {
    return 'limited';
  }
  // Android only reveals "never ask again" in a request result.
  return 'undetermined';
}

async function requestAndroid(
  scope: MediaScope,
): Promise<MediaPermissionStatus> {
  const { full, partial } = getAndroidPermissions(scope);
  // Requesting the partial permission alongside the full ones lets Android 14+
  // offer the "Select videos" option in the same dialog.
  const results = await PermissionsAndroid.requestMultiple(
    partial ? [...full, partial] : full,
  );
  const { GRANTED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;
  if (full.every(permission => results[permission] === GRANTED)) {
    return 'granted';
  }
  if (
    full.some(permission => results[permission] === GRANTED) ||
    (partial && results[partial] === GRANTED)
  ) {
    return 'limited';
  }
  return full.some(permission => results[permission] === NEVER_ASK_AGAIN)
    ? 'blocked'
    : 'denied';
}
