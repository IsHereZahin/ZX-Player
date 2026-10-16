import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as nativeMedia from 'zxplayer-media';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import type { PlaybackClock } from '../playbackClock';

/**
 * On Android the notification and lock-screen controls come from ZX Player's own media
 * session (zxplayer-media), which offers Previous / Next; react-native-video's built-in
 * notification only seeks. iOS keeps react-native-video's Now Playing integration.
 */
export function usesOwnMediaSession(): boolean {
  return Platform.OS === 'android' && nativeMedia.isNativeMediaAvailable;
}

/** Removes the notification; called when the player closes. */
export function endMediaSession(): void {
  if (usesOwnMediaSession()) {
    nativeMedia.clearNowPlaying();
  }
}

interface MediaSessionOptions {
  /** Only while playback may continue in the background. */
  enabled: boolean;
  id: string;
  title: string;
  artist: string;
  artworkUri?: string;
  paused: boolean;
  buffering: boolean;
  duration: number;
  speed: number;
  clock: PlaybackClock;
  hasPrevious: boolean;
  hasNext: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
}

/** The session works out the position from the last update; resend after a bigger jump. */
const DRIFT_TOLERANCE_SEC = 1.5;

/** Mirrors the playing item into the media session and handles its buttons. */
export function useMediaSession(options: MediaSessionOptions): void {
  const {
    enabled,
    id,
    title,
    artist,
    artworkUri,
    paused,
    buffering,
    duration,
    speed,
    clock,
    hasPrevious,
    hasNext,
  } = options;
  const active = enabled && usesOwnMediaSession();
  const latest = useLatestRef(options);

  useEffect(() => {
    if (!active) {
      endMediaSession();
      return;
    }
    let lastSent = { position: 0, at: 0 };
    const send = () => {
      const position = clock.getState().currentTime;
      lastSent = { position, at: Date.now() };
      nativeMedia.setNowPlaying({
        id,
        title,
        artist,
        artworkUri: artworkUri ?? null,
        durationMs: Math.round(duration * 1000),
        positionMs: Math.round(position * 1000),
        playing: !paused,
        buffering,
        speed,
        hasPrevious,
        hasNext,
      });
    };
    send();
    // Seeks show up as jumps in the playback clock.
    return clock.subscribe(() => {
      const elapsed = (Date.now() - lastSent.at) / 1000;
      const expected =
        paused || buffering
          ? lastSent.position
          : lastSent.position + elapsed * speed;
      if (
        Math.abs(clock.getState().currentTime - expected) > DRIFT_TOLERANCE_SEC
      ) {
        send();
      }
    });
  }, [
    active,
    artist,
    artworkUri,
    buffering,
    clock,
    duration,
    hasNext,
    hasPrevious,
    id,
    paused,
    speed,
    title,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const subscription = nativeMedia.addRemoteCommandListener(
      ({ command, positionMs }) => {
        const handlers = latest.current;
        switch (command) {
          case 'play':
            handlers.onPlay();
            break;
          case 'pause':
            handlers.onPause();
            break;
          case 'previous':
            handlers.onPrevious();
            break;
          case 'next':
            handlers.onNext();
            break;
          case 'seek':
            handlers.onSeek(positionMs / 1000);
            break;
        }
      },
    );
    return () => subscription.remove();
  }, [active, latest]);
}
