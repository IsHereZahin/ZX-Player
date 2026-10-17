import { createStore } from '../../../shared/storage/store';
import type { MediaScope, VideoItem } from '../types';
import { allMediaFolder, fetchAllFolderMedia } from './mediaLibrary';

const cache = new Map<MediaScope, Promise<VideoItem[]>>();
/** Indexes that finished loading, so a screen can show one on its first render. */
const loaded = new Map<MediaScope, VideoItem[]>();

/** Bumped when the library is rescanned, so every screen using the index reloads it. */
export const mediaIndexVersion = createStore(0);

/**
 * Every item of a scope, loaded once per session and shared by the "All …" folder, search,
 * Recently Added and the library shelves. A failed load is not cached, so the next call
 * retries. `onPage` hears about each page only when this call starts the load; a call that
 * joins a load already under way just waits for it.
 */
export function loadMediaIndex(
  scope: MediaScope,
  forceRefresh = false,
  onPage?: (itemsSoFar: VideoItem[]) => void,
): Promise<VideoItem[]> {
  const pending = cache.get(scope);
  if (pending && !forceRefresh) {
    return pending;
  }
  const request: Promise<VideoItem[]> = fetchAllFolderMedia(
    allMediaFolder(scope),
    onPage,
  ).then(
    items => {
      // A newer load (or an invalidation) may have replaced this one meanwhile.
      if (cache.get(scope) === request) {
        loaded.set(scope, items);
      }
      return items;
    },
    error => {
      if (cache.get(scope) === request) {
        cache.delete(scope);
      }
      throw error;
    },
  );
  cache.set(scope, request);
  return request;
}

/** The index of a scope if it has finished loading this session, else undefined. */
export function peekMediaIndex(scope: MediaScope): VideoItem[] | undefined {
  return loaded.get(scope);
}

/**
 * Forgets the loaded indexes and tells every list to reload (see useLibraryChanges): after
 * pull-to-refresh, or when files are deleted, restored, moved or copied.
 */
export function invalidateMediaIndex(): void {
  cache.clear();
  loaded.clear();
  mediaIndexVersion.setState(version => version + 1);
}

/** Test hook. */
export function resetVideoIndex(): void {
  cache.clear();
  loaded.clear();
}
