import type { SubtitleCue, SubtitleTrack } from './types';

export function createSubtitleTrack(cues: SubtitleCue[]): SubtitleTrack {
  const sorted = [...cues].sort((a, b) => a.start - b.start || a.end - b.end);
  const maxCueDuration = sorted.reduce(
    (max, cue) => Math.max(max, cue.end - cue.start),
    0,
  );
  return { cues: sorted, maxCueDuration };
}

/**
 * Cues visible at `time`, in start order. Binary search finds the last cue that has
 * started; the backwards scan stops once cues are too old to still be on screen.
 */
export function findActiveCues(
  track: SubtitleTrack,
  time: number,
): SubtitleCue[] {
  const { cues, maxCueDuration } = track;
  let low = 0;
  let high = cues.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (cues[mid].start <= time) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const active: SubtitleCue[] = [];
  for (let i = low - 1; i >= 0; i -= 1) {
    const cue = cues[i];
    if (cue.start < time - maxCueDuration) {
      break;
    }
    if (cue.end > time) {
      active.push(cue);
    }
  }
  return active.reverse();
}

/** Text to display at `time`; overlapping identical lines (common in ASS) are shown once. */
export function getSubtitleText(track: SubtitleTrack, time: number): string {
  const lines = findActiveCues(track, time).map(cue => cue.text);
  return Array.from(new Set(lines)).join('\n');
}
