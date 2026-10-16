import React from 'react';
import {
  Appearance,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { updateSettings } from '../../features/settings/settingsStore';
import { darkColors, lightColors } from '../../shared/theme';
import { sampleAlbums } from '../../test/fixtures';
import App from '../App';

const screenBackground = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;

afterEach(() => {
  jest.restoreAllMocks();
});

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

  it('follows the chosen theme and passes it on to native UI', async () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    (CameraRoll.getAlbums as jest.Mock).mockResolvedValueOnce(sampleAlbums);
    await render(<App />);
    await screen.findByText('Camera');

    await act(async () => updateSettings({ appearance: 'light' }));
    expect(screenBackground('library-screen')).toBe(lightColors.background);
    expect(setColorScheme).toHaveBeenLastCalledWith('light');

    await act(async () => updateSettings({ appearance: 'dark' }));
    expect(screenBackground('library-screen')).toBe(darkColors.background);

    await act(async () => updateSettings({ appearance: 'system' }));
    expect(setColorScheme).toHaveBeenLastCalledWith('auto');
    setColorScheme.mockRestore();
  });

  it('gives audio its own tab on Android unless set to show it together', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    await render(<App />);

    expect(
      await screen.findByRole('header', { name: 'Videos' }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('tab-audio'));
    expect(
      await screen.findByRole('header', { name: 'Audio' }),
    ).toBeOnTheScreen();

    await act(async () => updateSettings({ libraryLayout: 'together' }));
    expect(screen.queryByTestId('tab-audio')).toBeNull();
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
