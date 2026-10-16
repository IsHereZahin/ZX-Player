import React from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  CameraRoll,
  iosReadGalleryPermission,
  iosRequestReadWriteGalleryPermission,
} from '@react-native-camera-roll/camera-roll';
import { getFolders, getMedia } from 'zxplayer-media';

import type { LibraryStackScreenProps } from '../../../../app/navigation/types';
import { makeVideo, sampleAlbums, sampleSong } from '../../../../test/fixtures';
import {
  lastPlaybackRequest,
  mockNavigation,
  screenProps,
} from '../../../../test/navigation';
import { recordProgress } from '../../../history/watchHistory';
import { updateSettings } from '../../../settings/settingsStore';
import { LibraryScreen } from '../LibraryScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../../test/navigation').mockNavigation,
}));

const getAlbums = CameraRoll.getAlbums as jest.Mock;
const readPermission = iosReadGalleryPermission as jest.Mock;
const requestPermission = iosRequestReadWriteGalleryPermission as jest.Mock;

async function renderScreen(tab: 'Library' | 'Audio' = 'Library') {
  await render(
    <LibraryScreen
      {...screenProps<LibraryStackScreenProps<'LibraryHome'>>('LibraryHome', {
        tab,
      })}
    />,
  );
}

/** Android 14 with every media permission granted and the native library mocked. */
function useAndroidLibrary() {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LibraryScreen', () => {
  it('lists video folders and opens one', async () => {
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    await renderScreen();

    expect(await screen.findByText('All videos')).toBeOnTheScreen();
    expect(screen.getByText('Camera')).toBeOnTheScreen();
    expect(screen.getByText('3 videos')).toBeOnTheScreen();
    expect(screen.queryByText('Empty')).toBeNull();
    expect(screen.queryByTestId('continue-watching')).toBeNull();

    await fireEvent.press(screen.getByText('Downloads'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('FolderVideos', {
      folder: expect.objectContaining({ title: 'Downloads', count: 2 }),
    });
  });

  it('offers unfinished videos in a Continue watching rail', async () => {
    const lecture = makeVideo('7', {
      fileName: 'Lecture.mp4',
      durationSec: 1200,
    });
    recordProgress(lecture, 300, 1200);
    recordProgress(makeVideo('8'), 600, 600); // finished: not offered
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    await renderScreen();

    expect(await screen.findByText('Continue watching')).toBeOnTheScreen();
    expect(screen.getByText('15 min left')).toBeOnTheScreen();
    expect(screen.queryByTestId('continue-8')).toBeNull();

    await fireEvent.press(screen.getByTestId('continue-7'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Player');
    expect(lastPlaybackRequest()).toEqual({
      queue: [lecture],
      startIndex: 0,
      startFromBeginning: false,
    });
  });

  it('opens Favorites from the Library group', async () => {
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    await renderScreen();
    await fireEvent.press(await screen.findByTestId('open-favorites'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Favorites', {
      scope: 'video',
    });
  });

  it('opens search from the header', async () => {
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    await renderScreen();
    await fireEvent.press(screen.getByTestId('open-search'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Search', {
      scope: 'video',
    });
  });

  it('asks for access first and loads the library once granted', async () => {
    readPermission.mockResolvedValueOnce('not-determined');
    requestPermission.mockResolvedValueOnce('granted');
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    await renderScreen();

    // First run greets the user with the app logo above the request.
    expect(await screen.findByText('See your videos')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('ZX Player logo')).toHaveLength(2);

    await fireEvent.press(await screen.findByText('Allow access'));

    expect(requestPermission).toHaveBeenCalled();
    expect(await screen.findByText('Camera')).toBeOnTheScreen();
  });

  it('sends the user to Settings when access is blocked', async () => {
    readPermission.mockResolvedValueOnce('denied');
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    await renderScreen();

    await fireEvent.press(await screen.findByText('Open Settings'));
    expect(openSettings).toHaveBeenCalled();
    expect(getAlbums).not.toHaveBeenCalled();
  });

  it('shows an empty state when the device has no videos', async () => {
    getAlbums.mockResolvedValueOnce([]);
    await renderScreen();
    expect(await screen.findByText('No videos yet')).toBeOnTheScreen();
  });

  it('recovers from a failed scan with "Try again"', async () => {
    getAlbums.mockRejectedValueOnce(new Error('MediaStore unavailable'));
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    await renderScreen();

    await fireEvent.press(await screen.findByText('Try again'));
    expect(await screen.findByText('Camera')).toBeOnTheScreen();
  });

  describe('audio on Android', () => {
    it('lists audio folders in the Audio tab', async () => {
      useAndroidLibrary();
      (getFolders as jest.Mock).mockResolvedValueOnce([
        { id: '7', name: 'Music', count: 12 },
      ]);
      recordProgress(sampleSong, 60, 214);

      await renderScreen('Audio');

      expect(screen.getByRole('header', { name: 'Audio' })).toBeOnTheScreen();
      expect(await screen.findByText('Music')).toBeOnTheScreen();
      expect(screen.getByText('All audio')).toBeOnTheScreen();
      expect(screen.getAllByText('12 audio files')).toHaveLength(2);
      expect(screen.getByText('Continue listening')).toBeOnTheScreen();
      expect(getFolders).toHaveBeenCalledWith('audio');
    });

    it('shows videos and audio together when set to', async () => {
      useAndroidLibrary();
      updateSettings({ libraryLayout: 'together' });
      (getFolders as jest.Mock)
        .mockResolvedValueOnce([{ id: '1', name: 'Downloads', count: 2 }])
        .mockResolvedValueOnce([{ id: '1', name: 'Downloads', count: 1 }]);

      await renderScreen();

      expect(screen.getByRole('header', { name: 'Library' })).toBeOnTheScreen();
      expect(await screen.findByText('All media')).toBeOnTheScreen();
      expect(screen.getAllByText('3 files')).toHaveLength(2);
    });

    it('shows what was recently added, with a shelf and a count', async () => {
      useAndroidLibrary();
      (getFolders as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Camera', count: 1 },
      ]);
      (getMedia as jest.Mock).mockResolvedValue({
        items: [
          {
            ...makeVideo('9', { fileName: 'Fresh.mp4' }),
            addedAtSec: Date.now() / 1000 - 3600,
            title: null,
            artist: null,
            album: null,
          },
        ],
        hasMore: false,
      });

      await renderScreen();

      expect(await screen.findByTestId('recently-added-9')).toBeOnTheScreen();
      expect(screen.getByLabelText('Fresh, Today')).toBeOnTheScreen();
      expect(screen.getByLabelText('Recently Added, 1')).toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('recently-added-see-all'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('RecentlyAdded', {
        scope: 'video',
      });
    });

    it('rescans when the layout changes', async () => {
      useAndroidLibrary();
      await renderScreen();
      expect(screen.getByRole('header', { name: 'Videos' })).toBeOnTheScreen();

      await act(async () => updateSettings({ libraryLayout: 'together' }));

      expect(screen.getByRole('header', { name: 'Library' })).toBeOnTheScreen();
      expect(getFolders).toHaveBeenLastCalledWith('audio');
    });
  });
});
