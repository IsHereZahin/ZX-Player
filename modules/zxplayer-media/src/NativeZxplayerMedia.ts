import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type NativeMediaItem = {
  id: string;
  uri: string;
  fileName: string;
  sizeBytes: number | null;
  durationSec: number;
  /** 0 for audio. */
  width: number;
  height: number;
  modifiedAtSec: number;
  /** When the file joined the library. */
  addedAtSec: number;
  /** Audio tags; null for video or when the file has none. */
  title: string | null;
  artist: string | null;
  album: string | null;
};

export type NativeMediaPage = { items: NativeMediaItem[]; hasMore: boolean };

export type NativeMediaFolder = {
  id: string;
  name: string;
  count: number;
  /** Where the folder sits in shared storage, e.g. "Movies/Trips/"; null before Android 10. */
  relativePath: string | null;
  /** Ids of its items added since `newSinceSec` (capped), for "new" tags. */
  newIds: string[];
};

/** A file in the system recycle bin (Android 11+). */
export type NativeTrashedItem = {
  id: string;
  uri: string;
  fileName: string;
  sizeBytes: number | null;
  durationSec: number;
  width: number;
  height: number;
  modifiedAtSec: number;
  addedAtSec: number;
  title: string | null;
  artist: string | null;
  album: string | null;
  /** When the system deletes it for good. */
  expiresAtSec: number;
};

/** Outcome of a move or copy. */
export type FileOperationResult = {
  /** False when the user declined the system's permission prompt. */
  granted: boolean;
  done: number;
  failed: number;
};

/** What the notification and lock screen show (Android media session). */
export type NowPlayingInfo = {
  id: string;
  title: string;
  artist: string;
  artworkUri: string | null;
  durationMs: number;
  positionMs: number;
  playing: boolean;
  buffering: boolean;
  speed: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

/** A button pressed in the notification or on the lock screen. */
export type RemoteCommand = {
  /** "play", "pause", "previous", "next" or "seek". */
  command: string;
  positionMs: number;
};

/** react-native-video's player reached the end of an item. */
export type PlaybackEnded = {
  /** The item's URI, as it was handed to the player; empty when unknown. */
  uri: string;
};

export interface Spec extends TurboModule {
  /** The installed app: its version name and build number (Android versionCode). */
  getConstants(): { appVersion: string; buildNumber: number };
  /** `kind` is "video" or "audio"; items added since `newSinceSec` are listed as new. */
  getFolders(kind: string, newSinceSec: number): Promise<NativeMediaFolder[]>;
  /** Newest first; `bucketId` null means every folder. */
  getMedia(
    kind: string,
    bucketId: string | null,
    offset: number,
    limit: number,
  ): Promise<NativeMediaPage>;
  /** File URI of a cached JPEG, or null when the item has no artwork. */
  getThumbnail(
    uri: string,
    cacheKey: string,
    maxSize: number,
  ): Promise<string | null>;
  /** Opens the system share sheet for a library item. */
  shareMedia(uri: string, title: string): Promise<void>;
  /** Starts or updates the media session behind the playback notification. */
  setNowPlaying(info: NowPlayingInfo): void;
  /** Ends the media session and removes the notification. */
  clearNowPlaying(): void;

  // File management, Android 11+. Each change shows the system's own confirmation, so the
  // app needs no broad storage permission. Promises resolve false / granted: false when
  // the user declines.

  /** Moves items to the system recycle bin, or (trashed = false) restores them. */
  trashMedia(uris: ReadonlyArray<string>, trashed: boolean): Promise<boolean>;
  /** Deletes items for good. */
  deleteMedia(uris: ReadonlyArray<string>): Promise<boolean>;
  /** The recycle bin's items of one kind, soonest to expire first. */
  getTrashedMedia(kind: string): Promise<NativeTrashedItem[]>;
  /** Moves items into a folder such as "Movies/Trips/", creating it if needed. */
  moveMedia(
    uris: ReadonlyArray<string>,
    relativePath: string,
  ): Promise<FileOperationResult>;
  /** Copies items into a folder such as "Movies/Trips/", creating it if needed. */
  copyMedia(
    uris: ReadonlyArray<string>,
    relativePath: string,
  ): Promise<FileOperationResult>;
  readonly onRemoteCommand: CodegenTypes.EventEmitter<RemoteCommand>;
  /**
   * Sent straight from the player, so it arrives in the background and with the screen off,
   * when react-native-video's own onEnd (delivered on a screen frame) does not.
   */
  readonly onPlaybackEnded: CodegenTypes.EventEmitter<PlaybackEnded>;
}

export default TurboModuleRegistry.get<Spec>('ZxplayerMedia');
