import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '../../../shared/components/IconButton';
import {
  ArrowLeftIcon,
  AudioLinesIcon,
  CaptionsIcon,
  EllipsisVerticalIcon,
  LockIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  RatioIcon,
  RotateCcwIcon,
  RotateCwIcon,
  ScreenRotationIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from '../../../shared/icons';
import { colors, radius, spacing, typography } from '../../../shared/theme';
import { formatSpeed } from '../../../shared/utils/format';
import type { PlaybackClock } from '../playbackClock';
import { Scrim } from './Scrim';
import { SeekBar } from './SeekBar';

export interface PlayerControlsProps {
  title: string;
  /** e.g. "3 of 12" when playing through a list. */
  queueLabel: string | null;
  paused: boolean;
  clock: PlaybackClock;
  duration: number;
  skipSeconds: number;
  speed: number;
  hasPrevious: boolean;
  hasNext: boolean;
  subtitlesActive: boolean;
  showAudioTracks: boolean;
  onBack: () => void;
  onTogglePlayback: () => void;
  onSkip: (seconds: number) => void;
  onSeek: (time: number) => void;
  onScrubbingChange: (scrubbing: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenSpeed: () => void;
  onOpenSubtitles: () => void;
  onOpenAudio: () => void;
  onOpenMore: () => void;
  onCycleAspect: () => void;
  onRotate: () => void;
  onLock: () => void;
  onPictureInPicture: () => void;
}

/**
 * Player chrome. The root uses `box-none` so taps between the bars fall through to the
 * gesture layer underneath.
 */
export function PlayerControls(props: PlayerControlsProps) {
  const insets = useSafeAreaInsets();
  const sidePadding = {
    paddingLeft: Math.max(insets.left, spacing.md),
    paddingRight: Math.max(insets.right, spacing.md),
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      testID="player-controls"
    >
      <Scrim edge="top" height={insets.top + 120} />
      <Scrim edge="bottom" height={insets.bottom + 180} />

      <View
        style={[
          styles.topBar,
          sidePadding,
          { paddingTop: Math.max(insets.top, spacing.sm) },
        ]}
      >
        <IconButton
          icon={ArrowLeftIcon}
          variant="overlay"
          accessibilityLabel="Back"
          onPress={props.onBack}
          testID="player-back"
        />
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {props.title}
          </Text>
          {props.queueLabel ? (
            <Text style={styles.queue}>{props.queueLabel}</Text>
          ) : null}
        </View>
        <IconButton
          icon={CaptionsIcon}
          variant="overlay"
          active={props.subtitlesActive}
          accessibilityLabel="Subtitles"
          onPress={props.onOpenSubtitles}
          testID="subtitles-button"
        />
        {props.showAudioTracks ? (
          <IconButton
            icon={AudioLinesIcon}
            variant="overlay"
            accessibilityLabel="Audio track"
            onPress={props.onOpenAudio}
            testID="audio-button"
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${formatSpeed(props.speed)}`}
          onPress={props.onOpenSpeed}
          style={({ pressed }) => [
            styles.speedPill,
            props.speed !== 1 && styles.speedPillActive,
            pressed && styles.speedPillPressed,
          ]}
          testID="speed-button"
        >
          <Text
            style={[
              styles.speedText,
              props.speed !== 1 && styles.speedTextActive,
            ]}
          >
            {formatSpeed(props.speed)}
          </Text>
        </Pressable>
        <IconButton
          icon={EllipsisVerticalIcon}
          variant="overlay"
          accessibilityLabel="More options"
          onPress={props.onOpenMore}
          testID="more-button"
        />
      </View>

      <View style={styles.center} pointerEvents="box-none">
        <IconButton
          icon={SkipBackIcon}
          variant="overlay"
          accessibilityLabel="Previous video"
          onPress={props.onPrevious}
          disabled={!props.hasPrevious}
          testID="previous-button"
        />
        <IconButton
          icon={RotateCcwIcon}
          variant="overlay"
          accessibilityLabel={`Back ${props.skipSeconds} seconds`}
          onPress={() => props.onSkip(-props.skipSeconds)}
          testID="skip-back-button"
        />
        <IconButton
          icon={props.paused ? PlayIcon : PauseIcon}
          variant="filled"
          size="lg"
          accessibilityLabel={props.paused ? 'Play' : 'Pause'}
          onPress={props.onTogglePlayback}
          testID="play-pause-button"
        />
        <IconButton
          icon={RotateCwIcon}
          variant="overlay"
          accessibilityLabel={`Forward ${props.skipSeconds} seconds`}
          onPress={() => props.onSkip(props.skipSeconds)}
          testID="skip-forward-button"
        />
        <IconButton
          icon={SkipForwardIcon}
          variant="overlay"
          accessibilityLabel="Next video"
          onPress={props.onNext}
          disabled={!props.hasNext}
          testID="next-button"
        />
      </View>

      <View
        style={[
          styles.bottomBar,
          sidePadding,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <SeekBar
          clock={props.clock}
          duration={props.duration}
          skipSeconds={props.skipSeconds}
          onSeek={props.onSeek}
          onScrubbingChange={props.onScrubbingChange}
        />
        <View style={styles.actions}>
          <IconButton
            icon={LockIcon}
            variant="ghost"
            accessibilityLabel="Lock controls"
            onPress={props.onLock}
            testID="lock-button"
          />
          <View style={styles.actionsRight}>
            <IconButton
              icon={RatioIcon}
              accessibilityLabel="Change aspect ratio"
              onPress={props.onCycleAspect}
              testID="aspect-button"
            />
            <IconButton
              icon={ScreenRotationIcon}
              accessibilityLabel="Rotate screen"
              onPress={props.onRotate}
              testID="rotate-button"
            />
            <IconButton
              icon={PictureInPictureIcon}
              accessibilityLabel="Picture in picture"
              onPress={props.onPictureInPicture}
              testID="pip-button"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  title: {
    ...typography.headline,
    color: colors.white,
  },
  queue: {
    ...typography.label,
    color: colors.textSecondary,
  },
  speedPill: {
    minWidth: 52,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.playerButton,
  },
  speedPillActive: {
    backgroundColor: colors.primarySoft,
  },
  speedPillPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  speedText: {
    ...typography.label,
    fontSize: 13,
    color: colors.white,
  },
  speedTextActive: {
    color: colors.primaryText,
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  bottomBar: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
