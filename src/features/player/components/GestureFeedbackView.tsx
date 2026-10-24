import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../../shared/theming';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  Volume2Icon,
  VolumeXIcon,
  ZoomInIcon,
} from '../../../shared/icons';
import {
  playerColors,
  radius,
  spacing,
  typography,
} from '../../../shared/theme';
import {
  formatDuration,
  formatPercent,
  formatSignedDuration,
} from '../../../shared/utils/format';
import type { GestureFeedback } from '../hooks/usePlayerGestures';

const LEVEL_BAR_HEIGHT = 132;
/** One pass of the chevrons lighting up, first to last. */
const CHEVRON_CYCLE_MS = 900;

/** Transient indicator shown while a gesture adjusts brightness, volume, position or speed. */
export function GestureFeedbackView({
  feedback,
}: {
  feedback: GestureFeedback | null;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
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
            <Icon size={20} color={playerColors.white} />
            <View style={styles.levelTrack}>
              <View
                style={[
                  styles.levelFill,
                  {
                    height: `${feedback.level * 100}%`,
                    backgroundColor: colors.accent,
                  },
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
      // The seek bar shows where this lands; the card states the jump and the time.
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
          </View>
        </View>
      );
    case 'skip': {
      const forward = feedback.seconds > 0;
      return (
        <View
          pointerEvents="none"
          style={[styles.skipLayer, forward ? styles.skipRight : styles.skipLeft]}
          testID="gesture-feedback-skip"
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              forward ? styles.skipGlowRight : styles.skipGlowLeft,
            ]}
          />
          <Chevrons direction={forward ? 1 : -1} size={26} />
          <Text style={styles.skipText}>
            {Math.abs(feedback.seconds)} seconds
          </Text>
        </View>
      );
    }
    case 'zoom':
      return (
        <View
          pointerEvents="none"
          style={[styles.topLayer, { top: insets.top + spacing.xl }]}
        >
          <View style={styles.chip} testID="gesture-feedback-zoom">
            <ZoomInIcon size={16} color={playerColors.white} />
            <Text style={styles.chipText}>{feedback.scale.toFixed(1)}×</Text>
          </View>
        </View>
      );
    case 'boost':
      return (
        <View
          pointerEvents="none"
          style={[styles.topLayer, { top: insets.top + spacing.xl }]}
        >
          <View style={styles.chip} testID="gesture-feedback-boost">
            <Text style={styles.chipText}>2× speed</Text>
            <Chevrons direction={1} size={16} />
          </View>
        </View>
      );
  }
}

/** Three chevrons lighting up one after another, in the direction things move. */
function Chevrons({ direction, size }: { direction: 1 | -1; size: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CHEVRON_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const Icon = direction > 0 ? ChevronRightIcon : ChevronLeftIcon;
  return (
    <View style={styles.chevrons}>
      {[0, 1, 2].map(index => {
        // Counted from the side the motion starts on.
        const step = direction > 0 ? index : 2 - index;
        const opacity = progress.interpolate({
          inputRange: [0, step / 3, (step + 0.5) / 3, (step + 1) / 3, 1],
          outputRange: [0.3, 0.3, 1, 0.3, 0.3],
        });
        return (
          <Animated.View
            key={index}
            style={[{ opacity }, index > 0 && { marginLeft: -size * 0.45 }]}
          >
            <Icon size={size} color={playerColors.white} strokeWidth={3} />
          </Animated.View>
        );
      })}
    </View>
  );
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
    backgroundColor: playerColors.playerPanel,
  },
  levelTrack: {
    width: 6,
    height: LEVEL_BAR_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: playerColors.trackInactive,
  },
  levelFill: {
    width: '100%',
  },
  levelText: {
    ...typography.captionStrong,
    color: playerColors.white,
    fontVariant: ['tabular-nums'],
  },
  centerLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekCard: {
    minWidth: 168,
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: playerColors.playerPanel,
  },
  seekDelta: {
    ...typography.title1,
    color: playerColors.white,
    fontVariant: ['tabular-nums'],
  },
  seekPosition: {
    ...typography.footnote,
    color: playerColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  skipLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
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
  // A soft light from the screen edge on the tapped side.
  skipGlowLeft: {
    backgroundImage:
      'linear-gradient(to right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0))',
  },
  skipGlowRight: {
    backgroundImage:
      'linear-gradient(to left, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0))',
  },
  chevrons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipText: {
    ...typography.footnoteStrong,
    color: playerColors.white,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowRadius: 6,
  },
  topLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: playerColors.playerPanel,
  },
  chipText: {
    ...typography.footnoteStrong,
    color: playerColors.white,
  },
});
