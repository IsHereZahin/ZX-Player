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

export type NativeMediaFolder = { id: string; name: string; count: number };

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

export interface Spec extends TurboModule {
  /** `kind` is "video" or "audio". */
  getFolders(kind: string): Promise<NativeMediaFolder[]>;
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
  readonly onRemoteCommand: CodegenTypes.EventEmitter<RemoteCommand>;
}

export default TurboModuleRegistry.get<Spec>('ZxplayerMedia');
