import type { WatchEntry } from '../history/watchHistory';
import type { VideoItem } from './types';

const DAY_SEC = 24 * 60 * 60;
/** Unplayed items added within this many days are marked as new. */
export const NEW_FOR_DAYS = 7;
/** Recently Added lists what arrived in this many days. */
export const RECENTLY_ADDED_DAYS = 30;
export const RECENTLY_ADDED_LIMIT = 200;

const nowSec = () => Date.now() / 1000;

/** When an item arrived; items saved by older versions fall back to their last change. */
export function addedAt(item: VideoItem): number {
  return item.addedAtSec || item.modifiedAtSec;
}

/** New: arrived in the last week and never played (like the unplayed dot in Podcasts). */
export function isNewItem(
  item: VideoItem,
  entry: WatchEntry | undefined,
  now: number = nowSec(),
): boolean {
  return !entry && now - addedAt(item) <= NEW_FOR_DAYS * DAY_SEC;
}

/** Items added in the last month, newest first. */
export function selectRecentlyAdded(
  items: readonly VideoItem[],
  now: number = nowSec(),
): VideoItem[] {
  return items
    .filter(item => now - addedAt(item) <= RECENTLY_ADDED_DAYS * DAY_SEC)
    .sort((a, b) => addedAt(b) - addedAt(a))
    .slice(0, RECENTLY_ADDED_LIMIT);
}
