export interface MediaTrack {
  index: number;
  title?: string;
  language?: string;
  type?: string;
  selected?: boolean;
}

const CODEC_NAMES: Record<string, string> = {
  'audio/mp4a-latm': 'AAC',
  'audio/ac3': 'Dolby Digital',
  'audio/eac3': 'Dolby Digital Plus',
  'audio/eac3-joc': 'Dolby Atmos',
  'audio/true-hd': 'Dolby TrueHD',
  'audio/vnd.dts': 'DTS',
  'audio/vnd.dts.hd': 'DTS-HD',
  'audio/opus': 'Opus',
  'audio/vorbis': 'Vorbis',
  'audio/mpeg': 'MP3',
  'audio/flac': 'FLAC',
  'application/x-subrip': 'SRT',
  'text/x-ssa': 'ASS',
  'text/vtt': 'WebVTT',
  'application/x-media3-cues': 'Text',
  'application/pgs': 'PGS (image)',
  'application/vobsub': 'VobSub (image)',
};

function codecName(type: string | undefined): string | null {
  if (!type) {
    return null;
  }
  return CODEC_NAMES[type.toLowerCase()] ?? null;
}

function isUndetermined(language: string | undefined): boolean {
  return !language || language === 'und' || language === 'unknown';
}

/** Primary label for a track: its title, else its language code, else its position. */
export function trackLabel(track: MediaTrack, position: number): string {
  if (track.title?.trim()) {
    return track.title.trim();
  }
  if (!isUndetermined(track.language)) {
    return track.language!.toUpperCase();
  }
  return `Track ${position + 1}`;
}

/** Secondary details, e.g. "ENG · AAC". */
export function trackDetails(track: MediaTrack): string | undefined {
  const parts = [
    track.title && !isUndetermined(track.language)
      ? track.language!.toUpperCase()
      : null,
    codecName(track.type),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3] as const;

const MIN_SPEED = PLAYBACK_SPEEDS[0];
const MAX_SPEED = PLAYBACK_SPEEDS[PLAYBACK_SPEEDS.length - 1];
/** Fine adjustment between the presets. */
export const SPEED_STEP = 0.05;

/** One step faster (1) or slower (-1), on the 0.05 grid and within the offered range. */
export function stepSpeed(speed: number, direction: 1 | -1): number {
  const next = Math.round((speed + direction * SPEED_STEP) / SPEED_STEP) * SPEED_STEP;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Number(next.toFixed(2))));
}

export function canStepSpeed(speed: number, direction: 1 | -1): boolean {
  return direction > 0 ? speed < MAX_SPEED : speed > MIN_SPEED;
}
