import { createStore } from '../../../shared/storage/store';
import type { MediaScope, VideoItem } from '../types';
import { allMediaFolder, fetchAllFolderMedia } from './mediaLibrary';

const cache = new Map<MediaScope, Promise<VideoItem[]>>();

/** Bumped when the library is rescanned, so every screen using the index reloads it. */
export const mediaIndexVersion = createStore(0);

/**
 * Every item of a scope, loaded once per session and shared by search, Recently Added
 * and the library shelves. A failed load is not cached, so the next call retries.
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

/** Forgets the loaded indexes (e.g. after pull-to-refresh) and tells users to reload. */
export function invalidateMediaIndex(): void {
  cache.clear();
  mediaIndexVersion.setState(version => version + 1);
}

/** Test hook. */
export function resetVideoIndex(): void {
  cache.clear();
}
