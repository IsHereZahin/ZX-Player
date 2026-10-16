import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../../shared/theme';
import { clamp } from '../../../shared/utils/math';

interface SubtitleOverlayProps {
  text: string;
  bottomOffset: number;
  /** Shorter screen edge, used to scale the font for phones and tablets alike. */
  shortSide: number;
  /** User text-size preference multiplier. */
  scale: number;
  background: boolean;
}

export const SubtitleOverlay = memo(function SubtitleOverlayView({
  text,
  bottomOffset,
  shortSide,
  scale,
  background,
}: SubtitleOverlayProps) {
  if (!text) {
    return null;
  }
  const fontSize = clamp(Math.round(shortSide * 0.048 * scale), 13, 40);

  return (
    <View style={[styles.layer, { bottom: bottomOffset }]} pointerEvents="none">
      <Text
        style={[
          styles.text,
          background && styles.textBackground,
          { fontSize, lineHeight: Math.round(fontSize * 1.3) },
        ]}
        testID="subtitle-text"
      >
        {text}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: spacing.xxxl,
    right: spacing.xxxl,
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
    borderRadius: radius.xs,
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  textBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});
