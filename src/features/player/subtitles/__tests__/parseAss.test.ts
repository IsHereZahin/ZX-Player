import { SAMPLE_ASS } from '../../../../test/fixtures';
import { parseAss, parseAssTimestamp } from '../parseAss';

describe('parseAssTimestamp', () => {
  it.each([
    ['0:00:01.00', 1],
    ['1:02:03.45', 3723.45],
    ['0:00:01.5', 1.5],
    ['0:00:10', 10],
  ])('parses %p', (input, expected) => {
    expect(parseAssTimestamp(input)).toBeCloseTo(expected, 5);
  });

  it('rejects malformed values', () => {
    expect(parseAssTimestamp('00:01')).toBeNull();
  });
});

describe('parseAss', () => {
  it('reads dialogue from the [Events] section only', () => {
    expect(parseAss(SAMPLE_ASS)).toEqual([
      { start: 1, end: 3.5, text: 'Hello, world\nSecond line' },
      { start: 6, end: 8, text: 'Soft break and space' },
    ]);
  });

  it('keeps commas inside the text field', () => {
    const content =
      '[Events]\nFormat: Layer, Start, End, Style, Text\nDialogue: 0,0:00:01.00,0:00:02.00,Default,One, two, three';
    expect(parseAss(content)).toEqual([
      { start: 1, end: 2, text: 'One, two, three' },
    ]);
  });

  it('honours a custom field order (SSA v4 "Marked")', () => {
    const content = [
      '[Events]',
      'Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      'Dialogue: Marked=0,0:00:02.00,0:00:04.00,Default,,0,0,0,,SSA line',
    ].join('\n');
    expect(parseAss(content)).toEqual([{ start: 2, end: 4, text: 'SSA line' }]);
  });

  it('falls back to the default v4+ format when none is declared', () => {
    const content =
      '[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,No format line';
    expect(parseAss(content)).toEqual([
      { start: 1, end: 2, text: 'No format line' },
    ]);
  });

  it('ignores dialogue lines outside [Events] and malformed timings', () => {
    const content = [
      '[Script Info]',
      'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Wrong section',
      '[Events]',
      'Dialogue: 0,bad,0:00:02.00,Default,,0,0,0,,Bad start',
    ].join('\n');
    expect(parseAss(content)).toEqual([]);
  });
});
