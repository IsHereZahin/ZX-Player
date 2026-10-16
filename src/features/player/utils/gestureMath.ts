import { clamp } from '../../../shared/utils/math';

export type PanIntent = 'seek' | 'brightness' | 'volume';
export type DoubleTapZone = 'rewind' | 'toggle' | 'forward';

/** A full-width horizontal drag seeks this far (capped at the video length). */
export const SEEK_SECONDS_PER_SCREEN_WIDTH = 90;
/** Dragging this fraction of the screen height sweeps a level across its full 0–1 range. */
export const LEVEL_DRAG_FRACTION = 0.7;
export const DOUBLE_TAP_SKIP_SECONDS = 10;
/** Outer share of the width on each side that skips on double tap; the middle toggles playback. */
const SKIP_ZONE_FRACTION = 0.35;

/**
 * Locks a drag to one control: horizontal drags seek, vertical drags adjust brightness on
 * the left half and volume on the right half.
 */
export function resolvePanIntent(
  startX: number,
  layoutWidth: number,
  translationX: number,
  translationY: number,
): PanIntent {
  if (Math.abs(translationX) > Math.abs(translationY)) {
    return 'seek';
  }
  return startX < layoutWidth / 2 ? 'brightness' : 'volume';
}

export function computeSeekTarget(
  startTime: number,
  translationX: number,
  layoutWidth: number,
  duration: number,
): number {
  const safeDuration = Math.max(duration, 0);
  if (layoutWidth <= 0 || safeDuration === 0) {
    return clamp(startTime, 0, safeDuration);
  }
  const range = Math.min(SEEK_SECONDS_PER_SCREEN_WIDTH, safeDuration);
  return clamp(
    startTime + (translationX / layoutWidth) * range,
    0,
    safeDuration,
  );
}

/** Dragging up raises the level; dragging down lowers it. */
export function computeLevel(
  startLevel: number,
  translationY: number,
  layoutHeight: number,
): number {
  if (layoutHeight <= 0) {
    return clamp(startLevel, 0, 1);
  }
  return clamp(
    startLevel - translationY / (layoutHeight * LEVEL_DRAG_FRACTION),
    0,
    1,
  );
}

export function resolveDoubleTapZone(
  x: number,
  layoutWidth: number,
): DoubleTapZone {
  if (x < layoutWidth * SKIP_ZONE_FRACTION) {
    return 'rewind';
  }
  if (x > layoutWidth * (1 - SKIP_ZONE_FRACTION)) {
    return 'forward';
  }
  return 'toggle';
}
