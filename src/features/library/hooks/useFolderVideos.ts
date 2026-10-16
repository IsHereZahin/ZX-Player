import { useCallback, useEffect, useRef, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { fetchFolderVideos } from '../services/mediaLibrary';
import type { VideoFolder, VideoItem } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

/** Paginated list of the videos in a folder. */
export function useFolderVideos(folder: VideoFolder) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursor = useRef<string | null>(null);
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadFirstPage = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const id = ++requestId.current;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoadState('loading');
      }
      try {
        const page = await fetchFolderVideos(folder);
        if (id !== requestId.current) {
          return;
        }
        nextCursor.current = page.nextCursor;
        setVideos(page.videos);
        setLoadState('ready');
      } catch (error) {
        reportError('Loading folder videos failed', error);
        if (id === requestId.current) {
          setLoadState('error');
        }
      } finally {
        if (id === requestId.current) {
          setRefreshing(false);
        }
      }
    },
    [folder],
  );

  const loadMore = useCallback(async () => {
    const cursor = nextCursor.current;
    if (!cursor || loadingMoreRef.current) {
      return;
    }
    const id = requestId.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchFolderVideos(folder, cursor);
      if (id !== requestId.current) {
        return;
      }
      nextCursor.current = page.nextCursor;
      setVideos(current => {
        // Guard against overlapping pages if the library changed between requests.
        const seen = new Set(current.map(video => video.id));
        return [
          ...current,
          ...page.videos.filter(video => !seen.has(video.id)),
        ];
      });
    } catch (error) {
      // The current page stays usable; the next scroll to the end retries.
      reportError('Loading more videos failed', error);
    } finally {
      if (id === requestId.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [folder]);

  useEffect(() => {
    loadFirstPage('initial');
    return () => {
      requestId.current += 1;
    };
  }, [loadFirstPage]);

  const reload = useCallback(() => loadFirstPage('initial'), [loadFirstPage]);
  const refresh = useCallback(() => loadFirstPage('refresh'), [loadFirstPage]);

  return {
    videos,
    loadState,
    refreshing,
    loadingMore,
    loadMore,
    reload,
    refresh,
  };
}
