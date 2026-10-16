import { Platform } from 'react-native';
import { getThumbnail, isNativeMediaAvailable } from 'zxplayer-media';

import {
  createTaskQueue,
  type QueuedTask,
} from '../../../shared/utils/taskQueue';
import type { VideoItem } from '../types';

const THUMBNAIL_MAX_EDGE = 320;
// System thumbnails come from MediaStore's cache, so several can load at once. Newest
// requests go first: they belong to the rows the user is looking at right now.
const MAX_CONCURRENT_THUMBNAILS = 4;

const queue = createTaskQueue(MAX_CONCURRENT_THUMBNAILS, { order: 'lifo' });
const memoryCache = new Map<string, string>();

function cacheKey(video: VideoItem): string {
  // Including the modification time invalidates the on-disk thumbnail if the file changes.
  return `zxplayer_${video.id}_${video.modifiedAtSec}`.replace(/[^\w-]/g, '_');
}

/** Returns a thumbnail URI immediately when one is already available. */
export function getCachedThumbnail(video: VideoItem): string | null {
  // iOS renders `ph://` asset URIs directly via PhotoKit, which keeps its own thumbnail cache.
  if (Platform.OS === 'ios') {
    return video.uri;
  }
  return memoryCache.get(cacheKey(video)) ?? null;
}

/** Fetches (or reuses the on-disk copy of) the system thumbnail for an Android video. */
export function requestThumbnail(video: VideoItem): QueuedTask<string> {
  const cached = getCachedThumbnail(video);
  if (cached) {
    return { promise: Promise.resolve(cached), cancel: () => {} };
  }
  if (!isNativeMediaAvailable) {
    return {
      promise: Promise.reject(new Error('Video thumbnails are unavailable')),
      cancel: () => {},
    };
  }

  const key = cacheKey(video);
  const task = queue.enqueue(() =>
    getThumbnail(video.id, key, THUMBNAIL_MAX_EDGE),
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
