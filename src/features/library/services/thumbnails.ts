import { Platform } from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';

import {
  createTaskQueue,
  type QueuedTask,
} from '../../../shared/utils/taskQueue';
import type { VideoItem } from '../types';

const THUMBNAIL_MAX_EDGE = 320;
const PREFERRED_FRAME_MS = 1000;
// Frame extraction is serialised natively anyway; a small window keeps visible rows first.
const MAX_CONCURRENT_EXTRACTIONS = 2;

const queue = createTaskQueue(MAX_CONCURRENT_EXTRACTIONS);
const memoryCache = new Map<string, string>();

function cacheKey(video: VideoItem): string {
  // Including the modification time invalidates the on-disk thumbnail if the file changes.
  return `playz_${video.id}_${video.modifiedAtSec}`.replace(/[^\w-]/g, '_');
}

/** Returns a thumbnail URI immediately when one is already available. */
export function getCachedThumbnail(video: VideoItem): string | null {
  // iOS renders `ph://` asset URIs directly via PhotoKit, which keeps its own thumbnail cache.
  if (Platform.OS === 'ios') {
    return video.uri;
  }
  return memoryCache.get(cacheKey(video)) ?? null;
}

/** Extracts (or reuses the on-disk copy of) a JPEG frame for an Android video. */
export function requestThumbnail(video: VideoItem): QueuedTask<string> {
  const cached = getCachedThumbnail(video);
  if (cached) {
    return { promise: Promise.resolve(cached), cancel: () => {} };
  }

  const key = cacheKey(video);
  const durationMs = video.durationSec * 1000;
  const timeStamp =
    durationMs > 0
      ? Math.min(PREFERRED_FRAME_MS, Math.floor(durationMs / 2))
      : 0;

  const task = queue.enqueue(() =>
    createThumbnail({
      url: video.uri,
      timeStamp,
      format: 'jpeg',
      cacheName: key,
      maxWidth: THUMBNAIL_MAX_EDGE,
      maxHeight: THUMBNAIL_MAX_EDGE,
    }),
  );

  return {
    promise: task.promise.then(({ path }) => {
      memoryCache.set(key, path);
      return path;
    }),
    cancel: task.cancel,
  };
}

/** Test hook: thumbnails are cached for the app's lifetime otherwise. */
export function clearThumbnailMemoryCache(): void {
  memoryCache.clear();
}
