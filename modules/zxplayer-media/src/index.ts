import NativeZxplayerMedia from './NativeZxplayerMedia';

export type {
  NativeMediaFolder,
  NativeMediaItem,
  NativeMediaPage,
} from './NativeZxplayerMedia';

export type MediaKind = 'video' | 'audio';

export const isNativeMediaAvailable = NativeZxplayerMedia != null;

function requireModule() {
  if (!NativeZxplayerMedia) {
    throw new Error('ZxplayerMedia native module is not available');
  }
  return NativeZxplayerMedia;
}

export function getFolders(kind: MediaKind) {
  return requireModule().getFolders(kind);
}

export function getMedia(
  kind: MediaKind,
  bucketId: string | null,
  offset: number,
  limit: number,
) {
  return requireModule().getMedia(kind, bucketId, offset, limit);
}

export function getThumbnail(uri: string, cacheKey: string, maxSize: number) {
  return requireModule().getThumbnail(uri, cacheKey, maxSize);
}
