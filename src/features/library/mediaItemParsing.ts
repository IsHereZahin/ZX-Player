import { isRecord } from '../../shared/storage/persistentStore';
import type { VideoItem } from './types';

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const optionalText = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/**
 * Validates a stored item snapshot (watch history, favorites, playlists). Anything
 * malformed is dropped rather than trusted.
 */
export function parseMediaItem(raw: unknown): VideoItem | null {
  if (
    !isRecord(raw) ||
    typeof raw.id !== 'string' ||
    typeof raw.uri !== 'string' ||
    typeof raw.fileName !== 'string' ||
    !isNumber(raw.durationSec) ||
    !isNumber(raw.width) ||
    !isNumber(raw.height) ||
    !isNumber(raw.modifiedAtSec) ||
    !(raw.sizeBytes === null || isNumber(raw.sizeBytes))
  ) {
    return null;
  }
  const item: VideoItem = {
    id: raw.id,
    // Items saved before audio support have no kind; they are all videos.
    kind: raw.kind === 'audio' ? 'audio' : 'video',
    uri: raw.uri,
    fileName: raw.fileName,
    durationSec: raw.durationSec,
    sizeBytes: raw.sizeBytes,
    width: raw.width,
    height: raw.height,
    modifiedAtSec: raw.modifiedAtSec,
  };
  if (isNumber(raw.addedAtSec)) {
    item.addedAtSec = raw.addedAtSec;
  }
  if (item.kind === 'audio') {
    item.title = optionalText(raw.title);
    item.artist = optionalText(raw.artist);
    item.album = optionalText(raw.album);
  }
  return item;
}
