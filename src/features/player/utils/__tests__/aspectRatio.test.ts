import {
  ASPECT_MODES,
  computeVideoFrame,
  nextAspectMode,
  normalizeNaturalSize,
} from '../aspectRatio';

// A 20:9 phone in landscape playing 1080p 16:9 video.
const screen = { width: 900, height: 405 };
const video = { width: 1920, height: 1080 };

describe('computeVideoFrame', () => {
  it('fit keeps the whole frame visible', () => {
    const frame = computeVideoFrame('fit', screen, video, 3);
    expect(frame.height).toBeCloseTo(405);
    expect(frame.width).toBeCloseTo(720);
  });

  it('fill covers the screen without distortion', () => {
    const frame = computeVideoFrame('fill', screen, video, 3);
    expect(frame.width).toBeCloseTo(900);
    expect(frame.height).toBeCloseTo(506.25);
    expect(frame.width / frame.height).toBeCloseTo(16 / 9);
  });

  it('crop renders at native pixel size', () => {
    expect(computeVideoFrame('crop', screen, video, 3)).toEqual({
      width: 640,
      height: 360,
    });
  });

  it('stretch matches the screen exactly', () => {
    expect(computeVideoFrame('stretch', screen, video, 3)).toEqual(screen);
  });

  it('falls back to the container until the video size is known', () => {
    for (const mode of ASPECT_MODES) {
      expect(computeVideoFrame(mode, screen, null, 3)).toEqual(screen);
      expect(
        computeVideoFrame(mode, screen, { width: 0, height: 0 }, 3),
      ).toEqual(screen);
    }
  });
});

describe('nextAspectMode', () => {
  it('cycles through every mode and wraps around', () => {
    expect(nextAspectMode('fit')).toBe('fill');
    expect(nextAspectMode('fill')).toBe('crop');
    expect(nextAspectMode('crop')).toBe('stretch');
    expect(nextAspectMode('stretch')).toBe('fit');
  });
});

describe('normalizeNaturalSize', () => {
  it('swaps dimensions reported before rotation for portrait video', () => {
    expect(
      normalizeNaturalSize({
        width: 1920,
        height: 1080,
        orientation: 'portrait',
      }),
    ).toEqual({ width: 1080, height: 1920 });
  });

  it('keeps consistent sizes as they are', () => {
    expect(
      normalizeNaturalSize({
        width: 1920,
        height: 1080,
        orientation: 'landscape',
      }),
    ).toEqual({ width: 1920, height: 1080 });
  });

  it('returns null for unknown sizes', () => {
    expect(normalizeNaturalSize({ width: 0, height: 0 })).toBeNull();
  });
});
