import React from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  copyMedia,
  deleteMedia,
  getFolders,
  getMedia,
  getTrashedMedia,
  moveMedia,
  trashMedia,
  type NativeMediaItem,
} from 'zxplayer-media';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { makeBucket, makeVideo } from '../../../test/fixtures';
import { screenProps } from '../../../test/navigation';
import { recordProgress } from '../../history/watchHistory';
import { FolderRow } from '../components/FolderRow';
import { favoritesStore, setFavorite } from '../favorites';
import { FolderVideosScreen } from '../screens/FolderVideosScreen';
import { describeExpiry, RecycleBinScreen } from '../screens/RecycleBinScreen';
import {
  cleanFolderName,
  destinationsFor,
  kindOfItems,
  newFolderPath,
} from '../services/fileOperations';
import type { VideoFolder } from '../types';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../test/navigation').mockNavigation,
}));

const DAY = 24 * 60 * 60;
const uriOf = (id: string) => `content://media/external/video/media/${id}`;

function nativeVideo(id: string): NativeMediaItem {
  return {
    id,
    uri: uriOf(id),
    fileName: `Clip ${id}.mp4`,
    sizeBytes: 5_000_000,
    durationSec: 125,
    width: 1920,
    height: 1080,
    modifiedAtSec: 1_700_000_000,
    addedAtSec: 1_700_000_000,
    title: null,
    artist: null,
    album: null,
  };
}

const cameraFolder: VideoFolder = {
  id: 'bucket:1',
  title: 'Camera',
  count: 2,
  album: { name: 'Camera', kind: 'Album' },
  bucketId: '1',
  relativePath: 'DCIM/Camera/',
  scope: 'video',
};

/** Android 14, where files can be managed; the folder holds clips 1 and 2. */
async function renderCameraFolder() {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
  jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
  (getMedia as jest.Mock).mockResolvedValue({
    items: [nativeVideo('1'), nativeVideo('2')],
    hasMore: false,
  });
  await render(
    <FolderVideosScreen
      {...screenProps<LibraryStackScreenProps<'FolderVideos'>>('FolderVideos', {
        folder: cameraFolder,
      })}
    />,
  );
  await screen.findByTestId('video-1');
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('file helpers', () => {
  it('cleans folder names into one safe path segment', () => {
    expect(cleanFolderName('  ../Trips: 2024/Summer  ')).toBe(
      'Trips 2024Summer',
    );
    expect(cleanFolderName('...')).toBe('');
    expect(newFolderPath('audio', 'Road  mix')).toBe('Music/Road mix/');
  });

  it('only offers folders that can hold the kind of media', () => {
    const folders = [
      { ...cameraFolder },
      {
        ...cameraFolder,
        id: 'bucket:2',
        title: 'Trips',
        relativePath: 'Movies/Trips/',
      },
      {
        ...cameraFolder,
        id: 'bucket:3',
        title: 'Downloads',
        relativePath: 'Download/',
      },
    ];
    expect(
      destinationsFor('video', folders, 'DCIM/Camera/').map(d => d.title),
    ).toEqual(['Trips']);
    expect(destinationsFor('audio', folders)).toEqual([]);
  });

  it('refuses to mix video and audio', () => {
    expect(kindOfItems([makeVideo('1'), makeVideo('2')])).toBe('video');
    expect(
      kindOfItems([makeVideo('1'), { ...makeVideo('2'), kind: 'audio' }]),
    ).toBeNull();
  });

  it('says when the recycle bin deletes a file', () => {
    const now = 1_000_000;
    expect(describeExpiry(now + 12 * DAY, now)).toBe('Deletes in 12 days');
    expect(describeExpiry(now + DAY / 2, now)).toBe('Deletes tomorrow');
    expect(describeExpiry(now - 10, now)).toBe('Deletes today');
  });
});

describe('selecting files in a folder', () => {
  it('deletes the selection to the recycle bin and forgets it', async () => {
    setFavorite(makeVideo('1'), true);
    await renderCameraFolder();

    await fireEvent(screen.getByTestId('video-1'), 'longPress');
    expect(screen.getByText('1 selected')).toBeOnTheScreen();
    expect(screen.queryByTestId('play-all')).toBeNull();

    (getMedia as jest.Mock).mockResolvedValue({
      items: [nativeVideo('2')],
      hasMore: false,
    });
    await fireEvent.press(screen.getByTestId('selection-delete'));

    expect(trashMedia).toHaveBeenCalledWith([uriOf('1')], true);
    expect(favoritesStore.getState()['1']).toBeUndefined();
    // The folder reloads without the deleted clip and the selection ends.
    expect(screen.queryByTestId('video-1')).toBeNull();
    expect(screen.getByRole('header', { name: 'Camera' })).toBeOnTheScreen();
  });

  it('keeps everything when the user declines Android’s prompt', async () => {
    (trashMedia as jest.Mock).mockResolvedValueOnce(false);
    setFavorite(makeVideo('1'), true);
    await renderCameraFolder();

    await fireEvent(screen.getByTestId('video-1'), 'longPress');
    await fireEvent.press(screen.getByTestId('selection-delete'));

    expect(favoritesStore.getState()['1']).toBeDefined();
    expect(screen.getByText('1 selected')).toBeOnTheScreen();
  });

  it('moves the selection to another folder', async () => {
    (getFolders as jest.Mock).mockResolvedValue([
      makeBucket('1', 'Camera', 2, { relativePath: 'DCIM/Camera/' }),
      makeBucket('5', 'Trips', 4, { relativePath: 'Movies/Trips/' }),
    ]);
    await renderCameraFolder();

    await fireEvent(screen.getByTestId('video-1'), 'longPress');
    await fireEvent.press(screen.getByTestId('select-all'));
    expect(screen.getByText('2 selected')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('selection-move'));
    // The folder the clips are already in is not offered.
    expect(
      await screen.findByTestId('destination-Movies/Trips/'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('destination-DCIM/Camera/')).toBeNull();

    await fireEvent.press(screen.getByTestId('destination-Movies/Trips/'));
    expect(moveMedia).toHaveBeenCalledWith(
      [uriOf('1'), uriOf('2')],
      'Movies/Trips/',
    );
    expect(ToastAndroid.show).toHaveBeenCalledWith(
      'Moved 2 videos to Trips',
      ToastAndroid.SHORT,
    );
  });

  it('copies one clip into a new folder from its menu', async () => {
    await renderCameraFolder();

    await fireEvent.press(screen.getByTestId('video-more-1'));
    await fireEvent.press(screen.getByTestId('action-copy'));
    await fireEvent.press(await screen.findByTestId('destination-new-folder'));
    await fireEvent.changeText(
      screen.getByTestId('folder-name-input'),
      'Holiday',
    );
    await fireEvent.press(screen.getByTestId('folder-name-confirm'));

    expect(copyMedia).toHaveBeenCalledWith([uriOf('1')], 'Movies/Holiday/');
  });

  it('explains when only some files could be moved', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    (moveMedia as jest.Mock).mockResolvedValueOnce({
      granted: true,
      done: 1,
      failed: 1,
    });
    (getFolders as jest.Mock).mockResolvedValue([
      makeBucket('5', 'Trips', 4, { relativePath: 'Movies/Trips/' }),
    ]);
    await renderCameraFolder();

    await fireEvent(screen.getByTestId('video-1'), 'longPress');
    await fireEvent.press(screen.getByTestId('video-2'));
    await fireEvent.press(screen.getByTestId('selection-move'));
    await fireEvent.press(
      await screen.findByTestId('destination-Movies/Trips/'),
    );

    expect(alert).toHaveBeenCalledWith('Moved 1 of 2', '1 could not be moved.');
  });

  it('is not offered where Android has no recycle bin', async () => {
    await renderCameraFolder();
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(29);

    await fireEvent.press(screen.getByTestId('video-more-1'));
    expect(screen.queryByTestId('action-delete')).toBeNull();
    expect(screen.queryByTestId('action-move')).toBeNull();
  });
});

describe('Recycle Bin', () => {
  async function renderBin() {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    (getTrashedMedia as jest.Mock).mockImplementation(async (kind: string) =>
      kind === 'video'
        ? [
            {
              ...nativeVideo('7'),
              expiresAtSec: Date.now() / 1000 + 10 * DAY - 60,
            },
          ]
        : [],
    );
    await render(
      <RecycleBinScreen
        {...screenProps<LibraryStackScreenProps<'RecycleBin'>>('RecycleBin', {
          scope: 'video',
        })}
      />,
    );
    await screen.findByTestId('video-7');
  }

  it('lists deleted files with when they go for good', async () => {
    await renderBin();
    expect(screen.getByText('Deletes in 10 days')).toBeOnTheScreen();
    expect(screen.getByText('1 video')).toBeOnTheScreen();
  });

  it('restores a file', async () => {
    await renderBin();
    await fireEvent.press(screen.getByTestId('video-7'));
    await fireEvent.press(screen.getByTestId('action-restore'));
    expect(trashMedia).toHaveBeenCalledWith([uriOf('7')], false);
  });

  it('empties the bin for good', async () => {
    await renderBin();
    (getTrashedMedia as jest.Mock).mockResolvedValue([]);
    await fireEvent.press(screen.getByTestId('recycle-bin-options'));
    await fireEvent.press(screen.getByTestId('empty-recycle-bin'));

    expect(deleteMedia).toHaveBeenCalledWith([uriOf('7')]);
    expect(await screen.findByText('Recycle Bin is empty')).toBeOnTheScreen();
  });
});

describe('new tags', () => {
  it('counts a folder’s new files until they are played', async () => {
    const folder: VideoFolder = { ...cameraFolder, newIds: ['1', '2'] };
    await render(<FolderRow folder={folder} onPress={jest.fn()} />);
    expect(screen.getByText('2 NEW')).toBeOnTheScreen();

    await act(async () => recordProgress(makeVideo('1'), 30, 600));
    expect(screen.getByText('NEW')).toBeOnTheScreen();

    await act(async () => recordProgress(makeVideo('2'), 30, 600));
    expect(screen.queryByTestId(`folder-new-${folder.id}`)).toBeNull();
  });
});
