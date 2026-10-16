import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../../shared/theme';

/** Drawn with views so the app needs no icon font. */
export function PlayPauseIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <View style={styles.pause}>
        <View style={styles.bar} />
        <View style={styles.bar} />
      </View>
    );
  }
  return <View style={styles.play} />;
}

const styles = StyleSheet.create({
  pause: {
    flexDirection: 'row',
    gap: 8,
  },
  bar: {
    width: 7,
    height: 26,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 6,
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderLeftWidth: 24,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.textPrimary,
  },
});
