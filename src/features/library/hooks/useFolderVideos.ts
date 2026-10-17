import { useCallback, useEffect, useRef, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { fetchAllFolderMedia } from '../services/mediaLibrary';
import type { VideoFolder, VideoItem } from '../types';
import { useLibraryChanges } from './useLibraryChanges';

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
    // `quiet` reloads in place after a change: the list swaps once, with no spinner.
    async (mode: 'initial' | 'refresh' | 'quiet') => {
      const id = ++requestId.current;
      const isStale = () => id !== requestId.current;
      const quiet = mode === 'quiet';
      let received = false;
      if (mode === 'refresh') {
        setRefreshing(true);
      } else if (mode === 'initial') {
        setLoadState('loading');
      }
      if (!quiet) {
        setComplete(false);
      }

      try {
        const all = await fetchAllFolderMedia(
          folder,
          quiet
            ? undefined
            : soFar => {
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
          if (quiet) {
            setVideos(all);
            setLoadState('ready');
          }
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

  useLibraryChanges(() => load('quiet'));

  const reload = useCallback(() => load('initial'), [load]);
  const refresh = useCallback(() => load('refresh'), [load]);

  return { videos, loadState, complete, refreshing, reload, refresh };
}
