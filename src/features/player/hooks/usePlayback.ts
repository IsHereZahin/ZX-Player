import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type {
  OnAudioTracksData,
  OnBufferData,
  OnLoadData,
  OnPictureInPictureStatusChangedData,
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
  initialDurationSec: number;
  /** Position to jump to once the video has loaded (resume). */
  startAtSec?: number | null;
  /** Keep playing when the app moves to the background. */
  backgroundPlay: boolean;
  onEnded?: () => void;
}

/** Playback state for one video plus the event handlers to wire into `<Video>`. */
export function usePlayback({
  initialDurationSec,
  startAtSec,
  backgroundPlay,
  onEnded,
}: PlaybackOptions) {
  const videoRef = useRef<VideoRef>(null);
  const seekOnLoadRef = useRef(startAtSec ?? 0);
  const latest = useLatestRef({ backgroundPlay, onEnded });

  const [paused, setPaused, pausedRef] = useStateWithRef(false);
  const [ended, setEnded, endedRef] = useStateWithRef(false);
  const [duration, setDuration, durationRef] =
    useStateWithRef(initialDurationSec);
  const [clock] = useState(() => createPlaybackClock(startAtSec ?? 0));
  const [buffering, setBuffering] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [audioTracks, setAudioTracks] = useState<MediaTrack[]>([]);
  const [textTracks, setTextTracks] = useState<MediaTrack[]>([]);
  // iOS reports the active embedded cue as text instead of drawing it.
  const [embeddedCueText, setEmbeddedCueText] = useState('');
  const [pictureInPicture, setPictureInPicture] = useState(false);
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
    [durationRef, endedRef, setCurrentTime, setEnded],
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

  const retry = useCallback(() => {
    seekOnLoadRef.current = getCurrentTime();
    setError(null);
    setBuffering(true);
    setPaused(false);
    setSourceKey(key => key + 1);
  }, [getCurrentTime, setPaused]);

  const enterPictureInPicture = useCallback(() => {
    videoRef.current?.enterPictureInPicture();
  }, []);

  const onLoad = useCallback(
    (data: OnLoadData) => {
      setDuration(data.duration);
      setNaturalSize(normalizeNaturalSize(data.naturalSize));
      setAudioTracks(data.audioTracks ?? []);
      setTextTracks(data.textTracks ?? []);
      setBuffering(false);
      setLoaded(true);
      if (seekOnLoadRef.current > 0) {
        videoRef.current?.seek(seekOnLoadRef.current);
        seekOnLoadRef.current = 0;
      }
    },
    [setDuration],
  );

  const onProgress = useCallback(
    (data: OnProgressData) =>
      clock.setState({
        currentTime: data.currentTime,
        bufferedTime: data.playableDuration,
      }),
    [clock],
  );

  const onBuffer = useCallback(
    ({ isBuffering }: OnBufferData) => setBuffering(isBuffering),
    [],
  );

  const onEnd = useCallback(() => {
    setEnded(true);
    setPaused(true);
    setCurrentTime(durationRef.current);
    latest.current.onEnded?.();
  }, [durationRef, latest, setCurrentTime, setEnded, setPaused]);

  const onError = useCallback(
    (event: OnVideoErrorData) => {
      reportError('Playback failed', event.error);
      setError(describePlaybackError(event));
      setBuffering(false);
      setPaused(true);
    },
    [setPaused],
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
  const onPictureInPictureStatusChanged = useCallback(
    (data: OnPictureInPictureStatusChangedData) =>
      setPictureInPicture(data.isActive),
    [],
  );

  // Without background play, stay paused when the app is backgrounded instead of
  // resuming unexpectedly on return.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' && !latest.current.backgroundPlay) {
        setPaused(true);
      }
    });
    return () => subscription.remove();
  }, [latest, setPaused]);

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
    ],
  );

  return {
    videoRef,
    sourceKey,
    paused,
    ended,
    loaded,
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
    retry,
    enterPictureInPicture,
    videoEvents,
  };
}
