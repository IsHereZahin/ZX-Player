import type { VideoItem } from '../types';
import { ALL_VIDEOS_FOLDER, fetchAllFolderVideos } from './mediaLibrary';

let cached: Promise<VideoItem[]> | null = null;

/**
 * Every video in the library, loaded once per session and shared by search. A failed load
 * is not cached, so the next call retries.
 */
export function loadVideoIndex(forceRefresh = false): Promise<VideoItem[]> {
  if (!cached || forceRefresh) {
    cached = fetchAllFolderVideos(ALL_VIDEOS_FOLDER).catch(error => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

/** Test hook. */
export function resetVideoIndex(): void {
  cached = null;
}
