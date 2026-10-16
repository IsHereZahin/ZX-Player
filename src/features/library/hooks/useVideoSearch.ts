import { useCallback, useEffect, useMemo, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { loadVideoIndex } from '../services/videoIndex';
import type { VideoItem } from '../types';
import { filterVideos } from '../utils/sortVideos';

/** Searches every video in the library by file name. */
export function useVideoSearch(query: string) {
  const [index, setIndex] = useState<VideoItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    loadVideoIndex(attempt > 0).then(
      videos => {
        if (active) {
          setIndex(videos);
        }
      },
      error => {
        reportError('Loading the video index failed', error);
        if (active) {
          setFailed(true);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const results = useMemo(
    () => (index ? filterVideos(index, query) : []),
    [index, query],
  );
  const retry = useCallback(() => setAttempt(count => count + 1), []);

  return {
    results,
    loading: index === null && !failed,
    failed,
    retry,
    libraryCount: index?.length ?? 0,
  };
}
