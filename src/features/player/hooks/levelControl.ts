/** A 0–1 system level (brightness or volume) that gestures can read and adjust. */
export interface LevelControl {
  available: boolean;
  getLevel: () => number;
  setLevel: (level: number) => void;
}

/**
 * Gestures emit dozens of updates per second; rounding to whole percent and skipping
 * repeats keeps native calls to at most ~100 per full sweep.
 */
export function roundLevel(level: number): number {
  return Math.round(Math.min(1, Math.max(0, level)) * 100) / 100;
}
