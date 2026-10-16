import { useMemo } from 'react';

import {
  createPersistentStore,
  isRecord,
} from '../../shared/storage/persistentStore';
import { useStore } from '../../shared/storage/store';
import { isNumber, parseMediaItem } from './mediaItemParsing';
import type { MediaKind, VideoItem } from './types';

export interface FavoriteEntry {
  /** Snapshot, so favorites show without rescanning the library. */
  item: VideoItem;
  addedAt: number;
}

export type Favorites = Readonly<Record<string, FavoriteEntry>>;

export const MAX_FAVORITES = 1000;

/** Keeps only well-formed entries from stored favorites. */
export function parseFavorites(raw: unknown): Favorites {
  if (!isRecord(raw)) {
    return {};
  }
  const favorites: Record<string, FavoriteEntry> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value) || !isNumber(value.addedAt)) {
      continue;
    }
    const item = parseMediaItem(value.item);
    if (item && item.id === id) {
      favorites[id] = { item, addedAt: value.addedAt };
    }
  }
  return favorites;
}

export const favoritesStore = createPersistentStore<Favorites>({
  key: 'zxplayer.favorites.v1',
  initial: {},
  parse: parseFavorites,
});

export function setFavorite(
  item: VideoItem,
  favorite: boolean,
  now: number = Date.now(),
): void {
  favoritesStore.setState(previous => {
    if (!favorite) {
      if (!(item.id in previous)) {
        return previous;
      }
      const rest = { ...previous };
      delete rest[item.id];
      return rest;
    }
    const next = { ...previous, [item.id]: { item, addedAt: now } };
    const ids = Object.keys(next);
    if (ids.length <= MAX_FAVORITES) {
      return next;
    }
    // Over the cap, the oldest favorite gives way.
    const keep = ids
      .sort((a, b) => next[b].addedAt - next[a].addedAt)
      .slice(0, MAX_FAVORITES);
    return Object.fromEntries(keep.map(id => [id, next[id]]));
  });
}

export function toggleFavorite(item: VideoItem): void {
  setFavorite(item, !(item.id in favoritesStore.getState()));
}

export function useIsFavorite(id: string): boolean {
  return useStore(favoritesStore, favorites => id in favorites);
}

/** Favorites of the given kinds, most recently added first. */
export function useFavoriteList(kinds: readonly MediaKind[]): VideoItem[] {
  const favorites = useStore(favoritesStore, state => state);
  return useMemo(
    () =>
      Object.values(favorites)
        .filter(entry => kinds.includes(entry.item.kind))
        .sort((a, b) => b.addedAt - a.addedAt)
        .map(entry => entry.item),
    [favorites, kinds],
  );
}
