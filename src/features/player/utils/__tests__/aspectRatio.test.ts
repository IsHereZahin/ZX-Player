import {
  ASPECT_MODES,
  clampZoom,
  computeVideoFrame,
  nextAspectMode,
  normalizeNaturalSize,
  resolveVideoLayout,
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

describe('resolveVideoLayout', () => {
  it('uses native resize modes on a full-screen view for fit, fill and stretch', () => {
    expect(resolveVideoLayout('fit', screen, video, 3)).toEqual({
      resizeMode: 'contain',
      size: null,
    });
    expect(resolveVideoLayout('fill', screen, video, 3)).toEqual({
      resizeMode: 'cover',
      size: null,
    });
    expect(resolveVideoLayout('stretch', screen, video, 3)).toEqual({
      resizeMode: 'stretch',
      size: null,
    });
  });

  it('sizes the view to native pixels for crop once the size is known', () => {
    expect(resolveVideoLayout('crop', screen, video, 3)).toEqual({
      resizeMode: 'stretch',
      size: { width: 640, height: 360 },
    });
    expect(resolveVideoLayout('crop', screen, null, 3)).toEqual({
      resizeMode: 'contain',
      size: null,
    });
  });
});

describe('zoom', () => {
  const container = { width: 800, height: 400 };
  const frame = { width: 711.1, height: 400 };

  it('limits zoom to 1–4× and the pan to the picture edges', () => {
    expect(
      clampZoom({ scale: 9, offsetX: 0, offsetY: 0 }, frame, container),
    ).toMatchObject({ scale: 4 });
    const zoomed = clampZoom(
      { scale: 2, offsetX: 900, offsetY: 50 },
      frame,
      container,
    );
    expect(zoomed.offsetX).toBeCloseTo((711.1 * 2 - 800) / 2, 1);
    expect(zoomed.offsetY).toBe(50);
  });

  it('keeps a side centred while it still fits the screen', () => {
    const zoomed = clampZoom(
      { scale: 1.1, offsetX: 300, offsetY: 0 },
      { width: 400, height: 225 },
      container,
    );
    expect(zoomed.offsetX).toBe(0);
  });

  it('sizes and shifts the video view when zoomed in', () => {
    const layout = resolveVideoLayout(
      'fit',
      container,
      { width: 1920, height: 1080 },
      2,
      { scale: 2, offsetX: -40, offsetY: 0 },
    );
    expect(layout.resizeMode).toBe('stretch');
    expect(layout.size?.width).toBeCloseTo(1422.2, 0);
    expect(layout.offset).toEqual({ x: -40, y: 0 });
  });
});
