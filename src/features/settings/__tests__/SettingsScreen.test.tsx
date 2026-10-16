import React from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MainTabScreenProps } from '../../../app/navigation/types';
import { screenProps } from '../../../test/navigation';
import { SettingsScreen } from '../SettingsScreen';
import { settingsStore } from '../settingsStore';

async function renderScreen() {
  await render(
    <SettingsScreen
      {...screenProps<MainTabScreenProps<'Settings'>>('Settings')}
    />,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SettingsScreen', () => {
  it('toggles playback and gesture preferences', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('setting-resume'));
    await fireEvent.press(screen.getByTestId('setting-gesture-volume'));

    expect(settingsStore.getState()).toMatchObject({
      resumePlayback: false,
      gestureVolume: false,
    });
    expect(screen.getByTestId('setting-resume')).not.toBeChecked();
    expect(screen.getByTestId('setting-autoplay')).toBeChecked();
  });

  it('picks values from sheets', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('setting-skip'));
    await fireEvent.press(screen.getByTestId('skip-option-30'));
    expect(settingsStore.getState().skipSeconds).toBe(30);
    expect(screen.getByText('30 sec')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('setting-aspect'));
    await fireEvent.press(screen.getByText('Fill'));
    expect(settingsStore.getState().defaultAspectMode).toBe('fill');
  });

  it('switches the theme', async () => {
    await renderScreen();
    expect(screen.getByText('System default')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('setting-appearance'));
    await fireEvent.press(screen.getByTestId('appearance-option-light'));

    expect(settingsStore.getState().appearance).toBe('light');
    expect(screen.getByText('Light')).toBeOnTheScreen();
  });

  it('asks for notification permission when enabling background play on Android 13+', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
    const request = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('setting-background'));

    expect(settingsStore.getState().backgroundPlay).toBe(true);
    expect(request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  });
});
