import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { sampleAlbums } from '../../test/fixtures';
import App from '../App';

describe('App', () => {
  it('boots into the library and switches tabs', async () => {
    (CameraRoll.getAlbums as jest.Mock).mockResolvedValueOnce(sampleAlbums);
    await render(<App />);

    expect(await screen.findByText('Camera')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Library' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('tab-recent'));
    expect(await screen.findByText('Nothing watched yet')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('tab-settings'));
    expect(await screen.findByText('Resume playback')).toBeOnTheScreen();
  });

  it('restores saved settings before showing any screen', async () => {
    await AsyncStorage.setItem(
      'zxplayer.settings.v1',
      JSON.stringify({ resumePlayback: false }),
    );
    (CameraRoll.getAlbums as jest.Mock).mockResolvedValueOnce(sampleAlbums);
    await render(<App />);

    await screen.findByText('Camera');
    await fireEvent.press(screen.getByTestId('tab-settings'));
    expect(await screen.findByTestId('setting-resume')).not.toBeChecked();
  });
});
