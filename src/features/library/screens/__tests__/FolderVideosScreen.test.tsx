import React from 'react';
import { Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import type { RootStackScreenProps } from '../../../../app/navigation/types';
import { makePhotoIdentifier, sampleFolder } from '../../../../test/fixtures';
import { mockNavigation, screenProps } from '../../../../test/navigation';
import { historyStore, isFinished } from '../../../history/watchHistory';
import { libraryPrefsStore } from '../../libraryPrefs';
import { FolderVideosScreen } from '../FolderVideosScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../../test/navigation').mockNavigation,
}));

const getPhotos = CameraRoll.getPhotos as jest.Mock;

function page(ids: string[], nextCursor?: string) {
  return {
    edges: ids.map(id =>
      makePhotoIdentifier(id, { filename: `Episode ${id}.mp4` }),
    ),
    page_info: { has_next_page: Boolean(nextCursor), end_cursor: nextCursor },
  };
}

async function renderScreen() {
  await render(
    <FolderVideosScreen
      {...screenProps<RootStackScreenProps<'FolderVideos'>>('FolderVideos', {
        folder: sampleFolder,
      })}
    />,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

const playerQueueIds = () =>
  (
    mockNavigation.navigate.mock.calls.at(-1)?.[1].queue as { id: string }[]
  ).map(video => video.id);

describe('FolderVideosScreen', () => {
  it('loads every page and shows video details', async () => {
    getPhotos
      .mockResolvedValueOnce(page(['1', '2'], 'page-2'))
      .mockResolvedValueOnce(page(['3']));
    await renderScreen();

    expect(await screen.findByText('Episode 3')).toBeOnTheScreen();
    expect(screen.getByText('3 videos')).toBeOnTheScreen();
    expect(getPhotos).toHaveBeenLastCalledWith(
      expect.objectContaining({ after: 'page-2' }),
    );
    expect(screen.getAllByText('1080p · 5.0 MB · MP4')).toHaveLength(3);
    expect(screen.getAllByText('2:05')).toHaveLength(3);
  });

  it('plays a video with the folder as the queue', async () => {
    getPhotos.mockResolvedValueOnce(page(['1', '2', '3']));
    await renderScreen();

    await fireEvent.press(await screen.findByText('Episode 2'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Player', {
      queue: expect.any(Array),
      startIndex: 1,
      startFromBeginning: false,
    });
    expect(playerQueueIds()).toEqual(['1', '2', '3']);

    await fireEvent.press(screen.getByTestId('play-all'));
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith(
      'Player',
      expect.objectContaining({ startIndex: 0 }),
    );
  });

  it('sorts naturally by name and remembers the choice', async () => {
    getPhotos.mockResolvedValueOnce(page(['10', '2', '1']));
    await renderScreen();
    await screen.findByText('Episode 10');

    await fireEvent.press(screen.getByTestId('open-sort'));
    await fireEvent.press(screen.getByTestId('sort-name-asc'));

    expect(libraryPrefsStore.getState().sortKey).toBe('name');
    await fireEvent.press(screen.getByTestId('play-all'));
    expect(playerQueueIds()).toEqual(['1', '2', '10']);
  });

  it('switches between list and grid layouts', async () => {
    getPhotos.mockResolvedValueOnce(page(['1']));
    await renderScreen();
    await screen.findByText('Episode 1');

    await fireEvent.press(screen.getByLabelText('Show as grid'));
    expect(libraryPrefsStore.getState().viewMode).toBe('grid');
    expect(screen.getByLabelText('Show as list')).toBeOnTheScreen();
    expect(screen.getByText('Episode 1')).toBeOnTheScreen();
  });

  it('marks a video as watched from its menu', async () => {
    getPhotos.mockResolvedValueOnce(page(['1']));
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('video-more-1'));
    const menu = screen.getByTestId('video-actions');
    expect(within(menu).getByText('Play')).toBeOnTheScreen();
    await fireEvent.press(within(menu).getByText('Mark as watched'));

    expect(isFinished(historyStore.getState()['1'])).toBe(true);
    expect(screen.getByText('Watched')).toBeOnTheScreen();
  });

  it('shows video details from the menu', async () => {
    // On iOS the details sheet waits for the menu's native dismissal, which Jest's Modal
    // never reports; that deferral is covered in Sheet.test.tsx.
    jest.replaceProperty(Platform, 'OS', 'android');
    getPhotos.mockResolvedValueOnce(page(['1']));
    await renderScreen();
    await screen.findByText('Episode 1');

    await fireEvent.press(screen.getByTestId('video-more-1'));
    await fireEvent.press(screen.getByTestId('action-info'));
    const info = screen.getByTestId('video-info');
    expect(within(info).getByText('Episode 1.mp4')).toBeOnTheScreen();
    expect(within(info).getByText('1920 × 1080 (1080p)')).toBeOnTheScreen();
  });

  it('shows error and empty states', async () => {
    getPhotos.mockRejectedValueOnce(new Error('denied'));
    await renderScreen();
    expect(
      await screen.findByText("Couldn't load this folder"),
    ).toBeOnTheScreen();

    getPhotos.mockResolvedValueOnce(page([]));
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('This folder is empty')).toBeOnTheScreen();
  });
});
