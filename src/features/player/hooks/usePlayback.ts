import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type {
  OnBufferData,
  OnLoadData,
  OnProgressData,
  OnVideoErrorData,
  VideoRef,
} from 'react-native-video';

import { useStateWithRef } from '../../../shared/hooks/useStateWithRef';
import { reportError } from '../../../shared/logger';
import { clamp } from '../../../shared/utils/math';
import { normalizeNaturalSize, type Size } from '../utils/aspectRatio';

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

/** Playback state for one video plus the event handlers to wire into `<Video>`. */
export function usePlayback(initialDurationSec: number) {
  const videoRef = useRef<VideoRef>(null);
  const resumeAtRef = useRef(0);

  const [paused, setPaused, pausedRef] = useStateWithRef(false);
  const [ended, setEnded, endedRef] = useStateWithRef(false);
  const [duration, setDuration, durationRef] =
    useStateWithRef(initialDurationSec);
  const [currentTime, setCurrentTime, currentTimeRef] = useStateWithRef(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [error, setError] = useState<PlaybackError | null>(null);
  // Changing the key remounts <Video>, which is how a failed source is retried.
  const [sourceKey, setSourceKey] = useState(0);

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
    () => currentTimeRef.current,
    [currentTimeRef],
  );

  const retry = useCallback(() => {
    resumeAtRef.current = currentTimeRef.current;
    setError(null);
    setBuffering(true);
    setPaused(false);
    setSourceKey(key => key + 1);
  }, [currentTimeRef, setPaused]);

  const onLoad = useCallback(
    (data: OnLoadData) => {
      setDuration(data.duration);
      setNaturalSize(normalizeNaturalSize(data.naturalSize));
      setBuffering(false);
      if (resumeAtRef.current > 0) {
        videoRef.current?.seek(resumeAtRef.current);
        resumeAtRef.current = 0;
      }
    },
    [setDuration],
  );

  const onProgress = useCallback(
    (data: OnProgressData) => {
      setCurrentTime(data.currentTime);
      setBufferedTime(data.playableDuration);
    },
    [setCurrentTime],
  );

  const onBuffer = useCallback(
    ({ isBuffering }: OnBufferData) => setBuffering(isBuffering),
    [],
  );

  const onEnd = useCallback(() => {
    setEnded(true);
    setPaused(true);
    setCurrentTime(durationRef.current);
  }, [durationRef, setCurrentTime, setEnded, setPaused]);

  const onError = useCallback(
    (event: OnVideoErrorData) => {
      reportError('Playback failed', event.error);
      setError(describePlaybackError(event));
      setBuffering(false);
      setPaused(true);
    },
    [setPaused],
  );

  // Stay paused when the app is backgrounded instead of resuming unexpectedly on return.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') {
        setPaused(true);
      }
    });
    return () => subscription.remove();
  }, [setPaused]);

  // Stable identity so the memoised video surface skips re-rendering on progress ticks.
  const videoEvents = useMemo(
    () => ({ onLoad, onProgress, onBuffer, onEnd, onError }),
    [onLoad, onProgress, onBuffer, onEnd, onError],
  );

  return {
    videoRef,
    sourceKey,
    paused,
    ended,
    duration,
    currentTime,
    bufferedTime,
    buffering,
    naturalSize,
    error,
    play,
    pause,
    togglePlayback,
    seekTo,
    getCurrentTime,
    retry,
    videoEvents,
  };
}
