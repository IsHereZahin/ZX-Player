import NativeZxplayerMedia from './NativeZxplayerMedia';

import type { NowPlayingInfo, RemoteCommand } from './NativeZxplayerMedia';

export type {
  FileOperationResult,
  NativeMediaFolder,
  NativeMediaItem,
  NativeMediaPage,
  NativeTrashedItem,
  NowPlayingInfo,
  RemoteCommand,
} from './NativeZxplayerMedia';

export type MediaKind = 'video' | 'audio';

export const isNativeMediaAvailable = NativeZxplayerMedia != null;

function requireModule() {
  if (!NativeZxplayerMedia) {
    throw new Error('ZxplayerMedia native module is not available');
  }
  return NativeZxplayerMedia;
}

export function getFolders(kind: MediaKind, newSinceSec: number) {
  return requireModule().getFolders(kind, newSinceSec);
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

export function shareMedia(uri: string, title: string) {
  return requireModule().shareMedia(uri, title);
}

export function setNowPlaying(info: NowPlayingInfo) {
  requireModule().setNowPlaying(info);
}

export function clearNowPlaying() {
  requireModule().clearNowPlaying();
}

export function trashMedia(uris: readonly string[], trashed: boolean) {
  return requireModule().trashMedia(uris, trashed);
}

export function deleteMedia(uris: readonly string[]) {
  return requireModule().deleteMedia(uris);
}

export function getTrashedMedia(kind: MediaKind) {
  return requireModule().getTrashedMedia(kind);
}

export function moveMedia(uris: readonly string[], relativePath: string) {
  return requireModule().moveMedia(uris, relativePath);
}

export function copyMedia(uris: readonly string[], relativePath: string) {
  return requireModule().copyMedia(uris, relativePath);
}

export function addRemoteCommandListener(
  listener: (command: RemoteCommand) => void,
): { remove: () => void } {
  return requireModule().onRemoteCommand(listener);
}
