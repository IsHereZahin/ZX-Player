/** Camera-roll album type; only iOS distinguishes user albums from smart albums. */
export type AlbumKind = 'Album' | 'SmartAlbum';

export type MediaKind = 'video' | 'audio';
/** What a library view lists: one kind of media, or both together. */
export type MediaScope = MediaKind | 'all';

export interface VideoFolder {
  /** Stable list key, unique across album kinds. */
  id: string;
  title: string;
  /** Number of videos, or null when the platform cannot report it cheaply. */
  count: number | null;
  /** Album used to query this folder; null means the whole video library. */
  album: { name: string; kind: AlbumKind } | null;
  /**
   * Android MediaStore bucket, set when folders come from the native media module. Unlike
   * album names, bucket ids keep two same-named folders apart.
   */
  bucketId?: string;
  /** Media listed in this folder. */
  scope: MediaScope;
}

/** A playable file from the library: a video or an audio track. */
export interface VideoItem {
  id: string;
  kind: MediaKind;
  /** `content://` URI on Android, `ph://` asset URI on iOS. */
  uri: string;
  fileName: string;
  durationSec: number;
  sizeBytes: number | null;
  /** 0 for audio. */
  width: number;
  height: number;
  modifiedAtSec: number;
  /** When the file joined the library; absent on items saved by older versions. */
  addedAtSec?: number;
  /** Audio tags, when the file has them. */
  title?: string | null;
  artist?: string | null;
  album?: string | null;
}

export interface VideoPage {
  videos: VideoItem[];
  /** Cursor for the next page, or null when the folder is exhausted. */
  nextCursor: string | null;
}
