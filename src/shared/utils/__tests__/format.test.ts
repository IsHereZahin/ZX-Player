import {
  formatBytes,
  formatDuration,
  formatDate,
  formatPercent,
  formatResolution,
  formatSpeed,
  formatTimeLeft,
  formatSignedDuration,
  formatVideoCount,
} from '../format';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [5.9, '0:05'],
    [65, '1:05'],
    [3599, '59:59'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
  ])('formats %p seconds as %p', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });

  it('falls back to 0:00 for invalid input', () => {
    expect(formatDuration(-3)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});

describe('formatSignedDuration', () => {
  it('prefixes the direction of a seek', () => {
    expect(formatSignedDuration(15)).toBe('+0:15');
    expect(formatSignedDuration(-62)).toBe('-1:02');
    expect(formatSignedDuration(0)).toBe('+0:00');
  });
});

describe('formatBytes', () => {
  it.each([
    [512, '512 B'],
    [1536, '1.5 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
    [150 * 1024 * 1024, '150 MB'],
    [3.2 * 1024 ** 3, '3.2 GB'],
  ])('formats %p bytes as %p', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });

  it('returns null when the size is unknown', () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(undefined)).toBeNull();
    expect(formatBytes(-1)).toBeNull();
  });
});

describe('formatPercent / formatVideoCount', () => {
  it('rounds and clamps percentages', () => {
    expect(formatPercent(0.444)).toBe('44%');
    expect(formatPercent(1.4)).toBe('100%');
    expect(formatPercent(-0.2)).toBe('0%');
  });

  it('pluralises video counts', () => {
    expect(formatVideoCount(1)).toBe('1 video');
    expect(formatVideoCount(0)).toBe('0 videos');
    expect(formatVideoCount(12)).toBe('12 videos');
  });
});

describe('formatResolution', () => {
  it.each([
    [3840, 2160, '4K'],
    [1920, 1080, '1080p'],
    [1080, 1920, '1080p'],
    [1280, 720, '720p'],
    [854, 480, '480p'],
    [320, 180, '180p'],
    [0, 0, null],
  ])('labels %p×%p as %p', (width, height, expected) => {
    expect(formatResolution(width, height)).toBe(expected);
  });
});

describe('formatTimeLeft / formatSpeed / formatDate', () => {
  it('describes remaining time in the largest sensible unit', () => {
    expect(formatTimeLeft(42)).toBe('42 sec left');
    expect(formatTimeLeft(12 * 60 + 10)).toBe('12 min left');
    expect(formatTimeLeft(65 * 60)).toBe('1 hr 5 min left');
    expect(formatTimeLeft(120 * 60)).toBe('2 hr left');
  });

  it('formats speeds without trailing zeros', () => {
    expect(formatSpeed(1)).toBe('1×');
    expect(formatSpeed(1.25)).toBe('1.25×');
    expect(formatSpeed(0.5)).toBe('0.5×');
  });

  it('formats dates and rejects unknown ones', () => {
    expect(formatDate(1_700_000_000)).toMatch(/2023/);
    expect(formatDate(0)).toBeNull();
  });
});
