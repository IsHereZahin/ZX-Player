import { Platform } from 'react-native';
import * as nativeMedia from 'zxplayer-media';
import type { FileOperationResult, NativeTrashedItem } from 'zxplayer-media';

import { removeFromHistory } from '../../history/watchHistory';
import { removeFavorites } from '../favorites';
import { removeFromAllPlaylists } from '../playlists';
import type { MediaKind, VideoFolder, VideoItem } from '../types';
import { fromNativeItem } from './mediaLibrary';
import { invalidateMediaIndex } from './videoIndex';

export type { FileOperationResult };

/**
 * Deleting, the recycle bin, moving and copying use MediaStore's consent requests, which
 * arrived in Android 11. Older Android and iOS don't offer these actions.
 */
export function canManageFiles(): boolean {
  return (
    Platform.OS === 'android' &&
    Number(Platform.Version) >= 30 &&
    nativeMedia.isNativeMediaAvailable
  );
}

/**
 * MediaStore keeps video and audio in their own top-level folders, so only these can
 * receive them. New folders are made under the first one.
 */
export const DESTINATION_ROOTS: Record<MediaKind, readonly string[]> = {
  video: ['Movies', 'DCIM', 'Pictures'],
  audio: ['Music', 'Podcasts', 'Audiobooks', 'Recordings'],
};

export const MAX_FOLDER_NAME = 60;

/** A folder name safe to use as one path segment, or "" when nothing usable is left. */
export function cleanFolderName(name: string): string {
  return [...name]
    .filter(char => char >= ' ')
    .join('')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, MAX_FOLDER_NAME)
    .trim();
}

/** Where "New Folder" puts a folder for this kind of media, e.g. "Movies/Trips/". */
export function newFolderPath(kind: MediaKind, name: string): string {
  return `${DESTINATION_ROOTS[kind][0]}/${cleanFolderName(name)}/`;
}

/** The one kind shared by all the items, or null for a mix of video and audio. */
export function kindOfItems(items: readonly VideoItem[]): MediaKind | null {
  const kinds = new Set(items.map(item => item.kind));
  return kinds.size === 1 ? items[0].kind : null;
}

export interface Destination {
  title: string;
  relativePath: string;
}

/** Existing folders that can receive this kind of media, by name. */
export function destinationsFor(
  kind: MediaKind,
  folders: readonly VideoFolder[],
  excludePath?: string | null,
): Destination[] {
  const roots = DESTINATION_ROOTS[kind];
  const seen = new Set<string>();
  const destinations: Destination[] = [];
  for (const folder of folders) {
    const path = folder.relativePath;
    if (
      !path ||
      path === excludePath ||
      seen.has(path) ||
      !roots.includes(path.split('/')[0])
    ) {
      continue;
    }
    seen.add(path);
    destinations.push({ title: folder.title, relativePath: path });
  }
  return destinations.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
}

const urisOf = (items: readonly { uri: string }[]) =>
  items.map(item => item.uri);

/** Items that left the library no longer belong in history, favorites or playlists. */
function forget(items: readonly VideoItem[]): void {
  const ids = items.map(item => item.id);
  ids.forEach(removeFromHistory);
  removeFavorites(ids);
  removeFromAllPlaylists(ids);
}

/**
 * Sends items to the system recycle bin, after Android's own confirmation. Resolves
 * false when the user declines.
 */
export async function moveToRecycleBin(
  items: readonly VideoItem[],
): Promise<boolean> {
  const accepted = await nativeMedia.trashMedia(urisOf(items), true);
  if (accepted) {
    forget(items);
    invalidateMediaIndex();
  }
  return accepted;
}

/** A file in the recycle bin, with when Android will delete it for good. */
export interface TrashedItem extends VideoItem {
  expiresAtSec: number;
}

function fromTrashed(item: NativeTrashedItem, kind: MediaKind): TrashedItem {
  return { ...fromNativeItem(item, kind), expiresAtSec: item.expiresAtSec };
}

/** The recycle bin's items of the given kinds, soonest to expire first. */
export async function fetchRecycleBin(
  kinds: readonly MediaKind[],
): Promise<TrashedItem[]> {
  const lists = await Promise.all(
    kinds.map(async kind =>
      (
        await nativeMedia.getTrashedMedia(kind)
      ).map(item => fromTrashed(item, kind)),
    ),
  );
  return lists.flat().sort((a, b) => a.expiresAtSec - b.expiresAtSec);
}

export async function restoreFromRecycleBin(
  items: readonly TrashedItem[],
): Promise<boolean> {
  const accepted = await nativeMedia.trashMedia(urisOf(items), false);
  if (accepted) {
    invalidateMediaIndex();
  }
  return accepted;
}

/** Deletes items for good, after Android's own confirmation. */
export async function deleteForever(
  items: readonly VideoItem[],
): Promise<boolean> {
  const accepted = await nativeMedia.deleteMedia(urisOf(items));
  if (accepted) {
    forget(items);
    invalidateMediaIndex();
  }
  return accepted;
}

export async function moveItems(
  items: readonly VideoItem[],
  relativePath: string,
): Promise<FileOperationResult> {
  const result = await nativeMedia.moveMedia(urisOf(items), relativePath);
  if (result.done > 0) {
    invalidateMediaIndex();
  }
  return result;
}

export async function copyItems(
  items: readonly VideoItem[],
  relativePath: string,
): Promise<FileOperationResult> {
  const result = await nativeMedia.copyMedia(urisOf(items), relativePath);
  if (result.done > 0) {
    invalidateMediaIndex();
  }
  return result;
}
