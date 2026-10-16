import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type NativeVideo = {
  id: string;
  uri: string;
  fileName: string;
  sizeBytes: number | null;
  durationSec: number;
  width: number;
  height: number;
  modifiedAtSec: number;
};

export type NativeVideoPage = {
  videos: NativeVideo[];
  hasMore: boolean;
};

export type NativeVideoFolder = {
  id: string;
  name: string;
  count: number;
};

export interface Spec extends TurboModule {
  /** Every MediaStore bucket that contains videos, with its video count. */
  getVideoFolders(): Promise<NativeVideoFolder[]>;
  /** Videos in one bucket (or all when null), newest first, `limit` rows from `offset`. */
  getVideos(
    bucketId: string | null,
    offset: number,
    limit: number,
  ): Promise<NativeVideoPage>;
  /** Resolves a file:// URI of a cached JPEG thumbnail, made from the system thumbnail. */
  getThumbnail(
    videoId: string,
    cacheKey: string,
    maxSize: number,
  ): Promise<string>;
}

// `get` rather than `getEnforcing`: the module only exists on Android, and the app falls
// back to camera-roll wherever it is missing.
export default TurboModuleRegistry.get<Spec>('ZxplayerMedia');
