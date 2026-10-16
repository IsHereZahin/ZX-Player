import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { makePhotoIdentifier, sampleFolder } from '../../../../test/fixtures';
import { createScreenProps } from '../../../../test/navigation';
import { VideoListScreen } from '../VideoListScreen';

const getPhotos = CameraRoll.getPhotos as jest.Mock;

async function renderScreen() {
  const { props, navigation } = createScreenProps('VideoList', {
    folder: sampleFolder,
  });
  await render(<VideoListScreen {...props} />);
  return navigation;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('VideoListScreen', () => {
  it('shows videos with metadata and opens the player', async () => {
    getPhotos.mockResolvedValueOnce({
      edges: [
        makePhotoIdentifier('1'),
        makePhotoIdentifier('2', { filename: 'Beach.mov' }),
      ],
      page_info: { has_next_page: false },
    });
    const navigation = await renderScreen();

    expect(await screen.findByText('clip-1')).toBeOnTheScreen();
    expect(screen.getByText('Beach')).toBeOnTheScreen();
    expect(screen.getAllByText('MP4 · 5.0 MB · 1920×1080')).toHaveLength(1);
    expect(screen.getAllByText('2:05')).toHaveLength(2);
    expect(navigation.setOptions).toHaveBeenCalledWith({ title: 'Camera' });

    await fireEvent.press(screen.getByText('Beach'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', {
      video: expect.objectContaining({ id: '2', fileName: 'Beach.mov' }),
    });
  });

  it('loads the next page when the end of the list is reached', async () => {
    getPhotos
      .mockResolvedValueOnce({
        edges: [makePhotoIdentifier('1')],
        page_info: { has_next_page: true, end_cursor: 'page-2' },
      })
      .mockResolvedValueOnce({
        edges: [makePhotoIdentifier('1'), makePhotoIdentifier('3')],
        page_info: { has_next_page: false },
      });
    await renderScreen();

    await fireEvent(await screen.findByTestId('videos-list'), 'endReached');

    expect(await screen.findByText('clip-3')).toBeOnTheScreen();
    expect(getPhotos).toHaveBeenLastCalledWith(
      expect.objectContaining({ after: 'page-2' }),
    );
    // The overlapping item from the second page is not duplicated.
    expect(screen.getAllByText('clip-1')).toHaveLength(1);
  });

  it('does not request more pages once the folder is exhausted', async () => {
    getPhotos.mockResolvedValueOnce({
      edges: [makePhotoIdentifier('1')],
      page_info: { has_next_page: false },
    });
    await renderScreen();

    await fireEvent(await screen.findByTestId('videos-list'), 'endReached');
    expect(getPhotos).toHaveBeenCalledTimes(1);
  });

  it('shows an error state with retry', async () => {
    getPhotos.mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce({
      edges: [makePhotoIdentifier('9')],
      page_info: { has_next_page: false },
    });
    await renderScreen();

    await fireEvent.press(await screen.findByText('Try again'));
    expect(await screen.findByText('clip-9')).toBeOnTheScreen();
  });

  it('shows an empty state for an empty folder', async () => {
    await renderScreen();
    expect(await screen.findByText('This folder is empty')).toBeOnTheScreen();
  });
});
