import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAfterSheetClose } from '../../../shared/components/Sheet';
import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { colors, spacing } from '../../../shared/theme';
import { formatDuration } from '../../../shared/utils/format';
import { clamp } from '../../../shared/utils/math';
import { historyStore, resumePosition } from '../../history/watchHistory';
import { VideoInfoSheet } from '../../library/components/VideoSheets';
import { describeFileName } from '../../library/services/mediaLibrary';
import type { VideoItem } from '../../library/types';
import { setBackgroundPlay } from '../../settings/backgroundPlay';
import {
  SUBTITLE_SCALE,
  updateSettings,
  useSettings,
} from '../../settings/settingsStore';
import { LockOverlay } from '../components/LockOverlay';
import { PlaybackErrorOverlay } from '../components/PlaybackErrorOverlay';
import { PlayerControls } from '../components/PlayerControls';
import { PlayerGestureLayer } from '../components/PlayerGestureLayer';
import {
  AspectSheet,
  AudioTrackSheet,
  MoreSheet,
  SleepTimerSheet,
  SpeedSheet,
  SubtitleSheet,
  type RepeatMode,
  type SubtitleChoice,
} from '../components/PlayerSheets';
import { PlayerToast } from '../components/PlayerToast';
import { SubtitleOverlay } from '../components/SubtitleOverlay';
import { VideoSurface, type NativeTextTrack } from '../components/VideoSurface';
import type { LevelControl } from '../hooks/levelControl';
import { useAutoHideControls } from '../hooks/useAutoHideControls';
import { usePlayback } from '../hooks/usePlayback';
import { usePlaybackProgress } from '../hooks/usePlaybackProgress';
import { describeSleepTimer, type SleepTimer } from '../hooks/useSleepTimer';
import { useSubtitles } from '../hooks/useSubtitles';
import { useToast } from '../hooks/useToast';
import { getSubtitleText } from '../subtitles';
import {
  ASPECT_MODE_DESCRIPTIONS,
  ASPECT_MODE_LABELS,
  nextAspectMode,
  type AspectMode,
  type Size,
} from '../utils/aspectRatio';

type SheetName =
  | 'more'
  | 'speed'
  | 'audio'
  | 'subtitles'
  | 'sleep'
  | 'aspect'
  | 'info';

/** Space kept free under subtitles while the bottom controls are showing. */
const CONTROLS_CLEARANCE = 128;
const LOCK_HINT_MS = 2500;
/** "Previous" restarts the current video instead once past this point. */
const RESTART_THRESHOLD_SEC = 5;

const REPEAT_ORDER: Record<RepeatMode, RepeatMode> = {
  off: 'all',
  all: 'one',
  one: 'off',
};
const REPEAT_TOASTS: Record<RepeatMode, string> = {
  off: 'Repeat off',
  all: 'Repeat all',
  one: 'Repeat this video',
};

export interface PlayerSessionProps {
  video: VideoItem;
  queueLabel: string | null;
  hasNext: boolean;
  hasPrevious: boolean;
  layout: Size;
  ignoreSavedPosition: boolean;
  speed: number;
  repeatMode: RepeatMode;
  aspectMode: AspectMode;
  locked: boolean;
  sleepTimer: SleepTimer;
  /** Increments when the sleep timer fires. */
  pauseSignal: number;
  brightness: LevelControl;
  volume: LevelControl;
  onNext: () => void;
  onPrevious: () => void;
  /** Called when the video finishes; returns true if playback moved on to another video. */
  onEnded: () => boolean;
  onSpeedChange: (speed: number) => void;
  onRepeatModeChange: (mode: RepeatMode) => void;
  onAspectModeChange: (mode: AspectMode) => void;
  onLockChange: (locked: boolean) => void;
  onSleepTimerChange: (timer: SleepTimer) => void;
  onRotate: () => void;
  onNaturalSize: (size: Size) => void;
  onClose: () => void;
}

/** Everything that belongs to one video; remounted when the queue moves on. */
export function PlayerSession(props: PlayerSessionProps) {
  const { video, locked, layout } = props;
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const latest = useLatestRef(props);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const { schedule, onDismissed } = useAfterSheetClose();

  // Read once: the saved position must not move while this video is playing.
  const [resumeAt] = useState(() =>
    props.ignoreSavedPosition || !settings.resumePlayback
      ? null
      : resumePosition(historyStore.getState()[video.id]),
  );

  const handleEnded = useCallback(() => {
    latest.current.onEnded();
  }, [latest]);

  const playback = usePlayback({
    initialDurationSec: video.durationSec,
    startAtSec: resumeAt,
    backgroundPlay: settings.backgroundPlay,
    onEnded: handleEnded,
  });
  usePlaybackProgress(video, playback);

  const subtitles = useSubtitles();
  const [subtitleChoice, setSubtitleChoice] = useState<SubtitleChoice>({
    kind: 'off',
  });
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [audioTrackIndex, setAudioTrackIndex] = useState<number | null>(null);
  const [boosted, setBoosted] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [lockHint, setLockHint] = useState(false);

  const controls = useAutoHideControls(
    playback.paused || scrubbing || sheet !== null || playback.error !== null,
  );
  const { keepAlive } = controls;
  const { seekTo, getCurrentTime, togglePlayback, pause } = playback;
  const { title } = describeFileName(video.fileName);

  // Once the file is open: adopt its default tracks, report its shape, offer "start over".
  const { loaded, naturalSize, audioTracks, textTracks } = playback;
  const initialised = useRef(false);
  useEffect(() => {
    if (!loaded || initialised.current) {
      return;
    }
    initialised.current = true;
    const defaultText = textTracks.find(track => track.selected);
    if (defaultText) {
      setSubtitleChoice({ kind: 'embedded', index: defaultText.index });
    }
    const defaultAudio =
      audioTracks.find(track => track.selected) ?? audioTracks[0];
    if (defaultAudio) {
      setAudioTrackIndex(defaultAudio.index);
    }
    if (naturalSize) {
      latest.current.onNaturalSize(naturalSize);
    }
    if (resumeAt !== null) {
      showToast(`Resumed from ${formatDuration(resumeAt)}`, {
        label: 'Start over',
        onPress: () => seekTo(0),
      });
    }
  }, [
    audioTracks,
    latest,
    loaded,
    naturalSize,
    resumeAt,
    seekTo,
    showToast,
    textTracks,
  ]);

  // Sleep timer expiry (the signal's value at mount is not an expiry).
  const initialPauseSignal = useRef(props.pauseSignal);
  useEffect(() => {
    if (props.pauseSignal !== initialPauseSignal.current) {
      pause();
      showToast('Sleep timer ended · Playback paused');
    }
  }, [pause, props.pauseSignal, showToast]);

  useEffect(() => {
    if (!lockHint) {
      return;
    }
    const timer = setTimeout(() => setLockHint(false), LOCK_HINT_MS);
    return () => clearTimeout(timer);
  }, [lockHint]);

  const toggleControls = useCallback(() => {
    if (latest.current.locked) {
      setLockHint(visible => !visible);
    } else {
      controls.toggle();
    }
  }, [controls, latest]);

  const handleSkip = useCallback(
    (seconds: number) => {
      keepAlive();
      seekTo(getCurrentTime() + seconds);
    },
    [getCurrentTime, keepAlive, seekTo],
  );

  const handleSeek = useCallback(
    (time: number) => {
      keepAlive();
      seekTo(time);
    },
    [keepAlive, seekTo],
  );

  const handlePrevious = useCallback(() => {
    keepAlive();
    if (
      getCurrentTime() > RESTART_THRESHOLD_SEC ||
      !latest.current.hasPrevious
    ) {
      seekTo(0);
    } else {
      latest.current.onPrevious();
    }
  }, [getCurrentTime, keepAlive, latest, seekTo]);

  const openSheet = useCallback((name: SheetName) => setSheet(name), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  /** Switches from the More sheet to another one once it has closed. */
  const openFromMore = useCallback(
    (name: SheetName) => {
      setSheet(null);
      schedule(() => setSheet(name));
    },
    [schedule],
  );

  const cycleAspect = useCallback(() => {
    keepAlive();
    const next = nextAspectMode(latest.current.aspectMode);
    latest.current.onAspectModeChange(next);
    showToast(
      `${ASPECT_MODE_LABELS[next]} · ${ASPECT_MODE_DESCRIPTIONS[next]}`,
    );
  }, [keepAlive, latest, showToast]);

  const lock = useCallback(() => {
    latest.current.onLockChange(true);
    setLockHint(true);
  }, [latest]);

  const unlock = useCallback(() => {
    latest.current.onLockChange(false);
    setLockHint(false);
    keepAlive();
  }, [keepAlive, latest]);

  const { loadFromFile } = subtitles;
  const loadSubtitleFile = useCallback(async () => {
    pause();
    const result = await loadFromFile();
    if (result.status === 'loaded') {
      setSubtitleChoice({ kind: 'external' });
      setSubtitleDelay(0);
      showToast(`Subtitles: ${result.fileName}`);
    } else if (result.status === 'error') {
      showToast(result.message);
    }
  }, [loadFromFile, pause, showToast]);

  const cycleRepeat = useCallback(() => {
    const next = REPEAT_ORDER[latest.current.repeatMode];
    latest.current.onRepeatModeChange(next);
    showToast(REPEAT_TOASTS[next]);
  }, [latest, showToast]);

  const nativeTextTrack = useMemo<NativeTextTrack>(
    () =>
      subtitleChoice.kind === 'embedded'
        ? { kind: 'embedded', index: subtitleChoice.index }
        : { kind: 'off' },
    [subtitleChoice],
  );

  const gestureToggles = useMemo(
    () => ({
      brightness: settings.gestureBrightness,
      volume: settings.gestureVolume,
      seek: settings.gestureSeek,
      doubleTap: settings.gestureDoubleTap,
      holdForSpeed: settings.gestureHoldForSpeed,
    }),
    [
      settings.gestureBrightness,
      settings.gestureDoubleTap,
      settings.gestureHoldForSpeed,
      settings.gestureSeek,
      settings.gestureVolume,
    ],
  );

  const shortSide = Math.min(layout.width, layout.height);
  const subtitleScale = SUBTITLE_SCALE[settings.subtitleSize];
  const subtitleFontSize = clamp(
    Math.round(shortSide * 0.048 * subtitleScale),
    13,
    40,
  );

  let subtitleText = '';
  if (
    subtitleChoice.kind === 'external' &&
    subtitles.track &&
    subtitles.visible
  ) {
    subtitleText = getSubtitleText(
      subtitles.track,
      playback.currentTime - subtitleDelay,
    );
  } else if (subtitleChoice.kind === 'embedded' && Platform.OS === 'ios') {
    // Android draws embedded subtitles natively; iOS hands us the text instead.
    subtitleText = playback.embeddedCueText;
  }

  const pictureInPicture = playback.pictureInPicture;
  const showControls = controls.visible && !locked;
  const showSpinner = playback.buffering && !playback.paused && !playback.error;

  return (
    <>
      {/* Always the first child, so entering or leaving PiP never remounts the player. */}
      <VideoSurface
        videoRef={playback.videoRef}
        sourceKey={playback.sourceKey}
        uri={video.uri}
        title={title}
        paused={playback.paused}
        rate={boosted ? 2 : props.speed}
        repeat={props.repeatMode === 'one'}
        aspectMode={pictureInPicture ? 'fit' : props.aspectMode}
        container={layout}
        naturalSize={playback.naturalSize}
        audioTrackIndex={audioTrackIndex}
        textTrack={nativeTextTrack}
        subtitleFontSize={subtitleFontSize}
        backgroundPlay={settings.backgroundPlay}
        events={playback.videoEvents}
      />
      {pictureInPicture ? null : (
        <>
          <SubtitleOverlay
            text={subtitleText}
            shortSide={shortSide}
            scale={subtitleScale}
            background={settings.subtitleBackground}
            bottomOffset={
              (showControls ? CONTROLS_CLEARANCE : spacing.xl) + insets.bottom
            }
          />

          <PlayerGestureLayer
            layout={layout}
            duration={playback.duration}
            skipSeconds={settings.skipSeconds}
            toggles={gestureToggles}
            locked={locked}
            getCurrentTime={getCurrentTime}
            seekTo={seekTo}
            togglePlayback={togglePlayback}
            toggleControls={toggleControls}
            onBoostChange={setBoosted}
            brightness={props.brightness}
            volume={props.volume}
          />

          {showSpinner ? (
            <View style={styles.centerLayer} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.primaryBright} />
            </View>
          ) : null}

          {showControls ? (
            <PlayerControls
              title={title}
              queueLabel={props.queueLabel}
              paused={playback.paused}
              currentTime={playback.currentTime}
              duration={playback.duration}
              bufferedTime={playback.bufferedTime}
              skipSeconds={settings.skipSeconds}
              speed={props.speed}
              hasPrevious
              hasNext={props.hasNext}
              subtitlesActive={subtitleChoice.kind !== 'off'}
              showAudioTracks={playback.audioTracks.length > 1}
              onBack={props.onClose}
              onTogglePlayback={() => {
                keepAlive();
                togglePlayback();
              }}
              onSkip={handleSkip}
              onSeek={handleSeek}
              onScrubbingChange={setScrubbing}
              onPrevious={handlePrevious}
              onNext={props.onNext}
              onOpenSpeed={() => openSheet('speed')}
              onOpenSubtitles={() => openSheet('subtitles')}
              onOpenAudio={() => openSheet('audio')}
              onOpenMore={() => openSheet('more')}
              onCycleAspect={cycleAspect}
              onRotate={() => {
                keepAlive();
                props.onRotate();
              }}
              onLock={lock}
              onPictureInPicture={playback.enterPictureInPicture}
            />
          ) : null}

          {locked && lockHint ? <LockOverlay onUnlock={unlock} /> : null}

          <PlayerToast
            toast={toast}
            top={insets.top + 76}
            onAction={dismissToast}
          />

          {playback.error ? (
            <PlaybackErrorOverlay
              error={playback.error}
              hasNext={props.hasNext}
              onRetry={playback.retry}
              onNext={props.onNext}
              onBack={props.onClose}
            />
          ) : null}

          <MoreSheet
            visible={sheet === 'more'}
            onClose={closeSheet}
            onDismissed={onDismissed}
            speed={props.speed}
            aspectMode={props.aspectMode}
            sleepLabel={describeSleepTimer(props.sleepTimer)}
            sleepActive={props.sleepTimer !== null}
            repeatMode={props.repeatMode}
            backgroundPlay={settings.backgroundPlay}
            showAudioTracks={playback.audioTracks.length > 1}
            onSpeed={() => openFromMore('speed')}
            onAudio={() => openFromMore('audio')}
            onSubtitles={() => openFromMore('subtitles')}
            onAspect={() => openFromMore('aspect')}
            onSleep={() => openFromMore('sleep')}
            onRepeat={cycleRepeat}
            onBackgroundPlay={() => setBackgroundPlay(!settings.backgroundPlay)}
            onInfo={() => openFromMore('info')}
          />
          <SpeedSheet
            visible={sheet === 'speed'}
            onClose={closeSheet}
            speed={props.speed}
            onChange={props.onSpeedChange}
          />
          <AudioTrackSheet
            visible={sheet === 'audio'}
            onClose={closeSheet}
            tracks={playback.audioTracks}
            selectedIndex={audioTrackIndex}
            onSelect={setAudioTrackIndex}
          />
          <SubtitleSheet
            visible={sheet === 'subtitles'}
            onClose={closeSheet}
            onDismissed={onDismissed}
            textTracks={playback.textTracks}
            choice={subtitleChoice}
            externalFileName={subtitles.fileName}
            delay={subtitleDelay}
            size={settings.subtitleSize}
            onChoose={setSubtitleChoice}
            onLoadFile={() => schedule(loadSubtitleFile)}
            onDelayChange={setSubtitleDelay}
            onSizeChange={size => updateSettings({ subtitleSize: size })}
          />
          <SleepTimerSheet
            visible={sheet === 'sleep'}
            onClose={closeSheet}
            timer={props.sleepTimer}
            remainingLabel={describeSleepTimer(props.sleepTimer)}
            onSet={timer => {
              props.onSleepTimerChange(timer);
              showToast(
                timer
                  ? `Sleep timer · ${describeSleepTimer(timer)}`
                  : 'Sleep timer off',
              );
            }}
          />
          <AspectSheet
            visible={sheet === 'aspect'}
            onClose={closeSheet}
            mode={props.aspectMode}
            onSelect={props.onAspectModeChange}
          />
          <VideoInfoSheet
            video={video}
            visible={sheet === 'info'}
            onClose={closeSheet}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  centerLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
