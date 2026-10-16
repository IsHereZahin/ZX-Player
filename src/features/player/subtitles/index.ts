import { parseAss } from './parseAss';
import { parseSrt } from './parseSrt';
import { createSubtitleTrack } from './track';
import type { SubtitleFormat, SubtitleTrack } from './types';

export { getSubtitleText, findActiveCues, createSubtitleTrack } from './track';
export type { SubtitleCue, SubtitleFormat, SubtitleTrack } from './types';

/**
 * Picks the parser from the file extension, falling back to sniffing the content
 * (pickers on some Android devices hand back generic names).
 */
export function detectSubtitleFormat(
  fileName: string,
  content: string,
): SubtitleFormat | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'srt') {
    return 'srt';
  }
  if (extension === 'ass' || extension === 'ssa') {
    return 'ass';
  }
  if (/^\s*\[(script info|events)\]/im.test(content)) {
    return 'ass';
  }
  if (content.includes('-->')) {
    return 'srt';
  }
  return null;
}

export function parseSubtitles(
  content: string,
  format: SubtitleFormat,
): SubtitleTrack {
  const cues = format === 'srt' ? parseSrt(content) : parseAss(content);
  return createSubtitleTrack(cues);
}
