import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressBar } from '../../../shared/components/ProgressBar';
import {
  FastForwardIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SunIcon,
  Volume2Icon,
  VolumeXIcon,
} from '../../../shared/icons';
import { colors, radius, spacing, typography } from '../../../shared/theme';
import {
  formatDuration,
  formatPercent,
  formatSignedDuration,
} from '../../../shared/utils/format';
import type { GestureFeedback } from '../hooks/usePlayerGestures';

const LEVEL_BAR_HEIGHT = 132;

/** Transient indicator shown while a gesture adjusts brightness, volume, position or speed. */
export function GestureFeedbackView({
  feedback,
}: {
  feedback: GestureFeedback | null;
}) {
  const insets = useSafeAreaInsets();
  if (!feedback) {
    return null;
  }

  switch (feedback.kind) {
    case 'brightness':
    case 'volume': {
      const isBrightness = feedback.kind === 'brightness';
      const Icon = isBrightness
        ? SunIcon
        : feedback.level === 0
        ? VolumeXIcon
        : Volume2Icon;
      return (
        <View
          pointerEvents="none"
          style={[
            styles.sideLayer,
            isBrightness
              ? { left: Math.max(insets.left, spacing.xl) + spacing.lg }
              : { right: Math.max(insets.right, spacing.xl) + spacing.lg },
          ]}
        >
          <View
            style={styles.levelPill}
            testID={`gesture-feedback-${feedback.kind}`}
          >
            <Icon size={20} color={colors.white} />
            <View style={styles.levelTrack}>
              <View
                style={[
                  styles.levelFill,
                  { height: `${feedback.level * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.levelText}>
              {formatPercent(feedback.level)}
            </Text>
          </View>
        </View>
      );
    }
    case 'seek':
      return (
        <View pointerEvents="none" style={styles.centerLayer}>
          <View style={styles.seekCard} testID="gesture-feedback-seek">
            <Text style={styles.seekDelta}>
              {formatSignedDuration(feedback.delta)}
            </Text>
            <Text style={styles.seekPosition}>
              {formatDuration(feedback.target)} /{' '}
              {formatDuration(feedback.duration)}
            </Text>
            <ProgressBar
              progress={
                feedback.duration > 0 ? feedback.target / feedback.duration : 0
              }
              style={styles.seekBar}
            />
          </View>
        </View>
      );
    case 'skip': {
      const forward = feedback.seconds > 0;
      const Icon = forward ? RotateCwIcon : RotateCcwIcon;
      return (
        <View
          pointerEvents="none"
          style={[
            styles.skipLayer,
            forward ? styles.skipRight : styles.skipLeft,
          ]}
          testID="gesture-feedback-skip"
        >
          <View style={styles.skipBubble}>
            <Icon size={26} color={colors.white} />
          </View>
          <Text style={styles.skipText}>
            {forward ? '+' : '−'}
            {Math.abs(feedback.seconds)} sec
          </Text>
        </View>
      );
    }
    case 'boost':
      return (
        <View
          pointerEvents="none"
          style={[styles.topLayer, { top: insets.top + spacing.xl }]}
        >
          <View style={styles.boostChip} testID="gesture-feedback-boost">
            <FastForwardIcon
              size={16}
              color={colors.onPrimary}
              fill={colors.onPrimary}
            />
            <Text style={styles.boostText}>2× speed</Text>
          </View>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  sideLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  levelPill: {
    width: 56,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.playerPanel,
  },
  levelTrack: {
    width: 6,
    height: LEVEL_BAR_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.trackInactive,
  },
  levelFill: {
    width: '100%',
    backgroundColor: colors.primaryBright,
  },
  levelText: {
    ...typography.label,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  centerLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekCard: {
    minWidth: 200,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.playerPanel,
  },
  seekDelta: {
    ...typography.display,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  seekPosition: {
    ...typography.caption,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  seekBar: {
    width: 168,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
  },
  skipLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '34%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  skipLeft: {
    left: 0,
  },
  skipRight: {
    right: 0,
  },
  skipBubble: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  skipText: {
    ...typography.bodyStrong,
    color: colors.white,
    textShadowColor: colors.black,
    textShadowRadius: 4,
  },
  topLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  boostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  boostText: {
    ...typography.label,
    fontSize: 13,
    color: colors.onPrimary,
  },
});
