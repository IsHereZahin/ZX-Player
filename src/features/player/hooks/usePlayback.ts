import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { AppState } from 'react-native';
import type {
  OnAudioTracksData,
  OnBufferData,
  OnLoadData,
  OnPictureInPictureStatusChangedData,
  OnPlaybackStateChangedData,
  OnProgressData,
  OnTextTrackDataChangedData,
  OnTextTracksData,
  OnVideoErrorData,
  VideoRef,
} from 'react-native-video';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { useStateWithRef } from '../../../shared/hooks/useStateWithRef';
import { reportError } from '../../../shared/logger';
import { clamp } from '../../../shared/utils/math';
import { createPlaybackClock } from '../playbackClock';
import { normalizeNaturalSize, type Size } from '../utils/aspectRatio';
import type { MediaTrack } from '../utils/tracks';

export interface PlaybackError {
  message: string;
  /** Platform diagnostic (e.g. unsupported codec), useful when reporting a problem. */
  detail: string | null;
}

function describePlaybackError({ error }: OnVideoErrorData): PlaybackError {
  return {
    message: "This video can't be played on this device.",
    detail:
      error.errorString ?? error.localizedDescription ?? error.error ?? null,
  };
}

interface PlaybackOptions {
  /** The native player, shared by every item of the queue. */
  videoRef: RefObject<VideoRef | null>;
  initialDurationSec: number;
  /** Position to jump to once the video has loaded (resume). */
  startAtSec?: number | null;
  /** Keep playing when the app moves to the background. */
  backgroundPlay: boolean;
  /** Open the item paused instead of playing it. */
  startPaused?: boolean;
  /** Returns true when playback moves on to another item. */
  onEnded?: () => boolean;
}

/** Playback state for one video plus the event handlers to wire into `<Video>`. */
export function usePlayback({
  videoRef,
  initialDurationSec,
  startAtSec,
  backgroundPlay,
  startPaused = false,
  onEnded,
}: PlaybackOptions) {
  // Where the source starts: the resume point, or where a failed attempt stopped.
  const [startAt, setStartAt] = useState(startAtSec ?? 0);
  const latest = useLatestRef({ backgroundPlay, onEnded });

  const [paused, setPaused, pausedRef] = useStateWithRef(startPaused);
  const [ended, setEnded, endedRef] = useStateWithRef(false);
  const [duration, setDuration, durationRef] =
    useStateWithRef(initialDurationSec);
  const [clock] = useState(() => createPlaybackClock(startAtSec ?? 0));
  const [buffering, setBuffering, bufferingRef] = useStateWithRef(true);
  const [loaded, setLoaded, loadedRef] = useStateWithRef(false);
  // True once the first frame is on screen (until then a poster can stand in).
  const [readyForDisplay, setReadyForDisplay] = useState(false);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [audioTracks, setAudioTracks] = useState<MediaTrack[]>([]);
  const [textTracks, setTextTracks] = useState<MediaTrack[]>([]);
  // iOS reports the active embedded cue as text instead of drawing it.
  const [embeddedCueText, setEmbeddedCueText] = useState('');
  const [pictureInPicture, setPictureInPicture, pictureInPictureRef] =
    useStateWithRef(false);
  // Set from the PiP request until the app comes back to the foreground: going into PiP
  // sends the app to the background before the player reports PiP as active.
  const pictureInPictureRequested = useRef(false);
  const [error, setError] = useState<PlaybackError | null>(null);
  // Changing the key remounts <Video>, which is how a failed source is retried.
  const [sourceKey, setSourceKey] = useState(0);

  const setCurrentTime = useCallback(
    (time: number) =>
      clock.setState(state =>
        state.currentTime === time ? state : { ...state, currentTime: time },
      ),
    [clock],
  );

  const seekTo = useCallback(
    (time: number) => {
      const upperBound =
        durationRef.current > 0 ? durationRef.current : Math.max(time, 0);
      const target = clamp(time, 0, upperBound);
      videoRef.current?.seek(target);
      setCurrentTime(target);
      if (endedRef.current && target < durationRef.current) {
        setEnded(false);
      }
    },
    [durationRef, endedRef, setCurrentTime, setEnded, videoRef],
  );

  const play = useCallback(() => {
    if (endedRef.current) {
      seekTo(0);
    }
    setPaused(false);
  }, [endedRef, seekTo, setPaused]);

  const pause = useCallback(() => setPaused(true), [setPaused]);

  const togglePlayback = useCallback(() => {
    if (pausedRef.current) {
      play();
    } else {
      pause();
    }
  }, [pausedRef, play, pause]);

  const getCurrentTime = useCallback(
    () => clock.getState().currentTime,
    [clock],
  );
  const getDuration = useCallback(() => durationRef.current, [durationRef]);
  // Progress also counts: an item that started in the background never reports loading, only
  // the media module's progress (see VideoSurface) and its end.
  const progressed = useRef(false);
  const hasPosition = useCallback(
    () => loadedRef.current || progressed.current || endedRef.current,
    [endedRef, loadedRef],
  );

  const retry = useCallback(() => {
    setStartAt(getCurrentTime());
    setReadyForDisplay(false);
    setError(null);
    setBuffering(true);
    setPaused(false);
    setSourceKey(key => key + 1);
  }, [getCurrentTime, setBuffering, setPaused]);

  const enterPictureInPicture = useCallback(() => {
    pictureInPictureRequested.current = true;
    videoRef.current?.enterPictureInPicture();
  }, [videoRef]);

  const onLoad = useCallback(
    (data: OnLoadData) => {
      setDuration(data.duration);
      setNaturalSize(normalizeNaturalSize(data.naturalSize));
      setAudioTracks(data.audioTracks ?? []);
      setTextTracks(data.textTracks ?? []);
      setBuffering(false);
      setLoaded(true);
    },
    [setBuffering, setDuration, setLoaded],
  );

  const onProgress = useCallback(
    (data: OnProgressData) => {
      progressed.current = true;
      clock.setState({
        currentTime: data.currentTime,
        bufferedTime: data.playableDuration,
      });
    },
    [clock],
  );

  const onBuffer = useCallback(
    ({ isBuffering }: OnBufferData) => setBuffering(isBuffering),
    [setBuffering],
  );

  const onEnd = useCallback(() => {
    setEnded(true);
    setCurrentTime(durationRef.current);
    // When the queue moves on, stay "playing" until the next item takes over: a pause in
    // between would let the media session drop the foreground service that keeps
    // background playback alive, and Android may not allow it to start again.
    if (latest.current.onEnded?.()) {
      return;
    }
    setPaused(true);
  }, [durationRef, latest, setCurrentTime, setEnded, setPaused]);

  const onError = useCallback(
    (event: OnVideoErrorData) => {
      reportError('Playback failed', event.error);
      setError(describePlaybackError(event));
      setBuffering(false);
      setPaused(true);
    },
    [setBuffering, setPaused],
  );

  const onAudioTracks = useCallback(
    (data: OnAudioTracksData) => setAudioTracks([...data.audioTracks]),
    [],
  );
  const onTextTracks = useCallback(
    (data: OnTextTracksData) => setTextTracks([...data.textTracks]),
    [],
  );
  const onTextTrackDataChanged = useCallback(
    (data: OnTextTrackDataChangedData) =>
      setEmbeddedCueText(data.subtitleTracks ?? ''),
    [],
  );
  const onReadyForDisplay = useCallback(() => setReadyForDisplay(true), []);

  const onPictureInPictureStatusChanged = useCallback(
    (data: OnPictureInPictureStatusChangedData) =>
      setPictureInPicture(data.isActive),
    [setPictureInPicture],
  );

  /**
   * The native player can be paused or resumed without the app asking: by the PiP
   * window's buttons, by losing audio focus (a call, another app) or by unplugging
   * headphones. Adopt its state so the controls stay truthful and one tap always works.
   * Buffering, seeking and the end of the file also stop playback and are not pauses.
   */
  const onPlaybackStateChanged = useCallback(
    ({ isPlaying, isSeeking }: OnPlaybackStateChangedData) => {
      if (
        isSeeking ||
        !loadedRef.current ||
        bufferingRef.current ||
        endedRef.current
      ) {
        return;
      }
      if (isPlaying === pausedRef.current) {
        setPaused(!isPlaying);
      }
    },
    [bufferingRef, endedRef, loadedRef, pausedRef, setPaused],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        // Back in the foreground means PiP is over, whether or not the player said so,
        // so the controls are never left hidden.
        pictureInPictureRequested.current = false;
        setPictureInPicture(false);
        return;
      }
      const inPictureInPicture =
        pictureInPictureRequested.current || pictureInPictureRef.current;
      // Without background play, stay paused when the app is backgrounded instead of
      // resuming unexpectedly on return. PiP counts as background, but keeps playing.
      if (
        state === 'background' &&
        !latest.current.backgroundPlay &&
        !inPictureInPicture
      ) {
        setPaused(true);
      }
    });
    return () => subscription.remove();
  }, [latest, pictureInPictureRef, setPaused, setPictureInPicture]);

  // Stable identity so the memoised video surface skips re-rendering on progress ticks.
  const videoEvents = useMemo(
    () => ({
      onLoad,
      onProgress,
      onBuffer,
      onEnd,
      onError,
      onAudioTracks,
      onTextTracks,
      onTextTrackDataChanged,
      onPictureInPictureStatusChanged,
      onPlaybackStateChanged,
      onReadyForDisplay,
    }),
    [
      onLoad,
      onProgress,
      onBuffer,
      onEnd,
      onError,
      onAudioTracks,
      onTextTracks,
      onTextTrackDataChanged,
      onPictureInPictureStatusChanged,
      onPlaybackStateChanged,
      onReadyForDisplay,
    ],
  );

  return {
    sourceKey,
    startAt,
    paused,
    ended,
    loaded,
    readyForDisplay,
    duration,
    clock,
    buffering,
    naturalSize,
    audioTracks,
    textTracks,
    embeddedCueText,
    pictureInPicture,
    error,
    play,
    pause,
    togglePlayback,
    seekTo,
    getCurrentTime,
    getDuration,
    hasPosition,
    retry,
    enterPictureInPicture,
    videoEvents,
  };
}
