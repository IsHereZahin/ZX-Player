import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useStore } from '../../../shared/storage/store';
import { font, playerColors, radius, spacing } from '../../../shared/theme';
import { clamp } from '../../../shared/utils/math';
import type { PlaybackClock } from '../playbackClock';
import { getSubtitleText, type SubtitleTrack } from '../subtitles';

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

interface TimedSubtitleOverlayProps extends Omit<SubtitleOverlayProps, 'text'> {
  clock: PlaybackClock;
  track: SubtitleTrack;
  /** Seconds the subtitles are shifted by (positive shows them later). */
  delay: number;
}

/**
 * Subtitles from a file, timed against the playback clock. Re-renders only when the
 * visible cue changes, not on every progress tick.
 */
export function TimedSubtitleOverlay({
  clock,
  track,
  delay,
  ...overlay
}: TimedSubtitleOverlayProps) {
  const text = useStore(clock, state =>
    getSubtitleText(track, state.currentTime - delay),
  );
  return <SubtitleOverlay text={text} {...overlay} />;
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: spacing.xxxl,
    right: spacing.xxxl,
    alignItems: 'center',
  },
  text: {
    color: playerColors.white,
    // Subtitles scale with the screen; tracking for a typical size is close enough.
    ...font('semibold', 20),
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
    borderRadius: radius.xs,
    textShadowColor: playerColors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  textBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});
