import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { recordProgress } from '../../history/watchHistory';
import type { VideoItem } from '../../library/types';
import type { PlaybackClock } from '../playbackClock';

const SAVE_INTERVAL_MS = 5000;

interface ProgressSource {
  loaded: boolean;
  paused: boolean;
  clock: PlaybackClock;
  getCurrentTime: () => number;
  getDuration: () => number;
  /** Whether the clock holds the real position yet (not just the planned start). */
  hasPosition: () => boolean;
}

/**
 * Saves the playback position to watch history: when the video loads, every few seconds
 * while it plays, whenever it pauses or ends, and when the player closes.
 */
export function usePlaybackProgress(
  video: VideoItem,
  playback: ProgressSource,
) {
  const latest = useLatestRef(playback);
  const { loaded, paused, clock } = playback;

  const save = useCallback(() => {
    const current = latest.current;
    if (current.hasPosition()) {
      recordProgress(video, current.getCurrentTime(), current.getDuration());
    }
  }, [latest, video]);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    save();
    if (paused) {
      return;
    }
    const timer = setInterval(save, SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loaded, paused, save]);

  // Timers stop in the background on Android, so the interval above doesn't run there. The
  // clock still moves (the media module reports progress), and saves follow it instead.
  useEffect(() => {
    let lastSavedAt = 0;
    return clock.subscribe(() => {
      const now = Date.now();
      if (
        AppState.currentState === 'background' &&
        now - lastSavedAt >= SAVE_INTERVAL_MS
      ) {
        lastSavedAt = now;
        save();
      }
    });
  }, [clock, save]);

  useEffect(() => save, [save]);
}
