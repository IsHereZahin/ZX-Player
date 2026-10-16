import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { palettes, type ColorScheme, type ColorTokens } from './theme';

export interface AppTheme {
  scheme: ColorScheme;
  colors: ColorTokens;
}

type StyleMap = Parameters<typeof StyleSheet.create>[0];

const ThemeContext = createContext<AppTheme>({
  scheme: 'dark',
  colors: palettes.dark,
});

interface ThemeProviderProps {
  scheme: ColorScheme;
  children: React.ReactNode;
}

/** Provides a palette to everything below; nest one to pin a subtree (e.g. the player). */
export function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  const theme = useMemo(() => ({ scheme, colors: palettes[scheme] }), [scheme]);
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
 * cached, so switching themes costs one build and re-renders reuse the same objects.
 */
export function makeStyles<T extends StyleMap>(
  factory: (colors: ColorTokens) => T,
): () => Readonly<T> {
  const cache = new Map<ColorScheme, Readonly<T>>();
  return function useStyles() {
    const { scheme, colors } = useTheme();
    let styles = cache.get(scheme);
    if (!styles) {
      styles = StyleSheet.create(factory(colors));
      cache.set(scheme, styles);
    }
    return styles;
  };
}
