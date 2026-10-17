import { Platform } from 'react-native';
import {
  CameraRoll,
  type Album,
  type GetPhotosParams,
  type PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';
import * as nativeMedia from 'zxplayer-media';
import type { NativeMediaFolder, NativeMediaItem } from 'zxplayer-media';

import { newSinceSec } from '../recentlyAdded';
import type {
  AlbumKind,
  MediaKind,
  MediaScope,
  VideoFolder,
  VideoItem,
  VideoPage,
} from '../types';

export const ALL_VIDEOS_FOLDER_ID = 'all-videos';
export const VIDEO_PAGE_SIZE = 40;
/** Rows per native query: big enough to be cheap, small enough to show the first screen fast. */
export const NATIVE_PAGE_SIZE = 250;

/**
 * On Android the library is read straight from MediaStore columns by the native module.
 * camera-roll opens every video file to read its duration, which makes large libraries
 * slow; it remains the path on iOS (PhotoKit) and wherever the module is missing.
 */
function nativeMediaEnabled(): boolean {
  return Platform.OS === 'android' && nativeMedia.isNativeMediaAvailable;
}

/**
 * Audio comes from Android's MediaStore. iOS apps cannot list the device's audio files
 * (the Photos library holds only photos and videos), so audio features are Android-only.
 */
export function isAudioLibrarySupported(): boolean {
  return nativeMediaEnabled();
}

export function kindsOf(scope: MediaScope): MediaKind[] {
  return scope === 'all' ? ['video', 'audio'] : [scope];
}

const ALL_FOLDER: Record<MediaScope, { id: string; title: string }> = {
  video: { id: ALL_VIDEOS_FOLDER_ID, title: 'All videos' },
  audio: { id: 'all-audio', title: 'All audio' },
  all: { id: 'all-media', title: 'All media' },
};

/** The whole library of a scope, presented as a folder. */
export function allMediaFolder(
  scope: MediaScope,
  count: number | null = null,
  newIds?: readonly string[],
): VideoFolder {
  return { ...ALL_FOLDER[scope], count, album: null, newIds, scope };
}

/** True for the "All …" entry, which stands for the whole library of its scope. */
export function isAllMediaFolder(folder: VideoFolder): boolean {
  return folder.id === ALL_FOLDER[folder.scope].id;
}

export const ALL_VIDEOS_FOLDER = allMediaFolder('video');

const VIDEO_FIELDS: GetPhotosParams['include'] = [
  'filename',
  'fileSize',
  'playableDuration',
  'imageSize',
];

/** Lists every folder holding media of the scope, led by an "All …" entry. */
export async function fetchFolders(
  scope: MediaScope = 'video',
): Promise<VideoFolder[]> {
  if (nativeMediaEnabled()) {
    const since = newSinceSec();
    const lists = await Promise.all(
      kindsOf(scope).map(kind => nativeMedia.getFolders(kind, since)),
    );
    return buildFolderListFromBuckets(lists.flat(), scope);
  }
  if (scope === 'audio') {
    return [];
  }
  const albums = await CameraRoll.getAlbums({
    assetType: 'Videos',
    albumType: 'All',
  });
  return buildFolderList(albums, Platform.OS === 'android', scope);
}

const byTitle = (a: VideoFolder, b: VideoFolder) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

const sumCounts = (folders: VideoFolder[]) =>
  folders.reduce((sum, folder) => sum + (folder.count ?? 0), 0);

export function buildFolderList(
  albums: Album[],
  isAndroid: boolean,
  scope: MediaScope = 'video',
): VideoFolder[] {
  const folders = albums
    .filter(album => album.count > 0)
    .map(album => toVideoFolder(album, scope))
    .sort(byTitle);

  // Android buckets partition the library, so their counts add up to the total. iOS albums
  // overlap (an asset can sit in several), so no reliable total exists without a full scan.
  const total = isAndroid ? sumCounts(folders) : null;

  return [allMediaFolder(scope, total), ...folders];
}

/**
 * Folder list from MediaStore buckets (Android native path). Video and audio buckets of
 * the same directory share an id, so a combined list shows each directory once.
 */
export function buildFolderListFromBuckets(
  buckets: NativeMediaFolder[],
  scope: MediaScope = 'video',
): VideoFolder[] {
  const merged = new Map<string, NativeMediaFolder>();
  for (const bucket of buckets) {
    const previous = merged.get(bucket.id);
    merged.set(
      bucket.id,
      previous
        ? {
            ...previous,
            count: previous.count + bucket.count,
            newIds: [...previous.newIds, ...bucket.newIds],
          }
        : bucket,
    );
  }

  const folders = [...merged.values()]
    .filter(bucket => bucket.count > 0)
    .map(
      (bucket): VideoFolder => ({
        id: `bucket:${bucket.id}`,
        title: bucket.name,
        count: bucket.count,
        album: { name: bucket.name, kind: 'Album' },
        bucketId: bucket.id,
        relativePath: bucket.relativePath,
        newIds: bucket.newIds,
        scope,
      }),
    )
    .sort(byTitle);

  const allNew = folders.flatMap(folder => folder.newIds ?? []);
  return [allMediaFolder(scope, sumCounts(folders), allNew), ...folders];
}

function toVideoFolder(album: Album, scope: MediaScope): VideoFolder {
  const kind: AlbumKind = album.type === 'SmartAlbum' ? 'SmartAlbum' : 'Album';
  return {
    id: `${kind}:${album.title}`,
    title: album.title,
    count: album.count,
    album: { name: album.title, kind },
    scope,
  };
}

/** Loads one page of a folder's videos from camera-roll, newest first. */
export async function fetchFolderVideos(
  folder: VideoFolder,
  cursor?: string | null,
): Promise<VideoPage> {
  const params: GetPhotosParams = {
    first: VIDEO_PAGE_SIZE,
    assetType: 'Videos',
    include: VIDEO_FIELDS,
  };
  if (cursor) {
    params.after = cursor;
  }
  if (folder.album) {
    params.groupName = folder.album.name;
    if (Platform.OS === 'ios') {
      // Android filters by bucket name only; iOS also needs to know which collection type to search.
      params.groupTypes = folder.album.kind;
    }
  }

  const page = await CameraRoll.getPhotos(params);
  return {
    videos: page.edges.map(toVideoItem),
    nextCursor: page.page_info.has_next_page
      ? page.page_info.end_cursor ?? null
      : null,
  };
}

/**
 * Loads every item in a folder, reporting the list after each page so the UI can render
 * progressively. Stops early (and resolves with what it has) once `isCancelled` is true.
 */
export async function fetchAllFolderMedia(
  folder: VideoFolder,
  onPage?: (itemsSoFar: VideoItem[]) => void,
  isCancelled: () => boolean = () => false,
): Promise<VideoItem[]> {
  // A folder without a bucket id (e.g. listed by camera-roll) is read through camera-roll.
  if (nativeMediaEnabled() && (folder.album === null || folder.bucketId)) {
    return fetchAllNativeMedia(
      kindsOf(folder.scope),
      folder.bucketId ?? null,
      onPage,
      isCancelled,
    );
  }
  if (folder.scope === 'audio') {
    return [];
  }

  const seen = new Set<string>();
  let videos: VideoItem[] = [];
  let cursor: string | null = null;
  do {
    const page: VideoPage = await fetchFolderVideos(folder, cursor);
    if (isCancelled()) {
      return videos;
    }
    // Pages can overlap if the library changes between requests.
    const fresh = page.videos.filter(video => !seen.has(video.id));
    fresh.forEach(video => seen.add(video.id));
    videos = [...videos, ...fresh];
    onPage?.(videos);
    cursor = page.nextCursor;
  } while (cursor);
  return videos;
}

async function fetchAllNativeMedia(
  kinds: MediaKind[],
  bucketId: string | null,
  onPage: ((itemsSoFar: VideoItem[]) => void) | undefined,
  isCancelled: () => boolean,
): Promise<VideoItem[]> {
  // Keyed by URI, which identifies an item across kinds.
  const seen = new Set<string>();
  let items: VideoItem[] = [];
  for (const kind of kinds) {
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const page = await nativeMedia.getMedia(
        kind,
        bucketId,
        offset,
        NATIVE_PAGE_SIZE,
      );
      if (isCancelled()) {
        return items;
      }
      offset += page.items.length;
      const fresh = page.items
        .filter(item => !seen.has(item.uri))
        .map(item => fromNativeItem(item, kind));
      fresh.forEach(item => seen.add(item.uri));
      items = [...items, ...fresh];
      onPage?.(items);
      hasMore = page.hasMore && page.items.length > 0;
    }
  }
  return items;
}

const finiteOr = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

export function fromNativeItem(
  item: NativeMediaItem,
  kind: MediaKind,
): VideoItem {
  const mapped: VideoItem = {
    id: item.id,
    kind,
    uri: item.uri,
    fileName: item.fileName || fileNameFromUri(item.uri),
    durationSec: Math.max(0, finiteOr(item.durationSec, 0)),
    sizeBytes:
      item.sizeBytes !== null && Number.isFinite(item.sizeBytes)
        ? item.sizeBytes
        : null,
    width: finiteOr(item.width, 0),
    height: finiteOr(item.height, 0),
    modifiedAtSec: finiteOr(item.modifiedAtSec, 0),
    addedAtSec: finiteOr(item.addedAtSec, 0),
  };
  if (kind === 'audio') {
    mapped.title = item.title;
    mapped.artist = item.artist;
    mapped.album = item.album;
  }
  return mapped;
}

export function toVideoItem({ node }: PhotoIdentifier): VideoItem {
  const { image } = node;
  return {
    id: node.id || image.uri,
    kind: 'video',
    uri: image.uri,
    fileName: image.filename ?? fileNameFromUri(image.uri),
    // The native layer reports null when the duration cannot be read.
    durationSec: image.playableDuration ?? 0,
    sizeBytes: image.fileSize ?? null,
    width: image.width,
    height: image.height,
    modifiedAtSec: node.modificationTimestamp || node.timestamp,
    addedAtSec: node.timestamp,
  };
}

function fileNameFromUri(uri: string): string {
  const lastSegment = uri.split('/').pop() ?? '';
  return decodeURIComponent(lastSegment) || 'Untitled';
}

/** Splits `holiday.mp4` into a display title and an upper-case extension label. */
export function describeFileName(fileName: string): {
  title: string;
  extension: string | null;
} {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) {
    return { title: fileName, extension: null };
  }
  return {
    title: fileName.slice(0, dot),
    extension: fileName.slice(dot + 1).toUpperCase(),
  };
}

/** Display title: an audio file's tag title when it has one, else the file name. */
export function mediaTitle(item: VideoItem): string {
  return item.title || describeFileName(item.fileName).title;
}
