import { useMemo } from 'react';

import type { MediaScope } from '../types';
import { filterVideos } from '../utils/sortVideos';
import { useMediaIndex } from './useMediaIndex';

/** Searches every item of the scope by title and file name. */
export function useVideoSearch(query: string, scope: MediaScope) {
  const { items, loading, failed, retry } = useMediaIndex(scope);
  const results = useMemo(
    () => (items ? filterVideos(items, query) : []),
    [items, query],
  );
  return { results, loading, failed, retry, libraryCount: items?.length ?? 0 };
}
