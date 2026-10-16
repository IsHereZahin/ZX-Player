import { SAMPLE_ASS, SAMPLE_SRT } from '../../../../test/fixtures';
import {
  createSubtitleTrack,
  detectSubtitleFormat,
  findActiveCues,
  getSubtitleText,
  parseSubtitles,
} from '..';

describe('findActiveCues', () => {
  const track = createSubtitleTrack([
    { start: 10, end: 12, text: 'C' },
    { start: 0, end: 30, text: 'Long sign' },
    { start: 1, end: 3, text: 'A' },
    { start: 2, end: 4, text: 'B' },
  ]);

  it('sorts cues and records the longest duration', () => {
    expect(track.cues.map(cue => cue.text)).toEqual([
      'Long sign',
      'A',
      'B',
      'C',
    ]);
    expect(track.maxCueDuration).toBe(30);
  });

  it('returns every cue visible at a time, including long overlapping ones', () => {
    expect(findActiveCues(track, 2.5).map(cue => cue.text)).toEqual([
      'Long sign',
      'A',
      'B',
    ]);
    expect(findActiveCues(track, 11).map(cue => cue.text)).toEqual([
      'Long sign',
      'C',
    ]);
  });

  it('treats the end time as exclusive', () => {
    expect(findActiveCues(track, 3).map(cue => cue.text)).toEqual([
      'Long sign',
      'B',
    ]);
    expect(findActiveCues(track, 30)).toEqual([]);
  });

  it('returns nothing before the first cue or for an empty track', () => {
    expect(findActiveCues(track, -1)).toEqual([]);
    expect(findActiveCues(createSubtitleTrack([]), 5)).toEqual([]);
  });

  it('matches a brute-force scan over many cues', () => {
    const cues = Array.from({ length: 500 }, (_, index) => ({
      start: index * 0.7,
      end: index * 0.7 + 0.5 + (index % 7),
      text: `cue ${index}`,
    }));
    const big = createSubtitleTrack(cues);
    for (const time of [0, 3.3, 99.9, 200.05, 349.6, 400]) {
      const expected = big.cues.filter(
        cue => cue.start <= time && cue.end > time,
      );
      expect(findActiveCues(big, time)).toEqual(expected);
    }
  });
});

describe('getSubtitleText', () => {
  it('joins overlapping lines and removes duplicates', () => {
    const track = createSubtitleTrack([
      { start: 0, end: 5, text: 'Same' },
      { start: 1, end: 5, text: 'Same' },
      { start: 2, end: 5, text: 'Other' },
    ]);
    expect(getSubtitleText(track, 3)).toBe('Same\nOther');
    expect(getSubtitleText(track, 6)).toBe('');
  });
});

describe('detectSubtitleFormat / parseSubtitles', () => {
  it('uses the file extension first', () => {
    expect(detectSubtitleFormat('movie.SRT', '')).toBe('srt');
    expect(detectSubtitleFormat('movie.ass', '')).toBe('ass');
    expect(detectSubtitleFormat('movie.ssa', '')).toBe('ass');
  });

  it('sniffs the content when the extension is unhelpful', () => {
    expect(detectSubtitleFormat('document', SAMPLE_ASS)).toBe('ass');
    expect(detectSubtitleFormat('file.txt', SAMPLE_SRT)).toBe('srt');
    expect(detectSubtitleFormat('notes.txt', 'just text')).toBeNull();
  });

  it('builds a searchable track from either format', () => {
    expect(getSubtitleText(parseSubtitles(SAMPLE_SRT, 'srt'), 2)).toBe(
      'Hello there!',
    );
    expect(getSubtitleText(parseSubtitles(SAMPLE_ASS, 'ass'), 2)).toBe(
      'Hello, world\nSecond line',
    );
  });
});
