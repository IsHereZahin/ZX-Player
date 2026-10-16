import { useCallback, useEffect } from 'react';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { recordProgress } from '../../history/watchHistory';
import type { VideoItem } from '../../library/types';

const SAVE_INTERVAL_MS = 5000;

interface ProgressSource {
  loaded: boolean;
  paused: boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
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
  const { loaded, paused } = playback;

  const save = useCallback(() => {
    const current = latest.current;
    if (current.loaded) {
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

  useEffect(() => save, [save]);
}
