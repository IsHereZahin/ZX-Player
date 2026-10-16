import { useCallback, useEffect, useRef, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { fetchAllFolderMedia } from '../services/mediaLibrary';
import type { VideoFolder, VideoItem } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * All videos in a folder. The list renders as soon as the first page arrives and grows
 * while the rest loads; `complete` turns true once every page is in (sorting by anything
 * other than date is only exact from then on).
 */
export function useFolderVideos(folder: VideoFolder) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [complete, setComplete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const id = ++requestId.current;
      const isStale = () => id !== requestId.current;
      let received = false;
      setComplete(false);
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoadState('loading');
      }

      try {
        await fetchAllFolderMedia(
          folder,
          soFar => {
            if (isStale()) {
              return;
            }
            received = true;
            setVideos(soFar);
            setLoadState('ready');
            setRefreshing(false);
          },
          isStale,
        );
        if (!isStale()) {
          setComplete(true);
        }
      } catch (error) {
        reportError('Loading folder videos failed', error);
        if (isStale()) {
          return;
        }
        setRefreshing(false);
        // Keep whatever pages already loaded rather than hiding them behind an error.
        if (received) {
          setComplete(true);
        } else {
          setLoadState('error');
        }
      }
    },
    [folder],
  );

  useEffect(() => {
    load('initial');
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const reload = useCallback(() => load('initial'), [load]);
  const refresh = useCallback(() => load('refresh'), [load]);

  return { videos, loadState, complete, refreshing, reload, refresh };
}
