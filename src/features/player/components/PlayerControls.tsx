import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '../../../shared/components/IconButton';
import {
  ArrowLeftIcon,
  AudioLinesIcon,
  CaptionsIcon,
  LockIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  RatioIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from '../../../shared/icons';
import {
  playerColors,
  radius,
  spacing,
  typography,
} from '../../../shared/theme';
import type { VideoItem } from '../../library/types';
import type { PlaybackClock } from '../playbackClock';
import { AudioControls } from './AudioControls';
import type { RepeatMode } from './PlayerSheets';
import { QuickActions } from './QuickActions';
import { Scrim } from './Scrim';
import { SeekBar } from './SeekBar';

export interface PlayerControlsProps {
  /** Audio gets its own layout (AudioControls): cover, title, transport, no picture tools. */
  mode: 'video' | 'audio';
  /** The playing audio item and its cover (audio mode). */
  track?: VideoItem;
  art?: string | null;
  /** Current pinch zoom; above 1 a "Reset zoom" pill appears. */
  zoom: number;
  onResetZoom: () => void;
  title: string;
  /** e.g. "3 of 12" when playing through a list. */
  queueLabel: string | null;
  paused: boolean;
  clock: PlaybackClock;
  duration: number;
  skipSeconds: number;
  speed: number;
  repeatMode: RepeatMode;
  sleepActive: boolean;
  backgroundPlay: boolean;
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
  onCycleRepeat: () => void;
  onOpenSleep: () => void;
  onToggleBackgroundPlay: () => void;
  onOpenSubtitles: () => void;
  onOpenAudio: () => void;
  onOpenMore: () => void;
  onCycleAspect: () => void;
  onRotate: () => void;
  onLock: () => void;
  onPictureInPicture: () => void;
}

/** Player chrome: the video bars, or the music-style layout for an audio track. */
export function PlayerControls(props: PlayerControlsProps) {
  return props.mode === 'audio' && props.track ? (
    <AudioControls {...props} track={props.track} art={props.art ?? null} />
  ) : (
    <VideoControls {...props} />
  );
}

/**
 * The video player's bars. The root uses `box-none` so taps between the bars fall through
 * to the gesture layer underneath.
 */
function VideoControls(props: PlayerControlsProps) {
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
      <Scrim edge="top" height={insets.top + 160} />
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
      </View>

      <View style={[styles.quickRow, sidePadding]} pointerEvents="box-none">
        <QuickActions
          mode="video"
          speed={props.speed}
          repeatMode={props.repeatMode}
          sleepActive={props.sleepActive}
          backgroundPlay={props.backgroundPlay}
          onOpenSpeed={props.onOpenSpeed}
          onCycleRepeat={props.onCycleRepeat}
          onOpenSleep={props.onOpenSleep}
          onRotate={props.onRotate}
          onToggleBackgroundPlay={props.onToggleBackgroundPlay}
          onOpenMore={props.onOpenMore}
        />
      </View>

      {props.zoom > 1 ? (
        <View style={styles.zoomRow} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Zoomed to ${props.zoom.toFixed(
              1,
            )}×. Reset zoom`}
            onPress={props.onResetZoom}
            style={({ pressed }) => [
              styles.zoomPill,
              pressed && styles.zoomPillPressed,
            ]}
            testID="reset-zoom"
          >
            <Text style={styles.zoomText}>
              {props.zoom.toFixed(1)}× · Reset
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.center} pointerEvents="box-none">
        <IconButton
          icon={SkipBackIcon}
          variant="glyph"
          accessibilityLabel="Previous video"
          onPress={props.onPrevious}
          disabled={!props.hasPrevious}
          testID="previous-button"
        />
        <IconButton
          icon={RotateCcwIcon}
          variant="glyph"
          accessibilityLabel={`Back ${props.skipSeconds} seconds`}
          onPress={() => props.onSkip(-props.skipSeconds)}
          testID="skip-back-button"
        />
        <IconButton
          icon={props.paused ? PlayIcon : PauseIcon}
          variant="glyph"
          size="lg"
          accessibilityLabel={props.paused ? 'Play' : 'Pause'}
          onPress={props.onTogglePlayback}
          testID="play-pause-button"
        />
        <IconButton
          icon={RotateCwIcon}
          variant="glyph"
          accessibilityLabel={`Forward ${props.skipSeconds} seconds`}
          onPress={() => props.onSkip(props.skipSeconds)}
          testID="skip-forward-button"
        />
        <IconButton
          icon={SkipForwardIcon}
          variant="glyph"
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
    color: playerColors.white,
  },
  queue: {
    ...typography.captionStrong,
    color: playerColors.textSecondary,
  },
  quickRow: {
    paddingTop: spacing.xs,
  },
  zoomRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  zoomPill: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: playerColors.playerButton,
  },
  zoomPillPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  zoomText: {
    ...typography.captionStrong,
    fontSize: 13,
    color: playerColors.white,
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxxl,
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
