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
  scope: 'video',
};

export const sampleVideo: VideoItem = {
  id: '101',
  kind: 'video',
  uri: 'content://media/external/video/media/101',
  fileName: 'Holiday trip.mp4',
  durationSec: 600,
  sizeBytes: 50 * 1024 * 1024,
  width: 1920,
  height: 1080,
  modifiedAtSec: 1_700_000_500,
};

export function makeVideo(
  id: string,
  overrides: Partial<VideoItem> = {},
): VideoItem {
  return {
    ...sampleVideo,
    id,
    uri: `content://media/external/video/media/${id}`,
    fileName: `Video ${id}.mp4`,
    ...overrides,
  };
}

export const sampleSong: VideoItem = {
  id: '501',
  kind: 'audio',
  uri: 'content://media/external/audio/media/501',
  fileName: 'track01.mp3',
  durationSec: 214,
  sizeBytes: 6 * 1024 * 1024,
  width: 0,
  height: 0,
  modifiedAtSec: 1_700_000_900,
  title: 'Night Drive',
  artist: 'The Blue Hours',
  album: 'Neon',
};

export function makeSong(
  id: string,
  overrides: Partial<VideoItem> = {},
): VideoItem {
  return {
    ...sampleSong,
    id,
    uri: `content://media/external/audio/media/${id}`,
    fileName: `Song ${id}.mp3`,
    title: `Song ${id}`,
    ...overrides,
  };
}

export const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,000
Hello <i>there</i>!

2
00:00:05,500 --> 00:00:07,250
Second line one
Second line two
`;

export const SAMPLE_ASS = `[Script Info]
Title: Sample
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour
Style: Default,Arial,20,&H00FFFFFF

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,{\\i1}Hello{\\i0}, world\\NSecond line
Comment: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,Not shown
Dialogue: 0,0:00:04.00,0:00:05.00,Default,,0,0,0,,{\\p1}m 0 0 l 100 0 100 100{\\p0}
Dialogue: 0,0:00:06.00,0:00:08.00,Default,,0,0,0,,Soft\\nbreak and\\hspace
`;
