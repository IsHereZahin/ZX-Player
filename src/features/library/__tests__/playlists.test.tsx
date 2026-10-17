import React from 'react';
import { Alert, Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { shareMedia } from 'zxplayer-media';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { shuffled } from '../../../shared/utils/shuffle';
import {
  makePhotoIdentifier,
  makeVideo,
  sampleFolder,
  sampleSong,
} from '../../../test/fixtures';
import {
  lastPlaybackRequest,
  mockNavigation,
  screenProps,
} from '../../../test/navigation';
import {
  addToPlaylist,
  createPlaylist,
  MAX_PLAYLISTS,
  parsePlaylists,
  playlistsStore,
  removeFromPlaylist,
  renamePlaylist,
} from '../playlists';
import { FolderVideosScreen } from '../screens/FolderVideosScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../test/navigation').mockNavigation,
}));

const getPhotos = CameraRoll.getPhotos as jest.Mock;

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderFolder() {
  getPhotos.mockResolvedValue({
    edges: [makePhotoIdentifier('1'), makePhotoIdentifier('2')],
    page_info: { has_next_page: false },
  });
  await render(
    <FolderVideosScreen
      {...screenProps<LibraryStackScreenProps<'FolderVideos'>>('FolderVideos', {
        folder: sampleFolder,
      })}
    />,
  );
  await screen.findByTestId('video-1');
}

describe('playlists store', () => {
  it('creates, renames and fills playlists without duplicates', () => {
    const id = createPlaylist('  Road   trip  ', [makeVideo('1')], 10);
    expect(id).not.toBeNull();
    addToPlaylist(id!, [makeVideo('1'), sampleSong], 20);
    renamePlaylist(id!, 'Summer');

    const [playlist] = playlistsStore.getState();
    expect(playlist.name).toBe('Summer');
    expect(playlist.items.map(item => item.id)).toEqual(['1', sampleSong.id]);

    removeFromPlaylist(id!, '1');
    expect(playlistsStore.getState()[0].items).toHaveLength(1);
  });

  it('refuses blank names and too many playlists', () => {
    expect(createPlaylist('   ')).toBeNull();
    for (let i = 0; i < MAX_PLAYLISTS; i += 1) {
      createPlaylist(`P${i}`);
    }
    expect(createPlaylist('One more')).toBeNull();
  });

  it('drops malformed stored playlists and items', () => {
    const parsed = parsePlaylists([
      {
        id: 'a',
        name: 'Good',
        items: [makeVideo('1'), { id: 'broken' }],
        createdAt: 1,
        updatedAt: 2,
      },
      { id: 'b', name: '', items: [], createdAt: 1, updatedAt: 1 },
      'nonsense',
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].items.map(item => item.id)).toEqual(['1']);
  });
});

describe('adding to a playlist from a menu', () => {
  it('creates a new playlist with the item', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await renderFolder();

    await fireEvent.press(screen.getByTestId('video-more-1'));
    await fireEvent.press(screen.getByTestId('action-add-to-playlist'));
    await fireEvent.press(screen.getByTestId('add-to-new-playlist'));
    await fireEvent.changeText(
      screen.getByTestId('playlist-name-input'),
      'Favourites mix',
    );
    await fireEvent.press(screen.getByTestId('playlist-name-confirm'));

    const [playlist] = playlistsStore.getState();
    expect(playlist.name).toBe('Favourites mix');
    expect(playlist.items.map(item => item.id)).toEqual(['1']);
  });

  it('adds to an existing playlist', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const id = createPlaylist('Mix')!;
    await renderFolder();

    await fireEvent.press(screen.getByTestId('video-more-2'));
    await fireEvent.press(screen.getByTestId('action-add-to-playlist'));
    await fireEvent.press(screen.getByTestId(`add-to-playlist-${id}`));

    expect(playlistsStore.getState()[0].items.map(item => item.id)).toEqual([
      '2',
    ]);
  });

  it('adds a selection to a playlist', async () => {
    const id = createPlaylist('Mix')!;
    await renderFolder();

    // In a folder, a long press starts selecting instead of opening the menu.
    await fireEvent(screen.getByTestId('video-1'), 'longPress');
    await fireEvent.press(screen.getByTestId('video-2'));
    expect(screen.getByText('2 selected')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('selection-playlist'));
    await fireEvent.press(screen.getByTestId(`add-to-playlist-${id}`));
    expect(playlistsStore.getState()[0].items.map(item => item.id)).toEqual([
      '1',
      '2',
    ]);
  });
});

describe('sharing', () => {
  it('shares the library file on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await renderFolder();
    await fireEvent.press(screen.getByTestId('video-more-1'));
    await fireEvent.press(screen.getByTestId('action-share'));
    expect(shareMedia).toHaveBeenCalledWith(
      'content://media/external/video/media/1',
      'clip-1',
    );
  });

  it('is not offered on iOS', async () => {
    await renderFolder();
    await fireEvent.press(screen.getByTestId('video-more-1'));
    expect(screen.queryByTestId('action-share')).toBeNull();
  });
});

describe('shuffle', () => {
  it('shuffles a copy without losing anything', () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffled(items, () => 0);
    expect(result).not.toEqual(items);
    expect([...result].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it('plays the folder in a shuffled order', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await renderFolder();
    await fireEvent.press(screen.getByTestId('shuffle-all'));
    expect(lastPlaybackRequest()?.queue.map(item => item.id)).toEqual([
      '2',
      '1',
    ]);
  });
});

describe('Playlists and Playlist screens', () => {
  it('creates a playlist and opens it', async () => {
    await render(
      <PlaylistsScreen
        {...screenProps<LibraryStackScreenProps<'Playlists'>>('Playlists', {
          scope: 'video',
        })}
      />,
    );
    expect(screen.getByText('No playlists yet')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('new-playlist'));
    await fireEvent.changeText(
      screen.getByTestId('playlist-name-input'),
      'Lectures',
    );
    await fireEvent.press(screen.getByTestId('playlist-name-confirm'));

    const [playlist] = playlistsStore.getState();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Playlist', {
      id: playlist.id,
    });
    expect(screen.getByText('Lectures')).toBeOnTheScreen();
  });

  it('plays, removes items, renames and deletes', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const id = createPlaylist('Mix', [makeVideo('1'), sampleSong])!;
    await render(
      <PlaylistScreen
        {...screenProps<LibraryStackScreenProps<'Playlist'>>('Playlist', {
          id,
        })}
      />,
    );
    expect(screen.getByText('2 files')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('play-all'));
    expect(lastPlaybackRequest()?.queue).toHaveLength(2);

    await fireEvent.press(screen.getByTestId('video-more-1'));
    await fireEvent.press(screen.getByTestId('action-remove-from-playlist'));
    expect(screen.getByText('1 file')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('playlist-options'));
    await fireEvent.press(screen.getByTestId('playlist-rename'));
    await fireEvent.changeText(
      screen.getByTestId('playlist-name-input'),
      'Night mix',
    );
    await fireEvent.press(screen.getByTestId('playlist-name-confirm'));
    expect(playlistsStore.getState()[0].name).toBe('Night mix');

    const alert = jest.spyOn(Alert, 'alert');
    await fireEvent.press(screen.getByTestId('playlist-options'));
    await fireEvent.press(screen.getByTestId('playlist-delete'));
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => buttons[1].onPress?.());
    expect(playlistsStore.getState()).toEqual([]);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
