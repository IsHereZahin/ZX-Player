import NativeZxplayerMedia from './NativeZxplayerMedia';

export type {
  NativeVideo,
  NativeVideoFolder,
  NativeVideoPage,
} from './NativeZxplayerMedia';

export const isNativeMediaAvailable = NativeZxplayerMedia != null;

function requireModule() {
  if (!NativeZxplayerMedia) {
    throw new Error('ZxplayerMedia native module is not available');
  }
  return NativeZxplayerMedia;
}

export function getVideoFolders() {
  return requireModule().getVideoFolders();
}

export function getVideos(
  bucketId: string | null,
  offset: number,
  limit: number,
) {
  return requireModule().getVideos(bucketId, offset, limit);
}

export function getThumbnail(
  videoId: string,
  cacheKey: string,
  maxSize: number,
) {
  return requireModule().getThumbnail(videoId, cacheKey, maxSize);
}
