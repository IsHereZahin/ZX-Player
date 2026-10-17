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
import { darkColors, lightColors, paletteFor } from '../../shared/theme';
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
    // The tab bar draws only icons, so each tab is named for screen readers.
    expect(screen.getByRole('tab', { name: 'Recent' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Settings' })).not.toBeSelected();

    await fireEvent.press(screen.getByTestId('tab-settings'));
    expect(await screen.findByText('Resume playback')).toBeOnTheScreen();
  });

  it('opens About inside the Settings tab, keeping the tab bar', async () => {
    (CameraRoll.getAlbums as jest.Mock).mockResolvedValueOnce(sampleAlbums);
    await render(<App />);
    await screen.findByText('Camera');

    await fireEvent.press(screen.getByTestId('tab-settings'));
    await fireEvent.press(await screen.findByTestId('setting-about'));

    expect(await screen.findByTestId('about-version')).toHaveTextContent(
      'Version 1.10 (11)',
    );
    expect(screen.getByTestId('tab-settings')).toBeOnTheScreen();
  });

  it('opens folders inside the tab, keeping the tab bar', async () => {
    (CameraRoll.getAlbums as jest.Mock).mockResolvedValueOnce(sampleAlbums);
    await render(<App />);

    await fireEvent.press(await screen.findByText('Camera'));

    expect(
      await screen.findByRole('header', { name: 'Camera' }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('tab-recent')).toBeOnTheScreen();
  });

  it('follows the chosen theme and passes it on to native UI', async () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    (CameraRoll.getAlbums as jest.Mock).mockResolvedValueOnce(sampleAlbums);
    await render(<App />);
    await screen.findByText('Camera');

    await act(async () => updateSettings({ appearance: 'light' }));
    expect(screenBackground('library-screen')).toBe(lightColors.canvas);
    expect(setColorScheme).toHaveBeenLastCalledWith('light');

    await act(async () => updateSettings({ appearance: 'dark' }));
    expect(screenBackground('library-screen')).toBe(darkColors.canvas);

    await act(async () => updateSettings({ colorTheme: 'forest' }));
    expect(screenBackground('library-screen')).toBe(
      paletteFor('dark', 'forest').canvas,
    );

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
