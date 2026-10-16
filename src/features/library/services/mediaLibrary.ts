import { Platform } from 'react-native';
import {
  CameraRoll,
  type Album,
  type GetPhotosParams,
  type PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';

import type { AlbumKind, VideoFolder, VideoItem, VideoPage } from '../types';

export const ALL_VIDEOS_FOLDER_ID = 'all-videos';
export const VIDEO_PAGE_SIZE = 40;

const VIDEO_FIELDS: GetPhotosParams['include'] = [
  'filename',
  'fileSize',
  'playableDuration',
  'imageSize',
];

/** Lists every album/folder that contains at least one video, led by an "All videos" entry. */
export async function fetchVideoFolders(): Promise<VideoFolder[]> {
  const albums = await CameraRoll.getAlbums({
    assetType: 'Videos',
    albumType: 'All',
  });
  return buildFolderList(albums, Platform.OS === 'android');
}

export function buildFolderList(
  albums: Album[],
  isAndroid: boolean,
): VideoFolder[] {
  const folders = albums
    .filter(album => album.count > 0)
    .map(toVideoFolder)
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    );

  // Android buckets partition the library, so their counts add up to the total. iOS albums
  // overlap (an asset can sit in several), so no reliable total exists without a full scan.
  const total = isAndroid
    ? folders.reduce((sum, folder) => sum + (folder.count ?? 0), 0)
    : null;

  return [
    {
      id: ALL_VIDEOS_FOLDER_ID,
      title: 'All videos',
      count: total,
      album: null,
    },
    ...folders,
  ];
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
