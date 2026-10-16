import {
  computeLevel,
  computeSeekTarget,
  LEVEL_DRAG_FRACTION,
  resolveDoubleTapZone,
  resolvePanIntent,
  SEEK_SECONDS_PER_SCREEN_WIDTH,
} from '../gestureMath';

describe('resolvePanIntent', () => {
  it('treats mostly-horizontal drags as seeking anywhere on screen', () => {
    expect(resolvePanIntent(50, 800, 40, 10)).toBe('seek');
    expect(resolvePanIntent(700, 800, -40, 10)).toBe('seek');
  });

  it('maps vertical drags to brightness on the left and volume on the right', () => {
    expect(resolvePanIntent(100, 800, 5, -60)).toBe('brightness');
    expect(resolvePanIntent(399, 800, 0, 60)).toBe('brightness');
    expect(resolvePanIntent(400, 800, 0, 60)).toBe('volume');
    expect(resolvePanIntent(790, 800, 2, -20)).toBe('volume');
  });
});

describe('computeSeekTarget', () => {
  it('maps a full-width drag to the seek range', () => {
    expect(computeSeekTarget(100, 800, 800, 3600)).toBe(
      100 + SEEK_SECONDS_PER_SCREEN_WIDTH,
    );
    expect(computeSeekTarget(100, -400, 800, 3600)).toBe(
      100 - SEEK_SECONDS_PER_SCREEN_WIDTH / 2,
    );
  });

  it('scales the range down for short videos', () => {
    expect(computeSeekTarget(0, 400, 800, 30)).toBe(15);
  });

  it('clamps to the video bounds', () => {
    expect(computeSeekTarget(10, -800, 800, 3600)).toBe(0);
    expect(computeSeekTarget(3590, 800, 800, 3600)).toBe(3600);
  });

  it('is a no-op when layout or duration is unknown', () => {
    expect(computeSeekTarget(5, 300, 0, 100)).toBe(5);
    expect(computeSeekTarget(5, 300, 800, 0)).toBe(0);
  });
});

describe('computeLevel', () => {
  it('raises the level when dragging up and lowers it when dragging down', () => {
    const height = 400;
    const fullSweep = height * LEVEL_DRAG_FRACTION;
    expect(computeLevel(0.5, -fullSweep / 2, height)).toBeCloseTo(1);
    expect(computeLevel(0.5, fullSweep / 4, height)).toBeCloseTo(0.25);
  });

  it('clamps to 0–1', () => {
    expect(computeLevel(0.9, -1000, 400)).toBe(1);
    expect(computeLevel(0.1, 1000, 400)).toBe(0);
    expect(computeLevel(1.5, 0, 0)).toBe(1);
  });
});

describe('resolveDoubleTapZone', () => {
  it('splits the screen into rewind / toggle / forward zones', () => {
    expect(resolveDoubleTapZone(50, 1000)).toBe('rewind');
    expect(resolveDoubleTapZone(500, 1000)).toBe('toggle');
    expect(resolveDoubleTapZone(900, 1000)).toBe('forward');
  });
});
