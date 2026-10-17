import { Platform } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import * as nativeMedia from 'zxplayer-media';
import type { NativeMediaItem } from 'zxplayer-media';

import {
  makeBucket,
  makePhotoIdentifier,
  sampleAlbums,
  sampleFolder,
} from '../../../../test/fixtures';
import {
  ALL_VIDEOS_FOLDER_ID,
  allMediaFolder,
  buildFolderList,
  buildFolderListFromBuckets,
  describeFileName,
  fetchAllFolderMedia,
  fetchFolderVideos,
  fetchFolders,
  fromNativeItem,
  NATIVE_PAGE_SIZE,
  toVideoItem,
  VIDEO_PAGE_SIZE,
} from '../mediaLibrary';
import type { VideoFolder } from '../../types';

const getAlbums = CameraRoll.getAlbums as jest.Mock;
const getPhotos = CameraRoll.getPhotos as jest.Mock;
const getNativeFolders = nativeMedia.getFolders as jest.Mock;
const getNativeMedia = nativeMedia.getMedia as jest.Mock;

function makeNativeVideo(
  id: string,
  overrides: Partial<NativeMediaItem> = {},
): NativeMediaItem {
  return {
    id,
    uri: `content://media/external/video/media/${id}`,
    fileName: `clip-${id}.mp4`,
    sizeBytes: 1024,
    durationSec: 90,
    width: 1280,
    height: 720,
    modifiedAtSec: 1_700_000_000,
    addedAtSec: 1_699_000_000,
    title: null,
    artist: null,
    album: null,
    ...overrides,
  };
}

function makeNativeSong(
  id: string,
  overrides: Partial<NativeMediaItem> = {},
): NativeMediaItem {
  return makeNativeVideo(id, {
    uri: `content://media/external/audio/media/${id}`,
    fileName: `track-${id}.mp3`,
    width: 0,
    height: 0,
    title: `Track ${id}`,
    artist: 'Artist',
    album: 'Album',
    ...overrides,
  });
}

const cameraBucket: VideoFolder = {
  id: 'bucket:-1739773001',
  title: 'Camera',
  count: 3,
  album: { name: 'Camera', kind: 'Album' },
  bucketId: '-1739773001',
  scope: 'video',
};

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('buildFolderList', () => {
  it('drops empty albums, sorts by title and leads with "All videos"', () => {
    const folders = buildFolderList(
      [{ id: '3', title: 'zoo', count: 1, type: 'Album' }, ...sampleAlbums],
      true,
    );
    expect(folders.map(folder => folder.title)).toEqual([
      'All videos',
      'Camera',
      'Downloads',
      'zoo',
    ]);
    expect(folders[0]).toEqual({
      id: ALL_VIDEOS_FOLDER_ID,
      title: 'All videos',
      count: 6,
      album: null,
      scope: 'video',
    });
  });

  it('reports no total on iOS, where albums overlap', () => {
    expect(buildFolderList(sampleAlbums, false)[0].count).toBeNull();
  });

  it('keys folders by album kind so same-named albums stay distinct', () => {
    const folders = buildFolderList(
      [
        { id: 'a', title: 'Videos', count: 4, type: 'SmartAlbum' },
        { id: 'b', title: 'Videos', count: 2, type: 'Album' },
      ],
      false,
    );
    expect(
      folders
        .slice(1)
        .map(folder => folder.id)
        .sort(),
    ).toEqual(['Album:Videos', 'SmartAlbum:Videos']);
  });
});

describe('buildFolderListFromBuckets', () => {
  it('drops empty buckets, sorts by title and totals the library', () => {
    const folders = buildFolderListFromBuckets([
      makeBucket('3', 'zoo', 1),
      makeBucket('1', 'Camera', 3),
      makeBucket('2', 'Empty', 0),
    ]);
    expect(folders.map(folder => folder.title)).toEqual([
      'All videos',
      'Camera',
      'zoo',
    ]);
    expect(folders[0].count).toBe(4);
    expect(folders[1]).toEqual({
      id: 'bucket:1',
      title: 'Camera',
      count: 3,
      album: { name: 'Camera', kind: 'Album' },
      bucketId: '1',
      relativePath: null,
      newIds: [],
      scope: 'video',
    });
  });

  it('collects new items per folder and for the whole library', () => {
    const folders = buildFolderListFromBuckets(
      [
        makeBucket('1', 'Camera', 3, {
          relativePath: 'DCIM/Camera/',
          newIds: ['10'],
        }),
        makeBucket('1', 'Camera', 1, { newIds: ['11'] }),
        makeBucket('2', 'Movies', 2, { newIds: ['12'] }),
      ],
      'all',
    );
    expect(folders[0].newIds).toEqual(['10', '11', '12']);
    expect(folders[1]).toMatchObject({
      relativePath: 'DCIM/Camera/',
      newIds: ['10', '11'],
    });
  });

  it('keeps same-named folders apart by bucket id', () => {
    const folders = buildFolderListFromBuckets([
      makeBucket('1', 'Movies', 2),
      makeBucket('2', 'Movies', 5),
    ]);
    expect(folders.slice(1).map(folder => folder.id)).toEqual([
      'bucket:1',
      'bucket:2',
    ]);
  });
});

describe('fetchFolders', () => {
  it('queries video albums of every type', async () => {
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    const folders = await fetchFolders();
    expect(getAlbums).toHaveBeenCalledWith({
      assetType: 'Videos',
      albumType: 'All',
    });
    expect(folders).toHaveLength(3);
  });

  it('reads MediaStore buckets natively on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    getNativeFolders.mockResolvedValueOnce([makeBucket('1', 'Camera', 3)]);

    const folders = await fetchFolders();

    expect(getAlbums).not.toHaveBeenCalled();
    expect(folders.map(folder => folder.id)).toEqual([
      ALL_VIDEOS_FOLDER_ID,
      'bucket:1',
    ]);
  });

  it('falls back to camera-roll when the native module is missing', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.replaceProperty(nativeMedia, 'isNativeMediaAvailable', false);
    getAlbums.mockResolvedValueOnce(sampleAlbums);

    await fetchFolders();

    expect(getNativeFolders).not.toHaveBeenCalled();
    expect(getAlbums).toHaveBeenCalled();
  });
});

describe('fetchAllFolderMedia on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('pages through the bucket and reports progress after each page', async () => {
    getNativeMedia
      .mockResolvedValueOnce({
        items: [makeNativeVideo('1'), makeNativeVideo('2')],
        hasMore: true,
      })
      .mockResolvedValueOnce({
        // A file added between queries shifts the window; "2" repeats.
        items: [makeNativeVideo('2'), makeNativeVideo('3')],
        hasMore: false,
      });
    const onPage = jest.fn();

    const videos = await fetchAllFolderMedia(cameraBucket, onPage);

    expect(getNativeMedia).toHaveBeenNthCalledWith(
      1,
      'video',
      '-1739773001',
      0,
      NATIVE_PAGE_SIZE,
    );
    expect(getNativeMedia).toHaveBeenNthCalledWith(
      2,
      'video',
      '-1739773001',
      2,
      NATIVE_PAGE_SIZE,
    );
    expect(videos.map(video => video.id)).toEqual(['1', '2', '3']);
    expect(onPage).toHaveBeenCalledTimes(2);
    expect(getPhotos).not.toHaveBeenCalled();
  });

  it('queries every bucket for "All videos"', async () => {
    await fetchAllFolderMedia(allMediaFolder('video'));
    expect(getNativeMedia).toHaveBeenCalledWith(
      'video',
      null,
      0,
      NATIVE_PAGE_SIZE,
    );
  });

  it('stops after the current page once cancelled', async () => {
    getNativeMedia.mockResolvedValue({
      items: [makeNativeVideo('1')],
      hasMore: true,
    });

    const videos = await fetchAllFolderMedia(
      cameraBucket,
      undefined,
      () => true,
    );

    expect(getNativeMedia).toHaveBeenCalledTimes(1);
    expect(videos).toEqual([]);
  });

  it('uses camera-roll for a folder saved before bucket ids existed', async () => {
    await fetchAllFolderMedia(sampleFolder);
    expect(getNativeMedia).not.toHaveBeenCalled();
    expect(getPhotos.mock.calls[0][0].groupName).toBe('Camera');
  });
});

describe('fetchFolderVideos', () => {
  it('requests a page of videos in the album and maps them', async () => {
    getPhotos.mockResolvedValueOnce({
      edges: [makePhotoIdentifier('1'), makePhotoIdentifier('2')],
      page_info: { has_next_page: true, end_cursor: 'cursor-2' },
    });

    const page = await fetchFolderVideos(sampleFolder);

    expect(getPhotos).toHaveBeenCalledWith(
      expect.objectContaining({
        first: VIDEO_PAGE_SIZE,
        assetType: 'Videos',
        groupName: 'Camera',
        groupTypes: 'Album', // Jest runs as iOS by default
      }),
    );
    expect(getPhotos.mock.calls[0][0]).not.toHaveProperty('after');
    expect(page.nextCursor).toBe('cursor-2');
    expect(page.videos.map(video => video.id)).toEqual(['1', '2']);
  });

  it('passes the cursor and omits groupTypes on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    getPhotos.mockResolvedValueOnce({
      edges: [],
      page_info: { has_next_page: false },
    });

    const page = await fetchFolderVideos(sampleFolder, 'cursor-2');

    const params = getPhotos.mock.calls[0][0];
    expect(params.after).toBe('cursor-2');
    expect(params.groupName).toBe('Camera');
    expect(params).not.toHaveProperty('groupTypes');
    expect(page.nextCursor).toBeNull();
  });

  it('queries the whole library for the "All videos" folder', async () => {
    getPhotos.mockResolvedValueOnce({
      edges: [],
      page_info: { has_next_page: false },
    });
    await fetchFolderVideos(allMediaFolder('video'));
    expect(getPhotos.mock.calls[0][0]).not.toHaveProperty('groupName');
  });
});

describe('toVideoItem', () => {
  it('maps camera-roll fields', () => {
    expect(toVideoItem(makePhotoIdentifier('7'))).toEqual({
      id: '7',
      kind: 'video',
      uri: 'content://media/external/video/media/7',
      fileName: 'clip-7.mp4',
      durationSec: 125,
      sizeBytes: 5 * 1024 * 1024,
      width: 1920,
      height: 1080,
      modifiedAtSec: 1_700_000_500,
      addedAtSec: 1_700_000_000,
    });
  });

  it('tolerates missing optional metadata', () => {
    const item = toVideoItem(
      makePhotoIdentifier('8', {
        filename: null,
        fileSize: null,
        // The native layer can send null even though the type says number.
        playableDuration: null as unknown as number,
        uri: 'file:///storage/My%20Movie.mkv',
      }),
    );
    expect(item.fileName).toBe('My Movie.mkv');
    expect(item.sizeBytes).toBeNull();
    expect(item.durationSec).toBe(0);
  });
});

describe('fromNativeItem', () => {
  it('maps MediaStore rows', () => {
    expect(fromNativeItem(makeNativeVideo('7'), 'video')).toEqual({
      id: '7',
      kind: 'video',
      uri: 'content://media/external/video/media/7',
      fileName: 'clip-7.mp4',
      durationSec: 90,
      sizeBytes: 1024,
      width: 1280,
      height: 720,
      modifiedAtSec: 1_700_000_000,
      addedAtSec: 1_699_000_000,
    });
  });

  it('tolerates missing columns', () => {
    const item = fromNativeItem(
      makeNativeVideo('8', {
        fileName: '',
        sizeBytes: null,
        durationSec: Number.NaN,
        uri: 'file:///storage/My%20Movie.mkv',
      }),
      'video',
    );
    expect(item.fileName).toBe('My Movie.mkv');
    expect(item.sizeBytes).toBeNull();
    expect(item.durationSec).toBe(0);
  });

  it('keeps audio tags', () => {
    expect(fromNativeItem(makeNativeSong('9'), 'audio')).toMatchObject({
      kind: 'audio',
      title: 'Track 9',
      artist: 'Artist',
      album: 'Album',
    });
  });
});

describe('audio', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('lists audio folders from MediaStore', async () => {
    getNativeFolders.mockResolvedValueOnce([makeBucket('7', 'Music', 12)]);

    const folders = await fetchFolders('audio');

    expect(getNativeFolders).toHaveBeenCalledWith('audio', expect.any(Number));
    expect(folders.map(folder => [folder.title, folder.count])).toEqual([
      ['All audio', 12],
      ['Music', 12],
    ]);
    expect(folders.every(folder => folder.scope === 'audio')).toBe(true);
  });

  it('shows each directory once when video and audio are combined', async () => {
    getNativeFolders
      .mockResolvedValueOnce([makeBucket('1', 'Downloads', 2)])
      .mockResolvedValueOnce([
        makeBucket('1', 'Downloads', 3),
        makeBucket('7', 'Music', 4),
      ]);

    const folders = await fetchFolders('all');

    expect(folders.map(folder => [folder.title, folder.count])).toEqual([
      ['All media', 9],
      ['Downloads', 5],
      ['Music', 4],
    ]);
  });

  it('loads videos, then audio, for a combined folder', async () => {
    getNativeMedia
      .mockResolvedValueOnce({ items: [makeNativeVideo('1')], hasMore: false })
      .mockResolvedValueOnce({ items: [makeNativeSong('2')], hasMore: false });
    const onPage = jest.fn();

    const items = await fetchAllFolderMedia(
      { ...cameraBucket, scope: 'all' },
      onPage,
    );

    expect(getNativeMedia.mock.calls.map(call => call[0])).toEqual([
      'video',
      'audio',
    ]);
    expect(items.map(item => [item.id, item.kind])).toEqual([
      ['1', 'video'],
      ['2', 'audio'],
    ]);
    expect(onPage).toHaveBeenCalledTimes(2);
  });

  it('has no audio library on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await expect(fetchFolders('audio')).resolves.toEqual([]);
    await expect(fetchAllFolderMedia(allMediaFolder('audio'))).resolves.toEqual(
      [],
    );
    expect(getNativeFolders).not.toHaveBeenCalled();
  });
});

describe('describeFileName', () => {
  it.each([
    ['Holiday.mp4', { title: 'Holiday', extension: 'MP4' }],
    ['archive.final.mkv', { title: 'archive.final', extension: 'MKV' }],
    ['.hidden', { title: '.hidden', extension: null }],
    ['no-extension', { title: 'no-extension', extension: null }],
    ['trailing.', { title: 'trailing.', extension: null }],
  ])('splits %p', (input, expected) => {
    expect(describeFileName(input)).toEqual(expected);
  });
});
