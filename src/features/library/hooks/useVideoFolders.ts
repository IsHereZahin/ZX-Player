import { useCallback, useEffect, useRef, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { fetchVideoFolders } from '../services/mediaLibrary';
import type { VideoFolder } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

export function useVideoFolders() {
  const [folders, setFolders] = useState<VideoFolder[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    const id = ++requestId.current;
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoadState('loading');
    }
    try {
      const result = await fetchVideoFolders();
      if (id === requestId.current) {
        setFolders(result);
        setLoadState('ready');
      }
    } catch (error) {
      reportError('Loading video folders failed', error);
      if (id === requestId.current) {
        setLoadState('error');
      }
    } finally {
      if (id === requestId.current) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load('initial');
    return () => {
      // Invalidate in-flight work so it cannot update an unmounted component.
      requestId.current += 1;
    };
  }, [load]);

  const reload = useCallback(() => load('initial'), [load]);
  const refresh = useCallback(() => load('refresh'), [load]);

  return { folders, loadState, refreshing, reload, refresh };
}
