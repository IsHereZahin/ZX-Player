import { SAMPLE_SRT } from '../../../../test/fixtures';
import { parseSrt, parseSrtTimestamp } from '../parseSrt';

describe('parseSrtTimestamp', () => {
  it.each([
    ['00:00:01,000', 1],
    ['01:02:03,450', 3723.45],
    ['00:00:02.5', 2.5],
    ['12:34.567', 754.567],
  ])('parses %p', (input, expected) => {
    expect(parseSrtTimestamp(input)).toBeCloseTo(expected, 5);
  });

  it('rejects malformed values', () => {
    expect(parseSrtTimestamp('1:2:3:4')).toBeNull();
    expect(parseSrtTimestamp('abc')).toBeNull();
  });
});

describe('parseSrt', () => {
  it('parses cues and strips formatting tags', () => {
    expect(parseSrt(SAMPLE_SRT)).toEqual([
      { start: 1, end: 4, text: 'Hello there!' },
      { start: 5.5, end: 7.25, text: 'Second line one\nSecond line two' },
    ]);
  });

  it('handles CRLF line endings, a BOM and stray ASS override tags', () => {
    const content =
      '﻿1\r\n00:00:01,000 --> 00:00:02,000\r\n{\\an8}Top text\r\n\r\n';
    expect(parseSrt(content)).toEqual([{ start: 1, end: 2, text: 'Top text' }]);
  });

  it('skips malformed and empty blocks without failing the file', () => {
    const content = [
      '1',
      'not a timing line',
      'text',
      '',
      '2',
      '00:00:05,000 --> 00:00:04,000',
      'ends before it starts',
      '',
      '3',
      '00:00:06,000 --> 00:00:07,000',
      '<b></b>',
      '',
      '4',
      '00:00:08,000 --> 00:00:09,000 position:10% align:start',
      'valid',
    ].join('\n');
    expect(parseSrt(content)).toEqual([{ start: 8, end: 9, text: 'valid' }]);
  });

  it('tolerates blank lines that contain whitespace between cues', () => {
    const content =
      '1\n00:00:01,000 --> 00:00:02,000\nA\n   \n2\n00:00:03,000 --> 00:00:04,000\nB';
    expect(parseSrt(content).map(cue => cue.text)).toEqual(['A', 'B']);
  });
});
