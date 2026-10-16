import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackScreenProps } from '../../../app/navigation/types';
import { useTransientMessage } from '../../../shared/hooks/useTransientMessage';
import { colors, fontSize, radius, spacing } from '../../../shared/theme';
import { describeFileName } from '../../library/services/mediaLibrary';
import { OptionSheet, type SheetOption } from '../components/OptionSheet';
import { PlaybackErrorOverlay } from '../components/PlaybackErrorOverlay';
import { PlayerControls } from '../components/PlayerControls';
import { PlayerGestureLayer } from '../components/PlayerGestureLayer';
import { SubtitleOverlay } from '../components/SubtitleOverlay';
import { VideoSurface } from '../components/VideoSurface';
import { useAutoHideControls } from '../hooks/useAutoHideControls';
import { useBrightnessControl } from '../hooks/useBrightnessControl';
import { usePlayback } from '../hooks/usePlayback';
import { useSubtitles } from '../hooks/useSubtitles';
import { useVolumeControl } from '../hooks/useVolumeControl';
import { getSubtitleText } from '../subtitles';
import {
  ASPECT_MODE_DESCRIPTIONS,
  nextAspectMode,
  type AspectMode,
  type Size,
} from '../utils/aspectRatio';

type Props = RootStackScreenProps<'Player'>;

/** Approximate height of the bottom control bar; subtitles move above it. */
const BOTTOM_BAR_CLEARANCE = 72;

function initialLayout(): Size {
  const { width, height } = Dimensions.get('window');
  return { width, height };
}

export function PlayerScreen({ navigation, route }: Props) {
  const { video } = route.params;
  const insets = useSafeAreaInsets();
  const playback = usePlayback(video.durationSec);
  const subtitles = useSubtitles();
  const brightness = useBrightnessControl();
  const volume = useVolumeControl();
  const [toast, showToast] = useTransientMessage();

  const [layout, setLayout] = useState<Size>(initialLayout);
  const [aspectMode, setAspectMode] = useState<AspectMode>('fit');
  const [scrubbing, setScrubbing] = useState(false);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [landscapeLocked, setLandscapeLocked] = useState(false);

  const controls = useAutoHideControls(
    playback.paused || scrubbing || subtitleMenuOpen || playback.error !== null,
  );
  const { keepAlive } = controls;
  const { seekTo, getCurrentTime, togglePlayback, pause } = playback;

  useLayoutEffect(() => {
    navigation.setOptions({
      orientation: landscapeLocked ? 'landscape' : 'default',
    });
  }, [navigation, landscapeLocked]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout(current =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleTogglePlayback = useCallback(() => {
    keepAlive();
    togglePlayback();
  }, [keepAlive, togglePlayback]);

  const handleSkip = useCallback(
    (seconds: number) => {
      keepAlive();
      seekTo(getCurrentTime() + seconds);
    },
    [keepAlive, seekTo, getCurrentTime],
  );

  const handleSeek = useCallback(
    (time: number) => {
      keepAlive();
      seekTo(time);
    },
    [keepAlive, seekTo],
  );

  const cycleAspectMode = useCallback(() => {
    keepAlive();
    const next = nextAspectMode(aspectMode);
    setAspectMode(next);
    showToast(ASPECT_MODE_DESCRIPTIONS[next]);
  }, [aspectMode, keepAlive, showToast]);

  const toggleOrientationLock = useCallback(() => {
    keepAlive();
    setLandscapeLocked(!landscapeLocked);
    showToast(landscapeLocked ? 'Auto-rotate' : 'Locked to landscape');
  }, [keepAlive, landscapeLocked, showToast]);

  const { loadFromFile, toggleVisible, clear: clearSubtitles } = subtitles;

  const loadSubtitles = useCallback(async () => {
    pause();
    const result = await loadFromFile();
    if (result.status === 'loaded') {
      showToast(`Subtitles: ${result.fileName}`);
    } else if (result.status === 'error') {
      showToast(result.message);
    }
  }, [loadFromFile, pause, showToast]);

  const openSubtitles = useCallback(() => {
    keepAlive();
    if (subtitles.track) {
      setSubtitleMenuOpen(true);
    } else {
      loadSubtitles();
    }
  }, [keepAlive, loadSubtitles, subtitles.track]);

  const subtitleOptions = useMemo<SheetOption[]>(
    () => [
      { key: 'load', label: 'Load another file…', onSelect: loadSubtitles },
      {
        key: 'toggle',
        label: subtitles.visible ? 'Hide subtitles' : 'Show subtitles',
        onSelect: toggleVisible,
      },
      {
        key: 'remove',
        label: 'Remove subtitles',
        onSelect: clearSubtitles,
        destructive: true,
      },
    ],
    [clearSubtitles, loadSubtitles, subtitles.visible, toggleVisible],
  );

  const subtitleText =
    subtitles.track && subtitles.visible
      ? getSubtitleText(subtitles.track, playback.currentTime)
      : '';
  const { title } = describeFileName(video.fileName);
  const showSpinner = playback.buffering && !playback.paused && !playback.error;

  return (
    <View style={styles.root} onLayout={onLayout} testID="player-screen">
      <StatusBar hidden animated />

      <VideoSurface
        videoRef={playback.videoRef}
        sourceKey={playback.sourceKey}
        uri={video.uri}
        paused={playback.paused}
        aspectMode={aspectMode}
        container={layout}
        naturalSize={playback.naturalSize}
        events={playback.videoEvents}
      />

      <SubtitleOverlay
        text={subtitleText}
        shortSide={Math.min(layout.width, layout.height)}
        bottomOffset={
          (controls.visible ? BOTTOM_BAR_CLEARANCE : spacing.xl) + insets.bottom
        }
      />

      <PlayerGestureLayer
        layout={layout}
        duration={playback.duration}
        getCurrentTime={getCurrentTime}
        seekTo={seekTo}
        togglePlayback={togglePlayback}
        toggleControls={controls.toggle}
        brightness={brightness}
        volume={volume}
      />

      {showSpinner ? (
        <View style={styles.centerLayer} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : null}

      {controls.visible ? (
        <PlayerControls
          title={title}
          paused={playback.paused}
          currentTime={playback.currentTime}
          duration={playback.duration}
          bufferedTime={playback.bufferedTime}
          aspectMode={aspectMode}
          landscapeLocked={landscapeLocked}
          subtitlesLoaded={subtitles.track !== null}
          onBack={goBack}
          onTogglePlayback={handleTogglePlayback}
          onSkip={handleSkip}
          onSeek={handleSeek}
          onScrubbingChange={setScrubbing}
          onCycleAspect={cycleAspectMode}
          onSubtitles={openSubtitles}
          onToggleOrientation={toggleOrientationLock}
        />
      ) : null}

      {toast ? (
        <View
          style={[styles.toastLayer, { top: insets.top + 72 }]}
          pointerEvents="none"
        >
          <Text style={styles.toast} testID="player-toast">
            {toast}
          </Text>
        </View>
      ) : null}

      {playback.error ? (
        <PlaybackErrorOverlay
          error={playback.error}
          onRetry={playback.retry}
          onBack={goBack}
        />
      ) : null}

      <OptionSheet
        visible={subtitleMenuOpen}
        title={subtitles.fileName ?? 'Subtitles'}
        options={subtitleOptions}
        onClose={() => setSubtitleMenuOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centerLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.playerPanel,
    color: colors.textPrimary,
    fontSize: fontSize.body,
  },
});
