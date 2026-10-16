import {
  formatBytes,
  formatResolution,
  formatTimeLeft,
} from '../../../shared/utils/format';
import {
  isFinished,
  resumePosition,
  type WatchEntry,
} from '../../history/watchHistory';
import { describeFileName, mediaTitle } from '../services/mediaLibrary';
import type { VideoItem } from '../types';

function detailParts(item: VideoItem, extension: string | null) {
  if (item.kind === 'audio' && (item.artist || item.album)) {
    return [item.artist, item.album];
  }
  return [
    formatResolution(item.width, item.height),
    formatBytes(item.sizeBytes),
    extension,
  ];
}

/** Display strings shared by list rows, grid cards and sheets. */
export function describeVideo(video: VideoItem, entry: WatchEntry | undefined) {
  const { extension } = describeFileName(video.fileName);
  const title = mediaTitle(video);
  const details = detailParts(video, extension).filter(Boolean).join(' · ');

  const resumeAt = resumePosition(entry);
  let status: string | null = null;
  if (entry && resumeAt !== null) {
    status = formatTimeLeft(entry.durationSec - resumeAt);
  } else if (entry && isFinished(entry)) {
    status = video.kind === 'audio' ? 'Played' : 'Watched';
  }

  return { title, details, status };
}
