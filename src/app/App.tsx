import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';

import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { colors } from '../shared/theme';
import { RootNavigator } from './navigation/RootNavigator';
import { usePersistedStores } from './usePersistedStores';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primaryText,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function App() {
  const storesReady = usePersistedStores();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <ErrorBoundary>
          {storesReady ? (
            <NavigationContainer theme={navigationTheme}>
              <RootNavigator />
            </NavigationContainer>
          ) : (
            // Saved settings and history load in milliseconds; avoid flashing defaults.
            <View style={styles.root} testID="app-loading" />
          )}
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
