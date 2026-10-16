import type { SortDirection, SortKey } from '../libraryPrefs';
import type { VideoItem } from '../types';

export interface SortOption {
  key: SortKey;
  direction: SortDirection;
  label: string;
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { key: 'date', direction: 'desc', label: 'Newest first' },
  { key: 'date', direction: 'asc', label: 'Oldest first' },
  { key: 'name', direction: 'asc', label: 'Name (A–Z)' },
  { key: 'name', direction: 'desc', label: 'Name (Z–A)' },
  { key: 'duration', direction: 'desc', label: 'Longest first' },
  { key: 'duration', direction: 'asc', label: 'Shortest first' },
  { key: 'size', direction: 'desc', label: 'Largest first' },
  { key: 'size', direction: 'asc', label: 'Smallest first' },
];

// Numeric collation sorts "Episode 2" before "Episode 10".
const nameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/** The name shown in lists: an audio file's tag title when it has one. */
const sortName = (item: VideoItem) => item.title || item.fileName;

function compareBy(key: SortKey, a: VideoItem, b: VideoItem): number {
  switch (key) {
    case 'name':
      return nameCollator.compare(sortName(a), sortName(b));
    case 'duration':
      return a.durationSec - b.durationSec;
    case 'size':
      return (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
    case 'date':
      return a.modifiedAtSec - b.modifiedAtSec;
  }
}

/** Returns a sorted copy; ties fall back to name order so the result is stable. */
export function sortVideos(
  videos: readonly VideoItem[],
  key: SortKey,
  direction: SortDirection,
): VideoItem[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...videos].sort(
    (a, b) =>
      factor * compareBy(key, a, b) ||
      nameCollator.compare(sortName(a), sortName(b)),
  );
}

/** Case-insensitive match on every word of the query, in any order. */
export function filterVideos(
  videos: readonly VideoItem[],
  query: string,
): VideoItem[] {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  return videos.filter(video => {
    // Audio also matches on its tags (title, artist, album).
    const haystack = [video.fileName, video.title, video.artist, video.album]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return words.every(word => haystack.includes(word));
  });
}
