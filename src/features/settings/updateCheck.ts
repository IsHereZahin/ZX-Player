import type { AppVersion } from 'zxplayer-media';

import { WEBSITE_URL } from './appInfo';

/**
 * The one place a release is announced: the landing page serves this file, and bumping it
 * there is all a new release needs for the app to offer it.
 */
export const RELEASE_MANIFEST_URL = `${WEBSITE_URL}/version.json`;
const TIMEOUT_MS = 10_000;
const MAX_NOTES = 8;
const MAX_NOTE_LENGTH = 200;
const MAX_URL_LENGTH = 2048;

const VERSION_PATTERN = /^\d{1,4}(\.\d{1,4}){0,3}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_URL = /^https:\/\/[a-z0-9.-]+(:\d{1,5})?(\/\S*)?$/i;
/** A file on the website itself, e.g. "ZX-Player.apk" or "/downloads/ZX-Player.apk". */
const SITE_PATH = /^\/?[\w.-]+(\/[\w.-]+)*$/;

export interface Release {
  version: string;
  /** Android versionCode of the release. */
  build: number;
  downloadUrl: string;
  /** YYYY-MM-DD, when given. */
  releasedAt: string | null;
  notes: string[];
}

export type UpdateCheckResult =
  | { kind: 'update'; release: Release }
  | { kind: 'latest'; release: Release };

function resolveDownloadUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) {
    return null;
  }
  if (HTTPS_URL.test(value)) {
    return value;
  }
  if (SITE_PATH.test(value) && !value.split('/').includes('..')) {
    return `${WEBSITE_URL}/${value.replace(/^\//, '')}`;
  }
  return null;
}

function cleanNotes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((note): note is string => typeof note === 'string')
    .map(note => note.trim().slice(0, MAX_NOTE_LENGTH))
    .filter(note => note.length > 0)
    .slice(0, MAX_NOTES);
}

/**
 * Validates the manifest fetched from the website. It comes over the network, so anything
 * unexpected is rejected rather than shown, and only https (or same-site) links are opened.
 */
export function parseRelease(data: unknown): Release | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const { version, build, releasedAt } = record;
  const downloadUrl = resolveDownloadUrl(record.downloadUrl);
  if (
    typeof version !== 'string' ||
    !VERSION_PATTERN.test(version) ||
    typeof build !== 'number' ||
    !Number.isSafeInteger(build) ||
    build < 1 ||
    downloadUrl === null
  ) {
    return null;
  }
  return {
    version,
    build,
    downloadUrl,
    releasedAt:
      typeof releasedAt === 'string' && DATE_PATTERN.test(releasedAt)
        ? releasedAt
        : null,
    notes: cleanNotes(record.notes),
  };
}

/** Asks the website for the latest release and compares it with the installed build. */
export async function checkForUpdate(
  installed: AppVersion,
): Promise<UpdateCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RELEASE_MANIFEST_URL, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Release manifest request failed (${response.status})`);
    }
    const release = parseRelease(await response.json());
    if (!release) {
      throw new Error('Release manifest is malformed');
    }
    return {
      kind: release.build > installed.build ? 'update' : 'latest',
      release,
    };
  } finally {
    clearTimeout(timeout);
  }
}
