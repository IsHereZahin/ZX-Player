import { useCallback, useEffect, useRef, useState } from 'react';

import { reportError } from '../../../shared/logger';
import {
  fetchAllFolderMedia,
  isAllMediaFolder,
} from '../services/mediaLibrary';
import { loadMediaIndex, peekMediaIndex } from '../services/videoIndex';
import type { VideoFolder, VideoItem } from '../types';
import { useLibraryChanges } from './useLibraryChanges';

type LoadState = 'loading' | 'ready' | 'error';

/** What an "All …" folder can show straight away: the index, if it is already loaded. */
function itemsAtHand(folder: VideoFolder): VideoItem[] | undefined {
  return isAllMediaFolder(folder) ? peekMediaIndex(folder.scope) : undefined;
}

/**
 * All videos in a folder. The list renders as soon as the first page arrives and grows
 * while the rest loads; `complete` turns true once every page is in (sorting by anything
 * other than date is only exact from then on). An "All …" folder reads the shared media
 * index, so after its first load it opens at once.
 */
export function useFolderVideos(folder: VideoFolder) {
  const [atHand] = useState(() => itemsAtHand(folder));
  const [videos, setVideos] = useState<VideoItem[]>(atHand ?? []);
  const [loadState, setLoadState] = useState<LoadState>(
    atHand ? 'ready' : 'loading',
  );
  const [complete, setComplete] = useState(atHand !== undefined);
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
      const onPage = quiet
        ? undefined
        : (soFar: VideoItem[]) => {
            if (isStale()) {
              return;
            }
            received = true;
            setVideos(soFar);
            setLoadState('ready');
            setRefreshing(false);
          };

      try {
        const all = isAllMediaFolder(folder)
          ? await loadMediaIndex(folder.scope, mode === 'refresh', onPage)
          : await fetchAllFolderMedia(folder, onPage, isStale);
        if (!isStale()) {
          setVideos(all);
          setLoadState('ready');
          setRefreshing(false);
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
    // Already on screen from the index: only check it is current, without a skeleton.
    load(itemsAtHand(folder) ? 'quiet' : 'initial');
    return () => {
      requestId.current += 1;
    };
  }, [folder, load]);

  useLibraryChanges(() => load('quiet'));

  const reload = useCallback(() => load('initial'), [load]);
  const refresh = useCallback(() => load('refresh'), [load]);

  return { videos, loadState, complete, refreshing, reload, refresh };
}
