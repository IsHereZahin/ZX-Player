import { PermissionsAndroid, Platform } from 'react-native';

import { reportError } from '../../shared/logger';
import type { VideoItem } from '../library/types';
import { updateSettings } from './settingsStore';

/** Music should not stop when the screen turns off, so audio always plays on. */
export function playsInBackground(
  item: VideoItem,
  backgroundPlay: boolean,
): boolean {
  return backgroundPlay || item.kind === 'audio';
}

/**
 * Turns background playback on or off. On Android 13+ the media controls live in a
 * notification, so turning it on also asks for notification permission; playback in the
 * background still works if the user declines.
 */
export async function setBackgroundPlay(enabled: boolean): Promise<void> {
  updateSettings({ backgroundPlay: enabled });
  if (!enabled || Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return;
  }
  try {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  } catch (error) {
    reportError('Requesting notification permission failed', error);
  }
}
