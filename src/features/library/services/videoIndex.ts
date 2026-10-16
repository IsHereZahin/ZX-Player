import type { MediaScope, VideoItem } from '../types';
import { allMediaFolder, fetchAllFolderMedia } from './mediaLibrary';

const cache = new Map<MediaScope, Promise<VideoItem[]>>();

/**
 * Every item of a scope, loaded once per session and shared by search. A failed load is
 * not cached, so the next call retries.
 */
export function loadMediaIndex(
  scope: MediaScope,
  forceRefresh = false,
): Promise<VideoItem[]> {
  let index = cache.get(scope);
  if (!index || forceRefresh) {
    index = fetchAllFolderMedia(allMediaFolder(scope)).catch(error => {
      cache.delete(scope);
      throw error;
    });
    cache.set(scope, index);
  }
  return index;
}

/** Test hook. */
export function resetVideoIndex(): void {
  cache.clear();
}
