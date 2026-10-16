import { Platform } from 'react-native';

import type { VideoItem } from '../../library/types';
import type { Size } from './aspectRatio';

export type Orientation = 'landscape' | 'portrait';

/** Square and unknown shapes don't ask for an orientation; the device decides. */
export function orientationOfSize({ width, height }: Size): Orientation | null {
  if (!(width > 0) || !(height > 0) || width === height) {
    return null;
  }
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Library dimensions are display-oriented on iOS (PhotoKit) and on Android 10+, where
 * MediaStore records the rotation of portrait recordings. Older Android only stores the
 * raw (often sideways) frame size, so there the player's own report is waited for.
 */
function libraryDimensionsAreOriented(): boolean {
  return Platform.OS === 'ios' || Number(Platform.Version) >= 29;
}

/** The item's own orientation from library metadata, known before it loads. */
export function orientationOfItem(item: VideoItem): Orientation | null {
  if (item.kind === 'audio' || !libraryDimensionsAreOriented()) {
    return null;
  }
  return orientationOfSize({ width: item.width, height: item.height });
}
