import { useCallback, useEffect, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { useStore } from '../../../shared/storage/store';
import { loadMediaIndex, mediaIndexVersion } from '../services/videoIndex';
import type { MediaScope, VideoItem } from '../types';

/** Every item of the scope (null while loading), reloaded when the library is rescanned. */
export function useMediaIndex(scope: MediaScope) {
  const version = useStore(mediaIndexVersion, value => value);
  const [items, setItems] = useState<VideoItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    loadMediaIndex(scope, attempt > 0).then(
      loaded => {
        if (active) {
          setItems(loaded);
        }
      },
      error => {
        reportError('Loading the media index failed', error);
        if (active) {
          setFailed(true);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, scope, version]);

  const retry = useCallback(() => setAttempt(count => count + 1), []);

  return { items, loading: items === null && !failed, failed, retry };
}
