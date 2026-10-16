import type { TurboModule } from 'react-native';
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
  /** Audio tags; null for video or when the file has none. */
  title: string | null;
  artist: string | null;
  album: string | null;
};

export type NativeMediaPage = { items: NativeMediaItem[]; hasMore: boolean };

export type NativeMediaFolder = { id: string; name: string; count: number };

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
}

export default TurboModuleRegistry.get<Spec>('ZxplayerMedia');
