import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, spacing } from '../../../shared/theme';
import { ASPECT_MODE_LABELS, type AspectMode } from '../utils/aspectRatio';
import { DOUBLE_TAP_SKIP_SECONDS } from '../utils/gestureMath';
import { ControlButton } from './ControlButton';
import { PlayPauseIcon } from './PlayPauseIcon';
import { SeekBar } from './SeekBar';

export interface PlayerControlsProps {
  title: string;
  paused: boolean;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  aspectMode: AspectMode;
  landscapeLocked: boolean;
  subtitlesLoaded: boolean;
  onBack: () => void;
  onTogglePlayback: () => void;
  onSkip: (seconds: number) => void;
  onSeek: (time: number) => void;
  onScrubbingChange: (scrubbing: boolean) => void;
  onCycleAspect: () => void;
  onSubtitles: () => void;
  onToggleOrientation: () => void;
}

/**
 * Player chrome. The root uses `box-none` so taps between the bars fall through to the
 * gesture layer underneath.
 */
export function PlayerControls(props: PlayerControlsProps) {
  const insets = useSafeAreaInsets();
  const horizontalPadding = {
    paddingLeft: Math.max(insets.left, spacing.lg),
    paddingRight: Math.max(insets.right, spacing.lg),
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      testID="player-controls"
    >
      <View
        style={[
          styles.bar,
          horizontalPadding,
          { paddingTop: Math.max(insets.top, spacing.sm) },
        ]}
      >
        <ControlButton
          accessibilityLabel="Back"
          label="‹  Back"
          onPress={props.onBack}
        />
        <Text style={styles.title} numberOfLines={1}>
          {props.title}
        </Text>
        <ControlButton
          accessibilityLabel={
            props.subtitlesLoaded ? 'Subtitle options' : 'Load subtitles'
          }
          label="CC"
          active={props.subtitlesLoaded}
          onPress={props.onSubtitles}
          testID="subtitles-button"
        />
        <ControlButton
          accessibilityLabel={`Aspect ratio: ${
            ASPECT_MODE_LABELS[props.aspectMode]
          }`}
          label={ASPECT_MODE_LABELS[props.aspectMode]}
          onPress={props.onCycleAspect}
          testID="aspect-button"
        />
        <ControlButton
          accessibilityLabel={
            props.landscapeLocked ? 'Unlock rotation' : 'Lock to landscape'
          }
          label="⟳"
          active={props.landscapeLocked}
          onPress={props.onToggleOrientation}
          testID="orientation-button"
        />
      </View>

      <View style={styles.center} pointerEvents="box-none">
        <ControlButton
          accessibilityLabel={`Back ${DOUBLE_TAP_SKIP_SECONDS} seconds`}
          label={`« ${DOUBLE_TAP_SKIP_SECONDS}`}
          onPress={() => props.onSkip(-DOUBLE_TAP_SKIP_SECONDS)}
          testID="skip-back-button"
        />
        <ControlButton
          accessibilityLabel={props.paused ? 'Play' : 'Pause'}
          size="large"
          onPress={props.onTogglePlayback}
          testID="play-pause-button"
        >
          <PlayPauseIcon playing={!props.paused} />
        </ControlButton>
        <ControlButton
          accessibilityLabel={`Forward ${DOUBLE_TAP_SKIP_SECONDS} seconds`}
          label={`${DOUBLE_TAP_SKIP_SECONDS} »`}
          onPress={() => props.onSkip(DOUBLE_TAP_SKIP_SECONDS)}
          testID="skip-forward-button"
        />
      </View>

      <View
        style={[
          styles.bar,
          styles.bottomBar,
          horizontalPadding,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <SeekBar
          currentTime={props.currentTime}
          duration={props.duration}
          bufferedTime={props.bufferedTime}
          onSeek={props.onSeek}
          onScrubbingChange={props.onScrubbingChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.playerScrim,
  },
  bottomBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  title: {
    flex: 1,
    marginHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.subtitle,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
});
