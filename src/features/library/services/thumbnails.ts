import { Platform } from 'react-native';
import { getThumbnail, isNativeMediaAvailable } from 'zxplayer-media';

import {
  createTaskQueue,
  type QueuedTask,
} from '../../../shared/utils/taskQueue';
import type { VideoItem } from '../types';

/**
 * Long edge of generated thumbnails. A list thumbnail is ~400 px wide on a 3x screen, so
 * 512 stays sharp there and in grid cards, and matches the size Android keeps cached.
 */
const THUMBNAIL_MAX_EDGE = 512;
// System thumbnails come from MediaStore's cache, so several can load at once. Newest
// requests go first: they belong to the rows the user is looking at right now.
const MAX_CONCURRENT_THUMBNAILS = 4;

const queue = createTaskQueue(MAX_CONCURRENT_THUMBNAILS, { order: 'lifo' });
/** A null entry records that the item has no artwork (common for audio). */
const memoryCache = new Map<string, string | null>();

function cacheKey(item: VideoItem): string {
  // Including the modification time invalidates the on-disk thumbnail if the file changes.
  // The size is part of the name, so changing it never reuses smaller copies.
  return `zxplayer_${item.id}_${item.modifiedAtSec}_${THUMBNAIL_MAX_EDGE}`.replace(
    /[^\w-]/g,
    '_',
  );
}

/**
 * Thumbnail (or album art) URI when already known: a string, null when the item has no
 * artwork, or undefined when it still has to be requested.
 */
export function getCachedThumbnail(item: VideoItem): string | null | undefined {
  if (Platform.OS === 'ios') {
    // iOS renders `ph://` asset URIs directly via PhotoKit, which keeps its own cache.
    return item.kind === 'video' ? item.uri : null;
  }
  return memoryCache.get(cacheKey(item));
}

/** Fetches (or reuses the on-disk copy of) the system thumbnail for an Android item. */
export function requestThumbnail(item: VideoItem): QueuedTask<string | null> {
  const cached = getCachedThumbnail(item);
  if (cached !== undefined) {
    return { promise: Promise.resolve(cached), cancel: () => {} };
  }
  if (!isNativeMediaAvailable) {
    return {
      promise: Promise.reject(new Error('Thumbnails are unavailable')),
      cancel: () => {},
    };
  }

  const key = cacheKey(item);
  const task = queue.enqueue(() =>
    getThumbnail(item.uri, key, THUMBNAIL_MAX_EDGE),
  );

  return {
    promise: task.promise.then(uri => {
      memoryCache.set(key, uri);
      return uri;
    }),
    cancel: task.cancel,
  };
}

/** Test hook: thumbnails are cached for the app's lifetime otherwise. */
export function clearThumbnailMemoryCache(): void {
  memoryCache.clear();
}
