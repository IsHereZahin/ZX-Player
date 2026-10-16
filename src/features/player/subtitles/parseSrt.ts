import { normalizeLineEndings, tidyLines } from './text';
import type { SubtitleCue } from './types';

// `00:01:02,500 --> 00:01:04,000` plus any trailing WebVTT-style cue settings.
const TIMING_LINE = /^\s*(\S+)\s*-->\s*(\S+)/;
const TIMESTAMP = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[,.](\d{1,3}))?$/;

/** Parses `hh:mm:ss,mmm` (hours optional, `.` accepted) into seconds. */
export function parseSrtTimestamp(value: string): number | null {
  const match = TIMESTAMP.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, hours = '0', minutes, seconds, fraction = '0'] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(fraction.padEnd(3, '0')) / 1000
  );
}

function cleanSrtText(text: string): string {
  return tidyLines(
    text
      // HTML-style formatting tags: <i>, <b>, <font color="…">, …
      .replace(/<[^>]*>/g, '')
      // ASS override blocks that some SRT authoring tools leave behind, e.g. {\an8}
      .replace(/\{\\[^}]*\}/g, ''),
  );
}

/** Parses SubRip content. Malformed blocks are skipped rather than failing the whole file. */
export function parseSrt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = normalizeLineEndings(content).split(/\n[ \t]*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    const timingIndex = lines.findIndex(line => line.includes('-->'));
    if (timingIndex === -1) {
      continue;
    }
    const timing = TIMING_LINE.exec(lines[timingIndex]);
    if (!timing) {
      continue;
    }
    const start = parseSrtTimestamp(timing[1]);
    const end = parseSrtTimestamp(timing[2]);
    if (start === null || end === null || end <= start) {
      continue;
    }
    const text = cleanSrtText(lines.slice(timingIndex + 1).join('\n'));
    if (text) {
      cues.push({ start, end, text });
    }
  }

  return cues;
}
