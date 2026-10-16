import type {
  Album,
  PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';

import type { VideoFolder, VideoItem } from '../features/library/types';

/** Mock media library used by unit and integration tests. */
export const sampleAlbums: Album[] = [
  { id: '11', title: 'Camera', count: 3, type: 'Album' },
  { id: '12', title: 'Downloads', count: 2, type: 'Album' },
  { id: '13', title: 'Empty', count: 0, type: 'Album' },
];

export function makePhotoIdentifier(
  id: string,
  overrides: Partial<PhotoIdentifier['node']['image']> = {},
): PhotoIdentifier {
  return {
    node: {
      id,
      type: 'video/mp4',
      subTypes: 'VideoStreamed',
      sourceType: 'UserLibrary',
      group_name: ['Camera'],
      image: {
        filename: `clip-${id}.mp4`,
        filepath: null,
        extension: 'mp4',
        uri: `content://media/external/video/media/${id}`,
        height: 1080,
        width: 1920,
        fileSize: 5 * 1024 * 1024,
        playableDuration: 125,
        orientation: null,
        ...overrides,
      },
      timestamp: 1_700_000_000,
      modificationTimestamp: 1_700_000_500,
      location: null,
    },
  };
}

export const sampleFolder: VideoFolder = {
  id: 'Album:Camera',
  title: 'Camera',
  count: 3,
  album: { name: 'Camera', kind: 'Album' },
};

export const sampleVideo: VideoItem = {
  id: '101',
  uri: 'content://media/external/video/media/101',
  fileName: 'Holiday trip.mp4',
  durationSec: 600,
  sizeBytes: 50 * 1024 * 1024,
  width: 1920,
  height: 1080,
  modifiedAtSec: 1_700_000_500,
};
