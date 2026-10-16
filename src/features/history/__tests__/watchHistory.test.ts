import { makeVideo } from '../../../test/fixtures';
import {
  clearHistory,
  clearProgress,
  historyStore,
  isFinished,
  isInProgress,
  markWatched,
  MAX_HISTORY_ENTRIES,
  parseHistory,
  recordProgress,
  removeFromHistory,
  resumePosition,
  watchProgress,
} from '../watchHistory';

const video = makeVideo('1', { durationSec: 600 });

describe('recording progress', () => {
  it('stores the clamped position with a timestamp', () => {
    recordProgress(video, 900, 600, 1000);
    expect(historyStore.getState()['1']).toEqual({
      video,
      positionSec: 600,
      durationSec: 600,
      lastPlayedAt: 1000,
    });
  });

  it('ignores videos without a known duration', () => {
    recordProgress(video, 10, 0);
    expect(historyStore.getState()).toEqual({});
  });

  it('keeps only the most recent entries', () => {
    for (let i = 0; i <= MAX_HISTORY_ENTRIES; i += 1) {
      recordProgress(makeVideo(String(i)), 10, 100, i);
    }
    const ids = Object.keys(historyStore.getState());
    expect(ids).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(ids).not.toContain('0');
  });

  it('marks watched, clears progress, removes and clears entries', () => {
    markWatched(video);
    expect(isFinished(historyStore.getState()['1'])).toBe(true);

    clearProgress('1');
    expect(historyStore.getState()['1'].positionSec).toBe(0);

    removeFromHistory('1');
    expect(historyStore.getState()['1']).toBeUndefined();

    recordProgress(video, 30, 600);
    clearHistory();
    expect(historyStore.getState()).toEqual({});
  });
});

describe('resume rules', () => {
  const entry = (positionSec: number, durationSec = 600) => ({
    video,
    positionSec,
    durationSec,
    lastPlayedAt: 0,
  });

  it('resumes partly watched videos', () => {
    expect(resumePosition(entry(125))).toBe(125);
    expect(isInProgress(entry(125))).toBe(true);
    expect(watchProgress(entry(150))).toBeCloseTo(0.25);
  });

  it('starts over when barely started or essentially finished', () => {
    expect(resumePosition(entry(3))).toBeNull();
    expect(resumePosition(entry(595))).toBeNull();
    expect(resumePosition(entry(580))).toBeNull(); // past 95 %
    expect(resumePosition(undefined)).toBeNull();
  });

  it('treats the last seconds of short clips as finished', () => {
    expect(isFinished(entry(52, 60))).toBe(true);
    expect(isFinished(entry(40, 60))).toBe(false);
  });
});

describe('parseHistory', () => {
  it('keeps valid entries and drops malformed ones', () => {
    const valid = { video, positionSec: 30, durationSec: 600, lastPlayedAt: 5 };
    const parsed = parseHistory({
      '1': valid,
      '2': { ...valid, video: { ...video, id: '2', uri: 42 } },
      '3': { ...valid, video: makeVideo('3'), positionSec: 'x' },
      mismatched: valid,
    });
    expect(parsed).toEqual({ '1': valid });
  });

  it('returns an empty history for non-objects', () => {
    expect(parseHistory(null)).toEqual({});
    expect(parseHistory([1, 2])).toEqual({});
  });
});
