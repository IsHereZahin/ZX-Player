import { useMemo } from 'react';

import {
  createPersistentStore,
  isRecord,
} from '../../shared/storage/persistentStore';
import { useStore } from '../../shared/storage/store';
import { clamp } from '../../shared/utils/math';
import { isNumber, parseMediaItem } from '../library/mediaItemParsing';
import type { VideoItem } from '../library/types';
import {
  settingsStore,
  updateSettings,
  type HistoryLimit,
} from '../settings/settingsStore';

export interface WatchEntry {
  /** Snapshot of the video, so history can be shown without rescanning the library. */
  video: VideoItem;
  positionSec: number;
  durationSec: number;
  lastPlayedAt: number;
}

export type WatchHistory = Readonly<Record<string, WatchEntry>>;

/** Below this position a video starts from the beginning instead of resuming. */
export const RESUME_MIN_SECONDS = 5;
/** Within this many seconds of the end a video counts as watched. */
const FINISHED_TAIL_SECONDS = 10;

export function isFinished(entry: WatchEntry): boolean {
  return (
    entry.durationSec > 0 &&
    (entry.positionSec >= entry.durationSec * 0.95 ||
      entry.durationSec - entry.positionSec <= FINISHED_TAIL_SECONDS)
  );
}

export function watchProgress(entry: WatchEntry | undefined): number {
  if (!entry || entry.durationSec <= 0) {
    return 0;
  }
  return clamp(entry.positionSec / entry.durationSec, 0, 1);
}

/** Position to resume from, or null when the video should start from the beginning. */
export function resumePosition(entry: WatchEntry | undefined): number | null {
  if (!entry || isFinished(entry) || entry.positionSec < RESUME_MIN_SECONDS) {
    return null;
  }
  return entry.positionSec;
}

export function isInProgress(entry: WatchEntry): boolean {
  return resumePosition(entry) !== null;
}

/**
 * Where playing a whole folder starts: at its most recently played item while that is
 * unfinished (the player then resumes its position), at the next one once it is finished
 * (back to the first after the last), and at the first when nothing in it was played.
 */
export function folderStartIndex(
  items: readonly VideoItem[],
  history: WatchHistory,
): number {
  let latest = -1;
  let latestAt = -Infinity;
  items.forEach((item, index) => {
    const playedAt = history[item.id]?.lastPlayedAt;
    if (playedAt !== undefined && playedAt > latestAt) {
      latest = index;
      latestAt = playedAt;
    }
  });
  if (latest === -1) {
    return 0;
  }
  return isFinished(history[items[latest].id])
    ? (latest + 1) % items.length
    : latest;
}

/** Keeps only well-formed entries from stored history. */
export function parseHistory(raw: unknown): WatchHistory {
  if (!isRecord(raw)) {
    return {};
  }
  const history: Record<string, WatchEntry> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value)) {
      continue;
    }
    const video = parseMediaItem(value.video);
    if (
      video &&
      video.id === id &&
      isNumber(value.positionSec) &&
      isNumber(value.durationSec) &&
      isNumber(value.lastPlayedAt)
    ) {
      history[id] = {
        video,
        positionSec: Math.max(0, value.positionSec),
        durationSec: Math.max(0, value.durationSec),
        lastPlayedAt: value.lastPlayedAt,
      };
    }
  }
  return history;
}

/** Keeps the `limit` most recently played entries. */
function prune(history: WatchHistory, limit: number): WatchHistory {
  const ids = Object.keys(history);
  if (ids.length <= limit) {
    return history;
  }
  const keep = ids
    .sort((a, b) => history[b].lastPlayedAt - history[a].lastPlayedAt)
    .slice(0, limit);
  return Object.fromEntries(keep.map(id => [id, history[id]]));
}

export const historyStore = createPersistentStore<WatchHistory>({
  key: 'zxplayer.history.v1',
  initial: {},
  parse: parseHistory,
  writeDelayMs: 1500,
});

export function recordProgress(
  video: VideoItem,
  positionSec: number,
  durationSec: number,
  now: number = Date.now(),
): void {
  if (!(durationSec > 0) || !Number.isFinite(positionSec)) {
    return;
  }
  historyStore.setState(previous =>
    prune(
      {
        ...previous,
        [video.id]: {
          video,
          positionSec: clamp(positionSec, 0, durationSec),
          durationSec,
          lastPlayedAt: now,
        },
      },
      settingsStore.getState().historyLimit,
    ),
  );
}

/** Changes how many videos history keeps; entries past a lower limit go at once. */
export function setHistoryLimit(limit: HistoryLimit): void {
  updateSettings({ historyLimit: limit });
  historyStore.setState(previous => prune(previous, limit));
}

export function markWatched(
  video: VideoItem,
  durationSec = video.durationSec,
): void {
  recordProgress(video, durationSec, Math.max(durationSec, 1));
}

/** Keeps the video in history but forgets where it stopped. */
export function clearProgress(id: string): void {
  historyStore.setState(previous => {
    const entry = previous[id];
    return entry
      ? { ...previous, [id]: { ...entry, positionSec: 0 } }
      : previous;
  });
}

export function removeFromHistory(id: string): void {
  historyStore.setState(previous => {
    if (!(id in previous)) {
      return previous;
    }
    const next = { ...previous };
    delete next[id];
    return next;
  });
}

export function clearHistory(): void {
  historyStore.setState({});
}

export function useWatchEntry(id: string): WatchEntry | undefined {
  return useStore(historyStore, history => history[id]);
}

/** History entries, most recently played first. */
export function useHistoryList(): WatchEntry[] {
  const history = useStore(historyStore, state => state);
  return useMemo(
    () =>
      Object.values(history).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt),
    [history],
  );
}

/** Id of the most recently played video, used to highlight it in lists. */
export function useLastPlayedId(): string | null {
  const history = useStore(historyStore, state => state);
  return useMemo(() => {
    let latest: WatchEntry | null = null;
    for (const entry of Object.values(history)) {
      if (!latest || entry.lastPlayedAt > latest.lastPlayedAt) {
        latest = entry;
      }
    }
    return latest?.video.id ?? null;
  }, [history]);
}
