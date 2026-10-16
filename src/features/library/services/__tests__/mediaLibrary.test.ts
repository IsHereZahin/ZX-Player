import { Platform } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import {
  makePhotoIdentifier,
  sampleAlbums,
  sampleFolder,
} from '../../../../test/fixtures';
import {
  ALL_VIDEOS_FOLDER_ID,
  buildFolderList,
  describeFileName,
  fetchFolderVideos,
  fetchVideoFolders,
  toVideoItem,
  VIDEO_PAGE_SIZE,
} from '../mediaLibrary';

const getAlbums = CameraRoll.getAlbums as jest.Mock;
const getPhotos = CameraRoll.getPhotos as jest.Mock;

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

describe('fetchVideoFolders', () => {
  it('queries video albums of every type', async () => {
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    const folders = await fetchVideoFolders();
    expect(getAlbums).toHaveBeenCalledWith({
      assetType: 'Videos',
      albumType: 'All',
    });
    expect(folders).toHaveLength(3);
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
    await fetchFolderVideos({
      id: ALL_VIDEOS_FOLDER_ID,
      title: 'All videos',
      count: null,
      album: null,
    });
    expect(getPhotos.mock.calls[0][0]).not.toHaveProperty('groupName');
  });
});

describe('toVideoItem', () => {
  it('maps camera-roll fields', () => {
    expect(toVideoItem(makePhotoIdentifier('7'))).toEqual({
      id: '7',
      uri: 'content://media/external/video/media/7',
      fileName: 'clip-7.mp4',
      durationSec: 125,
      sizeBytes: 5 * 1024 * 1024,
      width: 1920,
      height: 1080,
      modifiedAtSec: 1_700_000_500,
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
