import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../../shared/theme';
import { clamp } from '../../../shared/utils/math';

interface SubtitleOverlayProps {
  text: string;
  bottomOffset: number;
  /** Shorter screen edge, used to scale the font for phones and tablets alike. */
  shortSide: number;
}

export const SubtitleOverlay = memo(function SubtitleOverlayView({
  text,
  bottomOffset,
  shortSide,
}: SubtitleOverlayProps) {
  if (!text) {
    return null;
  }
  const fontSize = clamp(Math.round(shortSide * 0.048), 15, 30);

  return (
    <View style={[styles.layer, { bottom: bottomOffset }]} pointerEvents="none">
      <Text
        style={[
          styles.text,
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
    left: spacing.xxl,
    right: spacing.xxl,
    alignItems: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
