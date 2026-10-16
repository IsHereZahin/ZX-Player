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
import { describeFileName } from '../services/mediaLibrary';
import type { VideoItem } from '../types';

/** Display strings shared by list rows, grid cards and sheets. */
export function describeVideo(video: VideoItem, entry: WatchEntry | undefined) {
  const { title, extension } = describeFileName(video.fileName);
  const details = [
    formatResolution(video.width, video.height),
    formatBytes(video.sizeBytes),
    extension,
  ]
    .filter(Boolean)
    .join(' · ');

  const resumeAt = resumePosition(entry);
  let status: string | null = null;
  if (entry && resumeAt !== null) {
    status = formatTimeLeft(entry.durationSec - resumeAt);
  } else if (entry && isFinished(entry)) {
    status = 'Watched';
  }

  return { title, details, status };
}
