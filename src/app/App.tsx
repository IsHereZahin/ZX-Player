import React, { useMemo } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';

import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { palettes, type ColorScheme } from '../shared/theme';
import { ThemeProvider } from '../shared/theming';
import { navigationRef } from './navigation/navigationRef';
import { RootNavigator } from './navigation/RootNavigator';
import { PlayerHost } from './PlayerHost';
import { useAppColorScheme } from './useAppColorScheme';
import { usePersistedStores } from './usePersistedStores';

function navigationTheme(scheme: ColorScheme): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = palettes[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primaryText,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.primary,
    },
  };
}

export default function App() {
  const storesReady = usePersistedStores();
  const scheme = useAppColorScheme();
  const theme = useMemo(() => navigationTheme(scheme), [scheme]);
  const background = { backgroundColor: palettes[scheme].background };

  return (
    <GestureHandlerRootView style={[styles.root, background]}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        />
        <ThemeProvider scheme={scheme}>
          <ErrorBoundary>
            {storesReady ? (
              <NavigationContainer ref={navigationRef} theme={theme}>
                <RootNavigator />
                {/* Above the navigator, so playback can outlive the Player screen. */}
                <PlayerHost />
              </NavigationContainer>
            ) : (
              // Saved settings and history load in milliseconds; avoid flashing defaults.
              <View style={[styles.root, background]} testID="app-loading" />
            )}
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
