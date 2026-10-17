import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '../../../shared/components/IconButton';
import {
  ArrowLeftIcon,
  AudioLinesIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
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
import { useColors } from '../../../shared/theming';
import { mediaTitle } from '../../library/services/mediaLibrary';
import type { VideoItem } from '../../library/types';
import type { PlayerControlsProps } from './PlayerControls';
import { QuickActions } from './QuickActions';
import { SeekBar } from './SeekBar';

const MAX_COVER_SIZE = 360;
/** Below this the cover is left out (a short landscape screen) and only the text shows. */
const MIN_COVER_SIZE = 96;
const PLAY_BUTTON_SIZE = 72;

export type AudioControlsProps = PlayerControlsProps & {
  track: VideoItem;
  /** The track's cover, when it has one. */
  art: string | null;
};

/**
 * The player for an audio track, laid out like a music app: the cover, the title and
 * artist, the seek bar, then the transport and the shortcuts. Audio has no picture to
 * uncover, so this stays on screen; empty space still passes taps to the gesture layer.
 */
export function AudioControls(props: AudioControlsProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const wide = width > height;
  // The cover fills whatever room the text and controls leave, up to MAX_COVER_SIZE.
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const coverSize = Math.min(slot.width, slot.height, MAX_COVER_SIZE);
  const subtitle = [props.track.artist, props.track.album]
    .filter(Boolean)
    .join(' · ');
  const onSlotLayout = (event: LayoutChangeEvent) => {
    const layout = event.nativeEvent.layout;
    setSlot({ width: layout.width, height: layout.height });
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      testID="player-controls"
    >
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingLeft: Math.max(insets.left, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
          },
        ]}
      >
        <IconButton
          icon={ArrowLeftIcon}
          variant="overlay"
          accessibilityLabel="Back"
          onPress={props.onBack}
          testID="player-back"
        />
        <View style={styles.heading} pointerEvents="none">
          <Text style={styles.headingTitle}>{props.title}</Text>
          {props.queueLabel ? (
            <Text style={styles.headingQueue}>{props.queueLabel}</Text>
          ) : null}
        </View>
        {props.showAudioTracks ? (
          <IconButton
            icon={AudioLinesIcon}
            variant="overlay"
            accessibilityLabel="Audio track"
            onPress={props.onOpenAudio}
            testID="audio-button"
          />
        ) : (
          // Keeps the heading centred.
          <View style={styles.topSpacer} />
        )}
      </View>

      <View
        style={[
          styles.body,
          wide && styles.bodyWide,
          {
            paddingLeft: Math.max(insets.left, spacing.xxl),
            paddingRight: Math.max(insets.right, spacing.xxl),
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
        pointerEvents="box-none"
        testID="audio-artwork"
      >
        <View
          style={[styles.coverSlot, wide && styles.coverSlotWide]}
          onLayout={onSlotLayout}
          pointerEvents="none"
        >
          {coverSize >= MIN_COVER_SIZE ? (
            <View
              style={[styles.cover, { width: coverSize, height: coverSize }]}
              testID="audio-cover"
            >
              {props.art ? (
                <Image
                  source={{ uri: props.art }}
                  style={styles.coverImage}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <MusicIcon
                  size={coverSize * 0.34}
                  color={playerColors.textSecondary}
                  strokeWidth={1.5}
                />
              )}
            </View>
          ) : null}
        </View>

        <View
          style={[styles.panel, wide && styles.panelWide]}
          pointerEvents="box-none"
        >
          <View style={styles.meta} pointerEvents="none">
            <Text style={styles.trackTitle} numberOfLines={2}>
              {mediaTitle(props.track)}
            </Text>
            {subtitle ? (
              <Text style={styles.trackSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <SeekBar
            clock={props.clock}
            duration={props.duration}
            skipSeconds={props.skipSeconds}
            onSeek={props.onSeek}
            onScrubbingChange={props.onScrubbingChange}
          />

          <View style={styles.transport} pointerEvents="box-none">
            <IconButton
              icon={RotateCcwIcon}
              variant="glyph"
              accessibilityLabel={`Back ${props.skipSeconds} seconds`}
              onPress={() => props.onSkip(-props.skipSeconds)}
              testID="skip-back-button"
            />
            <IconButton
              icon={SkipBackIcon}
              variant="glyph"
              accessibilityLabel="Previous track"
              onPress={props.onPrevious}
              disabled={!props.hasPrevious}
              testID="previous-button"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.paused ? 'Play' : 'Pause'}
              onPress={props.onTogglePlayback}
              style={({ pressed }) => [
                styles.play,
                { backgroundColor: colors.accent },
                pressed && styles.playPressed,
              ]}
              testID="play-pause-button"
            >
              {props.paused ? (
                <PlayIcon
                  size={30}
                  color={colors.onAccent}
                  fill={colors.onAccent}
                  // Optical centring: a play triangle looks off-centre when centred.
                  style={styles.playGlyph}
                />
              ) : (
                <PauseIcon
                  size={30}
                  color={colors.onAccent}
                  fill={colors.onAccent}
                />
              )}
            </Pressable>
            <IconButton
              icon={SkipForwardIcon}
              variant="glyph"
              accessibilityLabel="Next track"
              onPress={props.onNext}
              disabled={!props.hasNext}
              testID="next-button"
            />
            <IconButton
              icon={RotateCwIcon}
              variant="glyph"
              accessibilityLabel={`Forward ${props.skipSeconds} seconds`}
              onPress={() => props.onSkip(props.skipSeconds)}
              testID="skip-forward-button"
            />
          </View>

          <QuickActions
            mode="audio"
            centered
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  heading: {
    flex: 1,
    alignItems: 'center',
  },
  headingTitle: {
    ...typography.captionStrong,
    color: playerColors.white,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headingQueue: {
    ...typography.caption,
    color: playerColors.textSecondary,
  },
  topSpacer: {
    width: 44,
  },
  body: {
    flex: 1,
  },
  bodyWide: {
    flexDirection: 'row',
    gap: spacing.xxxl,
  },
  coverSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  coverSlotWide: {
    flex: 0,
    width: '40%',
  },
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: playerColors.surfaceRaised,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
  },
  panel: {
    gap: spacing.lg,
  },
  panelWide: {
    flex: 1,
    justifyContent: 'center',
  },
  meta: {
    gap: spacing.xs,
  },
  trackTitle: {
    ...typography.title2,
    color: playerColors.white,
  },
  trackSubtitle: {
    ...typography.body,
    color: playerColors.textSecondary,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  play: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PLAY_BUTTON_SIZE / 2,
  },
  playPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  playGlyph: {
    marginLeft: 3,
  },
});
