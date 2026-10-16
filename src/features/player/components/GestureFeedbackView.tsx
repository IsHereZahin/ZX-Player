import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../../shared/theme';
import {
  formatDuration,
  formatPercent,
  formatSignedDuration,
} from '../../../shared/utils/format';
import type { GestureFeedback } from '../hooks/usePlayerGestures';

const LEVEL_BAR_WIDTH = 120;

/** Transient indicator shown while a gesture adjusts brightness, volume or position. */
export function GestureFeedbackView({
  feedback,
}: {
  feedback: GestureFeedback | null;
}) {
  if (!feedback) {
    return null;
  }

  if (feedback.kind === 'skip') {
    const forward = feedback.seconds > 0;
    return (
      <View
        style={[styles.layer, forward ? styles.alignRight : styles.alignLeft]}
        pointerEvents="none"
      >
        <View style={styles.pill} testID="gesture-feedback-skip">
          <Text style={styles.headline}>
            {forward ? '»' : '«'} {Math.abs(feedback.seconds)}s
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.layer, styles.alignCenter]} pointerEvents="none">
      <View style={styles.card} testID={`gesture-feedback-${feedback.kind}`}>
        {feedback.kind === 'seek' ? (
          <>
            <Text style={styles.headline}>
              {formatSignedDuration(feedback.delta)}
            </Text>
            <Text style={styles.caption}>
              {formatDuration(feedback.target)} /{' '}
              {formatDuration(feedback.duration)}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.caption}>
              {feedback.kind === 'brightness' ? 'Brightness' : 'Volume'}
            </Text>
            <Text style={styles.headline}>{formatPercent(feedback.level)}</Text>
            <View style={styles.levelTrack}>
              <View
                style={[
                  styles.levelFill,
                  { width: LEVEL_BAR_WIDTH * feedback.level },
                ]}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl * 2,
  },
  alignCenter: {
    alignItems: 'center',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  card: {
    minWidth: 160,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.playerPanel,
  },
  pill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.playerPanel,
  },
  headline: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontVariant: ['tabular-nums'],
  },
  levelTrack: {
    width: LEVEL_BAR_WIDTH,
    height: 4,
    marginTop: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.trackInactive,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
});
