import { useCallback, useEffect, useMemo, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { loadMediaIndex } from '../services/videoIndex';
import type { MediaScope, VideoItem } from '../types';
import { filterVideos } from '../utils/sortVideos';

/** Searches every item of the scope by title and file name. */
export function useVideoSearch(query: string, scope: MediaScope) {
  const [index, setIndex] = useState<VideoItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    loadMediaIndex(scope, attempt > 0).then(
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
  }, [attempt, scope]);

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
