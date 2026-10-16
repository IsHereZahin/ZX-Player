import { clamp } from './math';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Formats seconds as `m:ss`, or `h:mm:ss` once the value reaches an hour. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '0:00';
  }
  const whole = Math.floor(totalSeconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${minutes}:${pad2(seconds)}`;
}

/** Formats a seek offset such as `+0:15` or `-1:02:05`. */
export function formatSignedDuration(deltaSeconds: number): string {
  const sign = deltaSeconds < 0 ? '-' : '+';
  return `${sign}${formatDuration(Math.abs(deltaSeconds))}`;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return null;
  }
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const fractionDigits = unitIndex === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(fractionDigits)} ${BYTE_UNITS[unitIndex]}`;
}

export function formatPercent(level: number): string {
  return `${Math.round(clamp(level, 0, 1) * 100)}%`;
}

export function formatVideoCount(count: number): string {
  return count === 1 ? '1 video' : `${count} videos`;
}

/** Common quality label from the shorter edge, so portrait videos read the same. */
export function formatResolution(width: number, height: number): string | null {
  const shortEdge = Math.min(width, height);
  if (!(shortEdge > 0)) {
    return null;
  }
  if (shortEdge >= 2160) {
    return '4K';
  }
  const standard = [1440, 1080, 720, 480, 360, 240].find(
    edge => shortEdge >= edge,
  );
  return `${standard ?? shortEdge}p`;
}

/** "45 sec left", "12 min left", "1 hr 5 min left". */
export function formatTimeLeft(seconds: number): string {
  const remaining = Math.max(0, Math.round(seconds));
  if (remaining < 60) {
    return `${remaining} sec left`;
  }
  const minutes = Math.round(remaining / 60);
  if (minutes < 60) {
    return `${minutes} min left`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} hr ${rest} min left` : `${hours} hr left`;
}

export function formatDate(epochSeconds: number): string | null {
  if (!(epochSeconds > 0)) {
    return null;
  }
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatSpeed(rate: number): string {
  return `${Number(rate.toFixed(2))}×`;
}
