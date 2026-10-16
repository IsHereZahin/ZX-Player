import { useSettings } from '../settings/settingsStore';
import { isAudioLibrarySupported } from './services/mediaLibrary';
import type { MediaScope } from './types';

/** The tabs that browse the library. */
export type LibraryTab = 'Library' | 'Audio';

/**
 * What a library tab lists. With audio and video in separate tabs, "Library" holds the
 * videos and "Audio" the audio; together, "Library" holds both. Without an audio library
 * (iOS) it is always videos.
 */
export function useLibraryScope(tab: LibraryTab): MediaScope {
  const { libraryLayout } = useSettings();
  if (tab === 'Audio') {
    return 'audio';
  }
  if (!isAudioLibrarySupported()) {
    return 'video';
  }
  return libraryLayout === 'together' ? 'all' : 'video';
}

/** Title of a library tab and its screen. */
export function libraryTitle(scope: MediaScope): string {
  if (scope === 'audio') {
    return 'Audio';
  }
  return scope === 'video' && isAudioLibrarySupported() ? 'Videos' : 'Library';
}

const NOUNS: Record<MediaScope, [singular: string, plural: string]> = {
  video: ['video', 'videos'],
  audio: ['audio file', 'audio files'],
  all: ['file', 'files'],
};

export function formatMediaCount(count: number, scope: MediaScope): string {
  const [singular, plural] = NOUNS[scope];
  return `${count} ${count === 1 ? singular : plural}`;
}

interface ScopeCopy {
  searchLabel: string;
  noMatches: (query: string) => string;
  continueHeading: string;
  emptyTitle: string;
  emptyMessage: string;
  scanError: string;
  folderEmpty: string;
  requestTitle: string;
  requestMessage: string;
  blockedTitle: string;
  blockedMessage: string;
  unavailableTitle: string;
  unavailableMessage: string;
}

export const SCOPE_COPY: Record<MediaScope, ScopeCopy> = {
  video: {
    searchLabel: 'Search videos',
    noMatches: query => `No video names contain “${query}”.`,
    continueHeading: 'Continue watching',
    emptyTitle: 'No videos yet',
    emptyMessage:
      'Videos you record, download or copy to this device will show up here.',
    scanError: 'Something went wrong while scanning for videos.',
    folderEmpty: 'It no longer contains any videos.',
    requestTitle: 'See your videos',
    requestMessage:
      "ZX Player reads your device's video library to show your folders. Your videos never leave your device.",
    blockedTitle: 'Access to videos is off',
    blockedMessage:
      'Turn on video access for ZX Player in Settings to browse your library.',
    unavailableTitle: 'Video library unavailable',
    unavailableMessage:
      "This device doesn't allow apps to read its video library.",
  },
  audio: {
    searchLabel: 'Search audio',
    noMatches: query => `No titles, artists or albums contain “${query}”.`,
    continueHeading: 'Continue listening',
    emptyTitle: 'No audio yet',
    emptyMessage:
      'Music, recordings and other audio on this device will show up here.',
    scanError: 'Something went wrong while scanning for audio.',
    folderEmpty: 'It no longer contains any audio.',
    requestTitle: 'Play your music and audio',
    requestMessage:
      "ZX Player reads your device's audio files to show your folders. Your files never leave your device.",
    blockedTitle: 'Access to audio is off',
    blockedMessage:
      'Turn on music and audio access for ZX Player in Settings to browse your audio.',
    unavailableTitle: 'Audio library unavailable',
    unavailableMessage:
      "This device doesn't allow apps to read its audio files.",
  },
  all: {
    searchLabel: 'Search videos and audio',
    noMatches: query => `Nothing in your library matches “${query}”.`,
    continueHeading: 'Continue watching',
    emptyTitle: 'Nothing here yet',
    emptyMessage:
      'Videos and audio you record, download or copy to this device will show up here.',
    scanError: 'Something went wrong while scanning your library.',
    folderEmpty: 'It no longer contains any videos or audio.',
    requestTitle: 'See your videos and music',
    requestMessage:
      "ZX Player reads your device's videos and audio files to show your folders. Your files never leave your device.",
    blockedTitle: 'Access to your media is off',
    blockedMessage:
      'Turn on video and audio access for ZX Player in Settings to browse your library.',
    unavailableTitle: 'Media library unavailable',
    unavailableMessage:
      "This device doesn't allow apps to read its videos and audio.",
  },
};
