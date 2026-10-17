import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { playerColors } from '../../../shared/theme';

/**
 * Behind an audio track: its cover blurred across the screen and dimmed, so the controls
 * read on any artwork. Plain dark when the track has none.
 */
export function AudioBackdrop({ art }: { art: string | null }) {
  return (
    <View style={styles.layer} pointerEvents="none" testID="audio-backdrop">
      {art ? (
        <Image
          source={{ uri: art }}
          style={styles.image}
          resizeMode="cover"
          blurRadius={40}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.shade} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: playerColors.background,
  },
  image: {
    ...StyleSheet.absoluteFill,
    opacity: 0.6,
    // Pushes the blur's soft, see-through edges off the screen.
    transform: [{ scale: 1.15 }],
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});
