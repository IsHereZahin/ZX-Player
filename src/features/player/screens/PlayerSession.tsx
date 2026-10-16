import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { VideoRef } from 'react-native-video';
import {
  ActivityIndicator,
  Image,
  PixelRatio,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAfterSheetClose } from '../../../shared/components/Sheet';
import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { useStateWithRef } from '../../../shared/hooks/useStateWithRef';
import { playerColors, spacing } from '../../../shared/theme';
import { formatDuration } from '../../../shared/utils/format';
import { clamp } from '../../../shared/utils/math';
import { historyStore, resumePosition } from '../../history/watchHistory';
import { VideoInfoSheet } from '../../library/components/VideoSheets';
import { toggleFavorite, useIsFavorite } from '../../library/favorites';
import { mediaTitle } from '../../library/services/mediaLibrary';
import { getCachedThumbnail } from '../../library/services/thumbnails';
import type { VideoItem } from '../../library/types';
import { setBackgroundPlay } from '../../settings/backgroundPlay';
import {
  SUBTITLE_SCALE,
  updateSettings,
  useSettings,
} from '../../settings/settingsStore';
import { AudioArtwork } from '../components/AudioArtwork';
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
import {
  SubtitleOverlay,
  TimedSubtitleOverlay,
} from '../components/SubtitleOverlay';
import type {
  NativeTextTrack,
  SurfaceConfig,
  VideoEvents,
} from '../components/VideoSurface';
import type { LevelControl } from '../hooks/levelControl';
import { useAutoHideControls } from '../hooks/useAutoHideControls';
import { usePlayback } from '../hooks/usePlayback';
import { usePlaybackProgress } from '../hooks/usePlaybackProgress';
import { describeSleepTimer, type SleepTimer } from '../hooks/useSleepTimer';
import { useSubtitles } from '../hooks/useSubtitles';
import { useMediaSession } from '../hooks/useMediaSession';
import { useToast } from '../hooks/useToast';
import { activePlaybackStore } from '../nowPlaying';
import {
  ASPECT_MODE_DESCRIPTIONS,
  ASPECT_MODE_LABELS,
  clampZoom,
  computeVideoFrame,
  nextAspectMode,
  NO_ZOOM,
  type AspectMode,
  type Size,
  type Zoom,
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
  /** Playing on behind the mini player: keep playback going, draw nothing. */
  minimized: boolean;
  /** The native player, which outlives this item (see PlayerScreen). */
  videoRef: RefObject<VideoRef | null>;
  /** Tells the native player what this item needs (source, paused, tracks, …). */
  onSurfaceChange: (config: SurfaceConfig) => void;
  /** Routes the native player's events to this item. */
  onBindEvents: (events: VideoEvents) => void;
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
  const isAudio = video.kind === 'audio';
  const favorite = useIsFavorite(video.id);
  // Music should not stop when the screen turns off, so audio always plays on.
  const backgroundPlay = settings.backgroundPlay || isAudio;
  // Read once: changing the source's metadata mid-playback could make the player reload.
  const [artworkUri] = useState(() => getCachedThumbnail(video) ?? undefined);
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
    videoRef: props.videoRef,
    initialDurationSec: video.durationSec,
    startAtSec: resumeAt,
    backgroundPlay,
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
    isAudio ||
      playback.paused ||
      scrubbing ||
      sheet !== null ||
      playback.error !== null,
  );
  const { keepAlive } = controls;
  const { seekTo, getCurrentTime, togglePlayback, pause } = playback;

  // Lets the mini player show and steer this item while the player is minimised.
  const { paused, duration, clock } = playback;
  const { hasNext, onNext } = props;
  useEffect(() => {
    activePlaybackStore.setState({
      item: video,
      paused,
      hasNext,
      duration,
      clock,
      togglePlayback,
      next: onNext,
    });
  }, [clock, duration, hasNext, onNext, paused, togglePlayback, video]);
  useEffect(
    () => () =>
      activePlaybackStore.setState(current =>
        current?.clock === clock ? null : current,
      ),
    [clock],
  );
  const title = mediaTitle(video);

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
    } else if (!isAudio) {
      // Audio has nothing to reveal behind the controls, so they stay put.
      controls.toggle();
    }
  }, [controls, isAudio, latest]);

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
      // Screen brightness means nothing on an audio screen.
      brightness: settings.gestureBrightness && !isAudio,
      volume: settings.gestureVolume,
      seek: settings.gestureSeek,
      doubleTap: settings.gestureDoubleTap,
      holdForSpeed: settings.gestureHoldForSpeed,
      zoom: settings.gestureZoom && !isAudio,
    }),
    [
      isAudio,
      settings.gestureBrightness,
      settings.gestureDoubleTap,
      settings.gestureHoldForSpeed,
      settings.gestureZoom,
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

  const externalTrack =
    subtitleChoice.kind === 'external' && subtitles.visible
      ? subtitles.track
      : null;
  // Android draws embedded subtitles natively; iOS hands us the text instead.
  const embeddedText =
    subtitleChoice.kind === 'embedded' && Platform.OS === 'ios'
      ? playback.embeddedCueText
      : '';

  const pictureInPicture = playback.pictureInPicture;
  const showControls = controls.visible && !locked;
  const subtitleLayout = {
    shortSide,
    scale: subtitleScale,
    background: settings.subtitleBackground,
    bottomOffset:
      (showControls ? CONTROLS_CLEARANCE : spacing.xl) + insets.bottom,
  };
  const showSpinner = playback.buffering && !playback.paused && !playback.error;

  // Notification and lock-screen controls (Previous / Play-Pause / Next).
  useMediaSession({
    enabled: backgroundPlay,
    id: video.id,
    title,
    artist: (isAudio && video.artist) || 'ZX Player',
    artworkUri,
    paused: playback.paused,
    buffering: playback.buffering,
    duration: playback.duration,
    speed: props.speed,
    clock: playback.clock,
    hasPrevious: props.hasPrevious,
    hasNext: props.hasNext,
    onPlay: playback.play,
    onPause: pause,
    onPrevious: props.onPrevious,
    onNext: props.onNext,
    onSeek: seekTo,
  });

  // Pinch zoom, kept within the screen for the current aspect mode and orientation.
  const [zoom, setZoom, zoomRef] = useStateWithRef<Zoom>(NO_ZOOM);
  const naturalSizeRef = useLatestRef(playback.naturalSize);
  const getZoom = useCallback(() => zoomRef.current, [zoomRef]);
  const changeZoom = useCallback(
    (next: Zoom) => {
      if (next.scale <= 1) {
        setZoom(NO_ZOOM);
        return;
      }
      const { layout: container, aspectMode } = latest.current;
      const frame = computeVideoFrame(
        aspectMode,
        container,
        naturalSizeRef.current,
        PixelRatio.get(),
      );
      setZoom(clampZoom(next, frame, container));
    },
    [latest, naturalSizeRef, setZoom],
  );
  const resetZoom = useCallback(() => {
    keepAlive();
    setZoom(NO_ZOOM);
  }, [keepAlive, setZoom]);
  useEffect(() => setZoom(NO_ZOOM), [props.aspectMode, setZoom]);

  const surface = useMemo<SurfaceConfig>(
    () => ({
      sourceKey: playback.sourceKey,
      uri: video.uri,
      startPositionSec: playback.startAt,
      title,
      artist: (isAudio && video.artist) || 'ZX Player',
      artworkUri,
      paused: playback.paused,
      rate: boosted ? 2 : props.speed,
      repeat: props.repeatMode === 'one',
      aspectMode: pictureInPicture ? 'fit' : props.aspectMode,
      zoom: pictureInPicture ? NO_ZOOM : zoom,
      naturalSize: playback.naturalSize,
      audioTrackIndex,
      textTrack: nativeTextTrack,
      subtitleFontSize,
      backgroundPlay,
    }),
    [
      artworkUri,
      audioTrackIndex,
      backgroundPlay,
      boosted,
      isAudio,
      nativeTextTrack,
      pictureInPicture,
      playback.naturalSize,
      playback.paused,
      playback.sourceKey,
      playback.startAt,
      props.aspectMode,
      props.repeatMode,
      props.speed,
      subtitleFontSize,
      title,
      video.artist,
      video.uri,
      zoom,
    ],
  );
  // Layout effects, so the native player switches source in the same frame.
  const { onSurfaceChange, onBindEvents } = props;
  useLayoutEffect(
    () => onBindEvents(playback.videoEvents),
    [onBindEvents, playback.videoEvents],
  );
  useLayoutEffect(() => onSurfaceChange(surface), [onSurfaceChange, surface]);

  return (
    <>
      {pictureInPicture || props.minimized ? null : (
        <>
          {/* The thumbnail stands in until the first frame: playback feels instant. */}
          {!isAudio && artworkUri && !playback.readyForDisplay ? (
            <Image
              source={{ uri: artworkUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              fadeDuration={0}
              accessibilityIgnoresInvertColors
              testID="video-poster"
            />
          ) : null}
          {isAudio ? <AudioArtwork item={video} layout={layout} /> : null}

          {externalTrack ? (
            <TimedSubtitleOverlay
              clock={playback.clock}
              track={externalTrack}
              delay={subtitleDelay}
              {...subtitleLayout}
            />
          ) : (
            <SubtitleOverlay text={embeddedText} {...subtitleLayout} />
          )}

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
            getZoom={getZoom}
            onZoomChange={changeZoom}
            brightness={props.brightness}
            volume={props.volume}
          />

          {showSpinner ? (
            <View style={styles.centerLayer} pointerEvents="none">
              <ActivityIndicator
                size="large"
                color={playerColors.primaryBright}
              />
            </View>
          ) : null}

          {showControls ? (
            <PlayerControls
              mode={isAudio ? 'audio' : 'video'}
              zoom={zoom.scale}
              onResetZoom={resetZoom}
              title={isAudio ? 'Now playing' : title}
              queueLabel={props.queueLabel}
              paused={playback.paused}
              clock={playback.clock}
              duration={playback.duration}
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
            isAudio={isAudio}
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
            favorite={favorite}
            onFavorite={() => {
              toggleFavorite(video);
              showToast(
                favorite ? 'Removed from Favorites' : 'Added to Favorites',
              );
            }}
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
