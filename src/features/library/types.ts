/** Camera-roll album type; only iOS distinguishes user albums from smart albums. */
export type AlbumKind = 'Album' | 'SmartAlbum';

export interface VideoFolder {
  /** Stable list key, unique across album kinds. */
  id: string;
  title: string;
  /** Number of videos, or null when the platform cannot report it cheaply. */
  count: number | null;
  /** Album used to query this folder; null means the whole video library. */
  album: { name: string; kind: AlbumKind } | null;
}

export interface VideoItem {
  id: string;
  /** `content://` URI on Android, `ph://` asset URI on iOS. */
  uri: string;
  fileName: string;
  durationSec: number;
  sizeBytes: number | null;
  width: number;
  height: number;
  modifiedAtSec: number;
}

export interface VideoPage {
  videos: VideoItem[];
  /** Cursor for the next page, or null when the folder is exhausted. */
  nextCursor: string | null;
}
