import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import {
  makePhotoIdentifier,
  makeVideo,
  sampleFolder,
  sampleSong,
} from '../../../test/fixtures';
import { screenProps } from '../../../test/navigation';
import {
  favoritesStore,
  MAX_FAVORITES,
  parseFavorites,
  setFavorite,
  toggleFavorite,
} from '../favorites';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { FolderVideosScreen } from '../screens/FolderVideosScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../test/navigation').mockNavigation,
}));

describe('favorites store', () => {
  it('toggles an item in and out', () => {
    const video = makeVideo('1');
    toggleFavorite(video);
    expect(favoritesStore.getState()['1'].item).toEqual(video);
    toggleFavorite(video);
    expect(favoritesStore.getState()).toEqual({});
  });

  it('keeps the newest favorites when over the cap', () => {
    for (let i = 0; i <= MAX_FAVORITES; i += 1) {
      setFavorite(makeVideo(String(i)), true, i);
    }
    const ids = Object.keys(favoritesStore.getState());
    expect(ids).toHaveLength(MAX_FAVORITES);
    expect(ids).not.toContain('0');
  });

  it('drops malformed stored entries', () => {
    const valid = { item: makeVideo('1'), addedAt: 5 };
    expect(
      parseFavorites({
        '1': valid,
        '2': { item: { id: '2' }, addedAt: 1 },
        '3': { item: makeVideo('3'), addedAt: 'x' },
        mismatched: valid,
      }),
    ).toEqual({ '1': valid });
  });
});

describe('FavoritesScreen', () => {
  async function renderFavorites(scope: 'video' | 'audio' | 'all') {
    await render(
      <FavoritesScreen
        {...screenProps<LibraryStackScreenProps<'Favorites'>>('Favorites', {
          scope,
        })}
      />,
    );
  }

  it('lists favorites of the tab, newest first', async () => {
    setFavorite(makeVideo('1', { fileName: 'Old.mp4' }), true, 1);
    setFavorite(makeVideo('2', { fileName: 'New.mp4' }), true, 2);
    setFavorite(sampleSong, true, 3);

    await renderFavorites('video');

    expect(screen.getByText('2 videos')).toBeOnTheScreen();
    const titles = screen
      .getAllByText(/^(Old|New)$/)
      .map(node => node.props.children);
    expect(titles).toEqual(['New', 'Old']);
    expect(screen.queryByText('Night Drive')).toBeNull();
  });

  it('explains how to add favorites when there are none', async () => {
    await renderFavorites('all');
    expect(screen.getByText('No favorites yet')).toBeOnTheScreen();
  });
});

describe('favoriting from a list', () => {
  it('adds and removes through the item menu', async () => {
    (CameraRoll.getPhotos as jest.Mock).mockResolvedValueOnce({
      edges: [makePhotoIdentifier('1')],
      page_info: { has_next_page: false },
    });
    await render(
      <FolderVideosScreen
        {...screenProps<LibraryStackScreenProps<'FolderVideos'>>(
          'FolderVideos',
          { folder: sampleFolder },
        )}
      />,
    );

    await fireEvent.press(await screen.findByTestId('video-more-1'));
    await fireEvent.press(screen.getByText('Add to Favorites'));
    expect(favoritesStore.getState()['1']).toBeDefined();

    await fireEvent.press(screen.getByTestId('video-more-1'));
    await fireEvent.press(screen.getByText('Remove from Favorites'));
    expect(favoritesStore.getState()['1']).toBeUndefined();
  });
});
