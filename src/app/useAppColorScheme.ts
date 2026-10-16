import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { useSettings } from '../features/settings/settingsStore';
import type { ColorScheme } from '../shared/theme';

/** The colour scheme the app shows: the user's choice, or the device's when set to System. */
export function useAppColorScheme(): ColorScheme {
  const { appearance } = useSettings();
  const deviceScheme = useColorScheme();

  // Native UI the app doesn't draw (system bars, alerts, keyboard) follows the choice too.
  useEffect(() => {
    Appearance.setColorScheme(appearance === 'system' ? 'auto' : appearance);
  }, [appearance]);

  if (appearance !== 'system') {
    return appearance;
  }
  return deviceScheme === 'light' ? 'light' : 'dark';
}
