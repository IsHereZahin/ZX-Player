import {
  AXIS_DECISION_DISTANCE,
  AXIS_DOMINANCE,
  computeLevel,
  computeSeekTarget,
  isAtSystemEdge,
  LEVEL_DRAG_FRACTION,
  resolveDoubleTapZone,
  resolvePanIntent,
  SEEK_SECONDS_PER_SCREEN_WIDTH,
  SYSTEM_EDGE_SIZE,
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

  it('waits while a short drag could still go either way', () => {
    expect(resolvePanIntent(100, 800, 12, 12)).toBeNull();
    expect(resolvePanIntent(700, 800, -10, 15)).toBeNull();
    expect(resolvePanIntent(100, 800, 0, 0)).toBeNull();
  });

  it('decides a drag that is clearly one way, or long enough to tell', () => {
    // A thumb's curve doesn't tip a short drag either way…
    expect(resolvePanIntent(100, 800, 10, 10 * AXIS_DOMINANCE)).toBe(
      'brightness',
    );
    expect(resolvePanIntent(700, 800, -10 * AXIS_DOMINANCE, 10)).toBe('seek');
    // …and past the decision distance the longer axis wins.
    expect(resolvePanIntent(100, 800, 20, 26)).toBe('brightness');
    expect(resolvePanIntent(700, 800, 26, -20)).toBe('seek');
    expect(Math.hypot(20, 26)).toBeGreaterThanOrEqual(AXIS_DECISION_DISTANCE);
  });
});

describe('isAtSystemEdge', () => {
  it('flags touches that start by the top or bottom edge', () => {
    expect(isAtSystemEdge(SYSTEM_EDGE_SIZE - 1, 400)).toBe(true);
    expect(isAtSystemEdge(400 - SYSTEM_EDGE_SIZE + 1, 400)).toBe(true);
    expect(isAtSystemEdge(SYSTEM_EDGE_SIZE, 400)).toBe(false);
    expect(isAtSystemEdge(200, 400)).toBe(false);
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
