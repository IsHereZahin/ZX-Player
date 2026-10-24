import { makeVideo, sampleSong } from '../../../test/fixtures';
import type { VideoItem } from '../../library/types';
import {
  DEFAULT_SETTINGS,
  settingsStore,
} from '../../settings/settingsStore';
import {
  clearHistory,
  clearProgress,
  folderStartIndex,
  historyStore,
  isFinished,
  isInProgress,
  markWatched,
  parseHistory,
  recordProgress,
  removeFromHistory,
  resumePosition,
  setHistoryLimit,
  watchProgress,
  type WatchHistory,
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
    const limit = DEFAULT_SETTINGS.historyLimit;
    for (let i = 0; i <= limit; i += 1) {
      recordProgress(makeVideo(String(i)), 10, 100, i);
    }
    const ids = Object.keys(historyStore.getState());
    expect(ids).toHaveLength(limit);
    expect(ids).not.toContain('0');
  });

  it('drops the oldest entries at once when the limit is lowered', () => {
    for (let i = 0; i < 80; i += 1) {
      recordProgress(makeVideo(String(i)), 10, 100, i);
    }
    setHistoryLimit(50);

    expect(settingsStore.getState().historyLimit).toBe(50);
    const ids = Object.keys(historyStore.getState());
    expect(ids).toHaveLength(50);
    expect(ids).toContain('79');
    expect(ids).not.toContain('29');

    // New entries keep to the new limit.
    recordProgress(makeVideo('new'), 10, 100, 100);
    expect(Object.keys(historyStore.getState())).toHaveLength(50);
    expect(historyStore.getState()['30']).toBeUndefined();
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

describe('folderStartIndex', () => {
  const folder = ['1', '2', '3', '4'].map(id =>
    makeVideo(id, { durationSec: 600 }),
  );
  const played = (
    id: string,
    positionSec: number,
    lastPlayedAt: number,
  ): WatchHistory => ({
    [id]: {
      video: makeVideo(id, { durationSec: 600 }),
      positionSec,
      durationSec: 600,
      lastPlayedAt,
    },
  });

  it('starts at the first item when nothing in the folder was played', () => {
    expect(folderStartIndex(folder, {})).toBe(0);
    expect(folderStartIndex(folder, played('elsewhere', 100, 9))).toBe(0);
  });

  it('returns to the most recently played item while it is unfinished', () => {
    const history = { ...played('1', 600, 1), ...played('3', 120, 2) };
    expect(folderStartIndex(folder, history)).toBe(2);
  });

  it('moves on to the next item once the last one played is finished', () => {
    const history = { ...played('3', 120, 1), ...played('2', 600, 2) };
    expect(folderStartIndex(folder, history)).toBe(2);
  });

  it('starts over after the last item is finished', () => {
    expect(folderStartIndex(folder, played('4', 600, 1))).toBe(0);
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

  it('reads entries saved before audio support as videos', () => {
    const legacyVideo: Partial<VideoItem> = makeVideo('4');
    delete legacyVideo.kind;
    const parsed = parseHistory({
      '4': {
        video: legacyVideo,
        positionSec: 1,
        durationSec: 9,
        lastPlayedAt: 1,
      },
    });
    expect(parsed['4'].video.kind).toBe('video');
  });

  it('keeps audio tags', () => {
    const parsed = parseHistory({
      [sampleSong.id]: {
        video: sampleSong,
        positionSec: 10,
        durationSec: 214,
        lastPlayedAt: 1,
      },
    });
    expect(parsed[sampleSong.id].video).toEqual(sampleSong);
  });

  it('returns an empty history for non-objects', () => {
    expect(parseHistory(null)).toEqual({});
    expect(parseHistory([1, 2])).toEqual({});
  });
});
