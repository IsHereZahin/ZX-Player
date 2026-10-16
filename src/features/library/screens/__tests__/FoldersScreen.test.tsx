import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  CameraRoll,
  iosReadGalleryPermission,
  iosRequestReadWriteGalleryPermission,
} from '@react-native-camera-roll/camera-roll';

import { sampleAlbums } from '../../../../test/fixtures';
import { createScreenProps } from '../../../../test/navigation';
import { FoldersScreen } from '../FoldersScreen';

const getAlbums = CameraRoll.getAlbums as jest.Mock;
const readPermission = iosReadGalleryPermission as jest.Mock;
const requestPermission = iosRequestReadWriteGalleryPermission as jest.Mock;

async function renderScreen() {
  const { props, navigation } = createScreenProps('Folders', undefined);
  await render(<FoldersScreen {...props} />);
  return navigation;
}

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('FoldersScreen', () => {
  it('lists video folders and opens one', async () => {
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    const navigation = await renderScreen();

    expect(await screen.findByText('All videos')).toBeOnTheScreen();
    expect(screen.getByText('Camera')).toBeOnTheScreen();
    expect(screen.getByText('3 videos')).toBeOnTheScreen();
    expect(screen.queryByText('Empty')).toBeNull();

    await fireEvent.press(screen.getByText('Downloads'));
    expect(navigation.navigate).toHaveBeenCalledWith('VideoList', {
      folder: expect.objectContaining({ title: 'Downloads', count: 2 }),
    });
  });

  it('asks for access first and loads the library once granted', async () => {
    readPermission.mockResolvedValueOnce('not-determined');
    requestPermission.mockResolvedValueOnce('granted');
    getAlbums.mockResolvedValueOnce(sampleAlbums);
    await renderScreen();

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
});
