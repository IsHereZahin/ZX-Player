export interface SubtitleCue {
  /** Seconds from the start of the video. */
  start: number;
  /** Seconds; the cue is visible while start <= t < end. */
  end: number;
  /** Plain text; lines separated by `\n`. */
  text: string;
}

export interface SubtitleTrack {
  /** Sorted by start time. */
  cues: SubtitleCue[];
  /** Longest cue duration, used to bound the backwards scan in cue lookup. */
  maxCueDuration: number;
}

export type SubtitleFormat = 'srt' | 'ass';
