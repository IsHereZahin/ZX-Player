import { useMemo } from 'react';

import {
  createPersistentStore,
  isRecord,
} from '../../shared/storage/persistentStore';
import { useStore } from '../../shared/storage/store';
import { isNumber, parseMediaItem } from './mediaItemParsing';
import type { VideoItem } from './types';

export interface Playlist {
  id: string;
  name: string;
  /** Snapshots, in play order; videos and audio can be mixed. */
  items: VideoItem[];
  createdAt: number;
  updatedAt: number;
}

export const MAX_PLAYLISTS = 100;
export const MAX_PLAYLIST_ITEMS = 2000;
export const MAX_PLAYLIST_NAME = 60;

/** Trimmed, length-limited name; empty when there's nothing usable. */
export function cleanPlaylistName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_PLAYLIST_NAME);
}

function parsePlaylist(raw: unknown): Playlist | null {
  if (
    !isRecord(raw) ||
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    !Array.isArray(raw.items) ||
    !isNumber(raw.createdAt) ||
    !isNumber(raw.updatedAt)
  ) {
    return null;
  }
  const name = cleanPlaylistName(raw.name);
  if (!name) {
    return null;
  }
  const items = raw.items
    .map(parseMediaItem)
    .filter((item): item is VideoItem => item !== null)
    .slice(0, MAX_PLAYLIST_ITEMS);
  return {
    id: raw.id,
    name,
    items,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** Keeps only well-formed playlists (and items) from storage. */
export function parsePlaylists(raw: unknown): Playlist[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(parsePlaylist)
    .filter((playlist): playlist is Playlist => playlist !== null)
    .slice(0, MAX_PLAYLISTS);
}

export const playlistsStore = createPersistentStore<Playlist[]>({
  key: 'zxplayer.playlists.v1',
  initial: [],
  parse: parsePlaylists,
});

let idCounter = 0;
function newPlaylistId(now: number): string {
  idCounter += 1;
  return `pl-${now.toString(36)}-${idCounter}`;
}

function updatePlaylist(
  id: string,
  change: (playlist: Playlist) => Playlist,
): void {
  playlistsStore.setState(playlists =>
    playlists.map(playlist =>
      playlist.id === id ? change(playlist) : playlist,
    ),
  );
}

/** Creates a playlist (optionally with first items) and returns its id, or null when full. */
export function createPlaylist(
  name: string,
  items: VideoItem[] = [],
  now: number = Date.now(),
): string | null {
  const cleanName = cleanPlaylistName(name);
  if (!cleanName || playlistsStore.getState().length >= MAX_PLAYLISTS) {
    return null;
  }
  const id = newPlaylistId(now);
  playlistsStore.setState(playlists => [
    ...playlists,
    {
      id,
      name: cleanName,
      items: items.slice(0, MAX_PLAYLIST_ITEMS),
      createdAt: now,
      updatedAt: now,
    },
  ]);
  return id;
}

export function renamePlaylist(
  id: string,
  name: string,
  now: number = Date.now(),
): void {
  const cleanName = cleanPlaylistName(name);
  if (cleanName) {
    updatePlaylist(id, playlist => ({
      ...playlist,
      name: cleanName,
      updatedAt: now,
    }));
  }
}

export function deletePlaylist(id: string): void {
  playlistsStore.setState(playlists =>
    playlists.filter(playlist => playlist.id !== id),
  );
}

/** Appends items that aren't in the playlist yet. */
export function addToPlaylist(
  id: string,
  items: VideoItem[],
  now: number = Date.now(),
): void {
  updatePlaylist(id, playlist => {
    const present = new Set(playlist.items.map(item => item.id));
    const fresh = items.filter(item => !present.has(item.id));
    if (fresh.length === 0) {
      return playlist;
    }
    return {
      ...playlist,
      items: [...playlist.items, ...fresh].slice(0, MAX_PLAYLIST_ITEMS),
      updatedAt: now,
    };
  });
}

export function removeFromPlaylist(
  id: string,
  itemId: string,
  now: number = Date.now(),
): void {
  updatePlaylist(id, playlist => ({
    ...playlist,
    items: playlist.items.filter(item => item.id !== itemId),
    updatedAt: now,
  }));
}

/** Playlists, most recently changed first. */
export function usePlaylists(): Playlist[] {
  const playlists = useStore(playlistsStore, state => state);
  return useMemo(
    () => [...playlists].sort((a, b) => b.updatedAt - a.updatedAt),
    [playlists],
  );
}

export function usePlaylist(id: string): Playlist | undefined {
  return useStore(playlistsStore, playlists =>
    playlists.find(playlist => playlist.id === id),
  );
}
