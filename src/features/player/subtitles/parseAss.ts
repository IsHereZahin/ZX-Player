import { normalizeLineEndings, tidyLines } from './text';
import type { SubtitleCue } from './types';

// Field order of the [Events] section when a file omits its own `Format:` line (ASS v4+).
const DEFAULT_EVENT_FORMAT = [
  'layer',
  'start',
  'end',
  'style',
  'name',
  'marginl',
  'marginr',
  'marginv',
  'effect',
  'text',
];

const TIMESTAMP = /^(\d+):(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/;
// `{\p1}` … switches to vector-drawing mode; that text is shape data, not dialogue.
const DRAWING_MODE = /\{[^}]*\\p[1-9]/;

/** Parses `h:mm:ss.cc` (centiseconds) into seconds. */
export function parseAssTimestamp(value: string): number | null {
  const match = TIMESTAMP.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, hours, minutes, seconds, fraction = '0'] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(`0.${fraction}`)
  );
}

/** Splits a Dialogue value into `count` fields; the last (Text) keeps any commas. */
function splitFields(value: string, count: number): string[] {
  const fields: string[] = [];
  let rest = value;
  for (let i = 0; i < count - 1; i += 1) {
    const comma = rest.indexOf(',');
    if (comma === -1) {
      break;
    }
    fields.push(rest.slice(0, comma).trim());
    rest = rest.slice(comma + 1);
  }
  fields.push(rest);
  return fields;
}

function cleanAssText(text: string): string {
  return tidyLines(
    text
      .replace(/\{[^}]*\}/g, '') // override blocks such as {\i1} or {\pos(10,20)}
      .replace(/\\N/g, '\n') // hard line break
      .replace(/\\n/g, ' ') // soft line break (only honoured in wrap style 2)
      .replace(/\\h/g, ' '), // hard space
  );
}

function parseDialogue(value: string, format: string[]): SubtitleCue | null {
  const fields = splitFields(value, format.length);
  const field = (name: string) => {
    const index = format.indexOf(name);
    return index === -1 ? undefined : fields[index];
  };

  const start = parseAssTimestamp(field('start') ?? '');
  const end = parseAssTimestamp(field('end') ?? '');
  const rawText = field('text');
  if (start === null || end === null || end <= start || rawText === undefined) {
    return null;
  }
  if (DRAWING_MODE.test(rawText)) {
    return null;
  }
  const text = cleanAssText(rawText);
  return text ? { start, end, text } : null;
}

/**
 * Parses Advanced SubStation Alpha / SubStation Alpha content. Styling, positioning and
 * effects are dropped; the dialogue text is rendered with ZX Player's own subtitle style.
 */
export function parseAss(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let inEvents = false;
  let format = DEFAULT_EVENT_FORMAT;

  for (const rawLine of normalizeLineEndings(content).split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('[')) {
      inEvents = line.toLowerCase() === '[events]';
      continue;
    }
    if (!inEvents) {
      continue;
    }
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1);

    if (key === 'format') {
      format = value.split(',').map(name => name.trim().toLowerCase());
    } else if (key === 'dialogue') {
      const cue = parseDialogue(value, format);
      if (cue) {
        cues.push(cue);
      }
    }
  }

  return cues;
}
