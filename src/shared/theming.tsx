import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import {
  DEFAULT_COLOR_THEME,
  paletteFor,
  type ColorScheme,
  type ColorTheme,
  type ColorTokens,
} from './theme';

export interface AppTheme {
  scheme: ColorScheme;
  colorTheme: ColorTheme;
  colors: ColorTokens;
}

type StyleMap = Parameters<typeof StyleSheet.create>[0];

const ThemeContext = createContext<AppTheme>({
  scheme: 'dark',
  colorTheme: DEFAULT_COLOR_THEME,
  colors: paletteFor('dark'),
});

interface ThemeProviderProps {
  scheme: ColorScheme;
  /** Omitted in a nested provider (e.g. the always-dark player): kept from the parent. */
  colorTheme?: ColorTheme;
  children: React.ReactNode;
}

/** Provides a palette to everything below; nest one to pin a subtree (e.g. the player). */
export function ThemeProvider({
  scheme,
  colorTheme,
  children,
}: ThemeProviderProps) {
  const parent = useContext(ThemeContext);
  const resolvedTheme = colorTheme ?? parent.colorTheme;
  const theme = useMemo(
    () => ({
      scheme,
      colorTheme: resolvedTheme,
      colors: paletteFor(scheme, resolvedTheme),
    }),
    [resolvedTheme, scheme],
  );
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}

export function useColors(): ColorTokens {
  return useContext(ThemeContext).colors;
}

/**
 * Themed counterpart of `StyleSheet.create`. Styles are built once per colour scheme and
 * colour theme and cached, so switching costs one build and re-renders reuse the objects.
 */
export function makeStyles<T extends StyleMap>(
  factory: (colors: ColorTokens) => T,
): () => Readonly<T> {
  const cache = new Map<string, Readonly<T>>();
  return function useStyles() {
    const { scheme, colorTheme, colors } = useTheme();
    const key = `${scheme}:${colorTheme}`;
    let styles = cache.get(key);
    if (!styles) {
      styles = StyleSheet.create(factory(colors));
      cache.set(key, styles);
    }
    return styles;
  };
}
