import { createStore, useStore, type Store } from '../../shared/storage/store';

export interface PlaybackClockState {
  currentTime: number;
  /** End of the range the player can play without waiting (seconds). */
  bufferedTime: number;
}

/**
 * Playback position, kept outside React state. Progress arrives four times a second; only
 * the components that show the time subscribe, so the rest of the player stays still.
 */
export type PlaybackClock = Store<PlaybackClockState>;

export function createPlaybackClock(startAtSec: number): PlaybackClock {
  return createStore<PlaybackClockState>({
    currentTime: startAtSec,
    bufferedTime: 0,
  });
}

export function usePlaybackClock(clock: PlaybackClock): PlaybackClockState {
  return useStore(clock, state => state);
}
