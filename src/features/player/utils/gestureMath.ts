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
/** A drag this many times longer on one axis than the other is decided at once. */
export const AXIS_DOMINANCE = 2;
/** By this distance (points) a drag that is still ambiguous goes to its longer axis. */
export const AXIS_DECISION_DISTANCE = 30;
/**
 * Vertical drags that start this close (points) to the top or bottom edge are left to the
 * system: pulling down the status bar, or the home gesture.
 */
export const SYSTEM_EDGE_SIZE = 24;

/**
 * Locks a drag to one control: horizontal drags seek, vertical drags adjust brightness on
 * the left half and volume on the right half. Returns null while the direction is still
 * unclear: deciding on the first few points let a thumb's slight curve pick the wrong
 * control, so a drag is decided once it is clearly one way, or long enough to tell.
 */
export function resolvePanIntent(
  startX: number,
  layoutWidth: number,
  translationX: number,
  translationY: number,
): PanIntent | null {
  const across = Math.abs(translationX);
  const along = Math.abs(translationY);
  let horizontal: boolean;
  if (across === 0 && along === 0) {
    return null;
  } else if (across >= along * AXIS_DOMINANCE) {
    horizontal = true;
  } else if (along >= across * AXIS_DOMINANCE) {
    horizontal = false;
  } else if (Math.hypot(across, along) >= AXIS_DECISION_DISTANCE) {
    horizontal = across >= along;
  } else {
    return null;
  }
  if (horizontal) {
    return 'seek';
  }
  return startX < layoutWidth / 2 ? 'brightness' : 'volume';
}

/** Whether a touch starts where the system's own edge gestures live. */
export function isAtSystemEdge(startY: number, layoutHeight: number): boolean {
  return startY < SYSTEM_EDGE_SIZE || startY > layoutHeight - SYSTEM_EDGE_SIZE;
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
