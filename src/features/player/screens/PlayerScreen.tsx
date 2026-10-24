import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Dimensions,
  StatusBar,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import type { VideoRef } from 'react-native-video';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { playerColors } from '../../../shared/theme';
import { ThemeProvider } from '../../../shared/theming';
import { clamp } from '../../../shared/utils/math';
import type { VideoItem } from '../../library/types';
import { playsInBackground } from '../../settings/backgroundPlay';
import { useSettings } from '../../settings/settingsStore';
import type { RepeatMode } from '../components/PlayerSheets';
import {
  forwardVideoEvents,
  VideoSurface,
  type SurfaceConfig,
  type VideoEvents,
} from '../components/VideoSurface';
import { useBrightnessControl } from '../hooks/useBrightnessControl';
import { endMediaSession } from '../hooks/useMediaSession';
import { useSleepTimer } from '../hooks/useSleepTimer';
import { useVolumeControl } from '../hooks/useVolumeControl';
import { nowPlayingStore, type PlayerOrientation } from '../nowPlaying';
import type { AspectMode, Size } from '../utils/aspectRatio';
import {
  orientationOfItem,
  orientationOfSize,
  type Orientation,
} from '../utils/orientation';
import { PlayerSession } from './PlayerSession';

interface PlayerScreenProps {
  /** Items in play order; next/previous move through this list. */
  queue: VideoItem[];
  startIndex: number;
  /** Ignore the saved position for the first item. */
  startFromBeginning?: boolean;
  /** Playing on behind the mini player: only the native player is kept, off screen. */
  minimized?: boolean;
  onClose: () => void;
  /** Ends playback altogether (the notification's Stop button). */
  onStop: () => void;
  /** The orientation the full player wants the screen in (null: follow the device). */
  onOrientationChange: (orientation: PlayerOrientation) => void;
}

function initialLayout(): Size {
  const { width, height } = Dimensions.get('window');
  return { width, height };
}

/**
 * Owns what carries over from one video to the next: the native player itself, queue
 * position, speed, repeat, aspect ratio, lock, sleep timer, orientation, brightness and
 * volume. Per-video state lives in `PlayerSession`, which is remounted for every video
 * and steers the shared native player. Keeping one native player for the whole queue
 * makes moving on to the next item quick and reliable, also with the screen off.
 */
export function PlayerScreen({
  queue,
  startIndex,
  startFromBeginning = false,
  minimized = false,
  onClose,
  onStop,
  onOrientationChange,
}: PlayerScreenProps) {
  const settings = useSettings();
  const brightness = useBrightnessControl(!minimized);
  const volume = useVolumeControl();

  const [index, setIndex] = useState(() =>
    clamp(startIndex, 0, queue.length - 1),
  );
  // "Play from beginning" applies to the first video only.
  const [ignoreSavedPosition, setIgnoreSavedPosition] =
    useState(startFromBeginning);
  const [startPaused, setStartPaused] = useState(false);
  const [layout, setLayout] = useState<Size>(initialLayout);
  const [speed, setSpeed] = useState(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [aspectMode, setAspectMode] = useState<AspectMode>(
    settings.defaultAspectMode,
  );
  const [locked, setLocked] = useState(false);
  // Each video opens in its own orientation; the rotate button overrides that for the
  // rest of the session.
  const [userOrientation, setUserOrientation] = useState<Orientation | null>(
    null,
  );
  // From the player once a file loads, for items whose library metadata can't tell.
  // Kept across items so an unknown next item doesn't flip the screen before it loads.
  const [loadedOrientation, setLoadedOrientation] =
    useState<Orientation | null>(null);
  const [pauseSignal, setPauseSignal] = useState(0);
  const sleep = useSleepTimer(() => setPauseSignal(count => count + 1));

  const videoRef = useRef<VideoRef>(null);
  const boundEvents = useRef<VideoEvents | null>(null);
  const events = useMemo(() => forwardVideoEvents(boundEvents), []);
  const bindEvents = useCallback((itemEvents: VideoEvents) => {
    boundEvents.current = itemEvents;
  }, []);
  const [surface, setSurface] = useState<SurfaceConfig | null>(null);

  const video = queue[index];
  const orientation: PlayerOrientation =
    userOrientation ??
    (video ? orientationOfItem(video) : null) ??
    loadedOrientation;
  const hasNext = index < queue.length - 1;
  const hasPrevious = index > 0;
  const latest = useLatestRef({
    index,
    hasNext,
    queue,
    repeatMode,
    settings,
    sleep,
  });

  useEffect(() => {
    onOrientationChange(orientation);
  }, [onOrientationChange, orientation]);

  // The notification goes when the player closes, not between queue items. A new queue that
  // replaces this one takes the session over; clearing it first would race the restart of
  // the native session service and could leave playback without a notification.
  useEffect(
    () => () => {
      if (!nowPlayingStore.getState().request) {
        endMediaSession();
      }
    },
    [],
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout(current =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const current = latest.current;
      const from = current.queue[current.index];
      const to = current.queue[next];
      const { backgroundPlay } = current.settings;
      setIgnoreSavedPosition(false);
      // Moving on in the background from an item allowed to play there (audio) to one that
      // isn't (a video without background play): the view's props are held until the app
      // returns, so it would keep playing with no notification. It waits, paused, instead.
      setStartPaused(
        AppState.currentState === 'background' &&
          from !== undefined &&
          to !== undefined &&
          playsInBackground(from, backgroundPlay) &&
          !playsInBackground(to, backgroundPlay),
      );
      setIndex(next);
    },
    [latest],
  );

  const goNext = useCallback(() => {
    if (latest.current.hasNext) {
      goTo(latest.current.index + 1);
    }
  }, [goTo, latest]);

  const goPrevious = useCallback(() => {
    if (latest.current.index > 0) {
      goTo(latest.current.index - 1);
    }
  }, [goTo, latest]);

  /** Decides what happens when a video finishes; true if another video starts. */
  const handleEnded = useCallback(() => {
    const current = latest.current;
    if (current.sleep.timer?.kind === 'end-of-video') {
      current.sleep.setTimer(null);
      return false;
    }
    if (current.repeatMode === 'all' && current.queue.length > 1) {
      goTo(current.hasNext ? current.index + 1 : 0);
      return true;
    }
    if (current.settings.autoPlayNext && current.hasNext) {
      goTo(current.index + 1);
      return true;
    }
    return false;
  }, [goTo, latest]);

  const onNaturalSize = useCallback((size: Size) => {
    setLoadedOrientation(orientationOfSize(size));
  }, []);

  const rotate = useCallback(() => {
    const effective =
      orientation ?? (layout.width >= layout.height ? 'landscape' : 'portrait');
    setUserOrientation(effective === 'landscape' ? 'portrait' : 'landscape');
  }, [layout.height, layout.width, orientation]);

  if (!video) {
    return null;
  }

  return (
    // Shared components (sheets, buttons) inside the player stay dark in a light app.
    <ThemeProvider scheme="dark">
      <View style={styles.root} onLayout={onLayout} testID="player-screen">
        {minimized ? null : <StatusBar hidden animated />}
        {/* Always the first child, so entering or leaving PiP never remounts it. */}
        {surface ? (
          <VideoSurface
            {...surface}
            videoRef={videoRef}
            container={layout}
            events={events}
          />
        ) : null}
        <PlayerSession
          videoRef={videoRef}
          onSurfaceChange={setSurface}
          onBindEvents={bindEvents}
          key={`${index}-${video.id}`}
          video={video}
          queueLabel={
            queue.length > 1 ? `${index + 1} of ${queue.length}` : null
          }
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          layout={layout}
          ignoreSavedPosition={ignoreSavedPosition}
          startPaused={startPaused}
          speed={speed}
          repeatMode={repeatMode}
          aspectMode={aspectMode}
          locked={locked}
          sleepTimer={sleep.timer}
          pauseSignal={pauseSignal}
          brightness={brightness}
          volume={volume}
          onNext={goNext}
          onPrevious={goPrevious}
          onEnded={handleEnded}
          onSpeedChange={setSpeed}
          onRepeatModeChange={setRepeatMode}
          onAspectModeChange={setAspectMode}
          onLockChange={setLocked}
          onSleepTimerChange={sleep.setTimer}
          onRotate={rotate}
          onNaturalSize={onNaturalSize}
          minimized={minimized}
          onClose={onClose}
          onStop={onStop}
        />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: playerColors.black,
  },
});
