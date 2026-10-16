import { Platform } from 'react-native';
import {
  CameraRoll,
  type Album,
  type GetPhotosParams,
  type PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';
import * as nativeMedia from 'zxplayer-media';
import type { NativeVideo, NativeVideoFolder } from 'zxplayer-media';

import type { AlbumKind, VideoFolder, VideoItem, VideoPage } from '../types';

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

/** The whole video library, presented as a folder. */
export const ALL_VIDEOS_FOLDER: VideoFolder = {
  id: ALL_VIDEOS_FOLDER_ID,
  title: 'All videos',
  count: null,
  album: null,
};

const VIDEO_FIELDS: GetPhotosParams['include'] = [
  'filename',
  'fileSize',
  'playableDuration',
  'imageSize',
];

/** Lists every album/folder that contains at least one video, led by an "All videos" entry. */
export async function fetchVideoFolders(): Promise<VideoFolder[]> {
  if (nativeMediaEnabled()) {
    return buildFolderListFromBuckets(await nativeMedia.getVideoFolders());
  }
  const albums = await CameraRoll.getAlbums({
    assetType: 'Videos',
    albumType: 'All',
  });
  return buildFolderList(albums, Platform.OS === 'android');
}

const byTitle = (a: VideoFolder, b: VideoFolder) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

const sumCounts = (folders: VideoFolder[]) =>
  folders.reduce((sum, folder) => sum + (folder.count ?? 0), 0);

export function buildFolderList(
  albums: Album[],
  isAndroid: boolean,
): VideoFolder[] {
  const folders = albums
    .filter(album => album.count > 0)
    .map(toVideoFolder)
    .sort(byTitle);

  // Android buckets partition the library, so their counts add up to the total. iOS albums
  // overlap (an asset can sit in several), so no reliable total exists without a full scan.
  const total = isAndroid ? sumCounts(folders) : null;

  return [{ ...ALL_VIDEOS_FOLDER, count: total }, ...folders];
}

/** Folder list from MediaStore buckets (Android native path). */
export function buildFolderListFromBuckets(
  buckets: NativeVideoFolder[],
): VideoFolder[] {
  const folders = buckets
    .filter(bucket => bucket.count > 0)
    .map(
      (bucket): VideoFolder => ({
        id: `bucket:${bucket.id}`,
        title: bucket.name,
        count: bucket.count,
        album: { name: bucket.name, kind: 'Album' },
        bucketId: bucket.id,
      }),
    )
    .sort(byTitle);

  return [{ ...ALL_VIDEOS_FOLDER, count: sumCounts(folders) }, ...folders];
}

function toVideoFolder(album: Album): VideoFolder {
  const kind: AlbumKind = album.type === 'SmartAlbum' ? 'SmartAlbum' : 'Album';
  return {
    id: `${kind}:${album.title}`,
    title: album.title,
    count: album.count,
    album: { name: album.title, kind },
  };
}

/** Loads one page of a folder's videos, newest first. */
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
 * Loads every page of a folder, reporting the list after each page so the UI can render
 * progressively. Stops early (and resolves with what it has) once `isCancelled` is true.
 */
export async function fetchAllFolderVideos(
  folder: VideoFolder,
  onPage?: (videosSoFar: VideoItem[]) => void,
  isCancelled: () => boolean = () => false,
): Promise<VideoItem[]> {
  // A folder without a bucket id (e.g. restored from older state) uses camera-roll.
  if (nativeMediaEnabled() && (folder.album === null || folder.bucketId)) {
    return fetchAllNativeVideos(folder.bucketId ?? null, onPage, isCancelled);
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

async function fetchAllNativeVideos(
  bucketId: string | null,
  onPage: ((videosSoFar: VideoItem[]) => void) | undefined,
  isCancelled: () => boolean,
): Promise<VideoItem[]> {
  const seen = new Set<string>();
  let videos: VideoItem[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await nativeMedia.getVideos(
      bucketId,
      offset,
      NATIVE_PAGE_SIZE,
    );
    if (isCancelled()) {
      return videos;
    }
    offset += page.videos.length;
    const fresh = page.videos
      .filter(video => !seen.has(video.id))
      .map(fromNativeVideo);
    fresh.forEach(video => seen.add(video.id));
    videos = [...videos, ...fresh];
    onPage?.(videos);
    hasMore = page.hasMore && page.videos.length > 0;
  }
  return videos;
}

const finiteOr = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

export function fromNativeVideo(video: NativeVideo): VideoItem {
  return {
    id: video.id,
    uri: video.uri,
    fileName: video.fileName || fileNameFromUri(video.uri),
    durationSec: Math.max(0, finiteOr(video.durationSec, 0)),
    sizeBytes:
      video.sizeBytes !== null && Number.isFinite(video.sizeBytes)
        ? video.sizeBytes
        : null,
    width: finiteOr(video.width, 0),
    height: finiteOr(video.height, 0),
    modifiedAtSec: finiteOr(video.modifiedAtSec, 0),
  };
}

export function toVideoItem({ node }: PhotoIdentifier): VideoItem {
  const { image } = node;
  return {
    id: node.id || image.uri,
    uri: image.uri,
    fileName: image.filename ?? fileNameFromUri(image.uri),
    // The native layer reports null when the duration cannot be read.
    durationSec: image.playableDuration ?? 0,
    sizeBytes: image.fileSize ?? null,
    width: image.width,
    height: image.height,
    modifiedAtSec: node.modificationTimestamp || node.timestamp,
  };
}

function fileNameFromUri(uri: string): string {
  const lastSegment = uri.split('/').pop() ?? '';
  return decodeURIComponent(lastSegment) || 'Untitled video';
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
