import { createStore } from '../../shared/storage/store';
import type { VideoItem } from '../library/types';
import { playsInBackground } from '../settings/backgroundPlay';
import { settingsStore } from '../settings/settingsStore';
import type { PlaybackClock } from './playbackClock';
import { orientationOfItem } from './utils/orientation';

export interface PlaybackRequest {
  /** New for every queue, so the player starts afresh. */
  id: number;
  queue: VideoItem[];
  startIndex: number;
  /** Ignore the saved position for the first item. */
  startFromBeginning: boolean;
}

/** `full`: the player fills the screen. `mini`: it plays on behind the mini player. */
export type PlayerPresentation = 'full' | 'mini';
/** Orientation the full player asks for; null follows the device. */
export type PlayerOrientation = 'landscape' | 'portrait' | null;

interface NowPlayingState {
  request: PlaybackRequest | null;
  presentation: PlayerPresentation;
  orientation: PlayerOrientation;
}

const IDLE: NowPlayingState = {
  request: null,
  presentation: 'full',
  orientation: null,
};

/**
 * What is playing, app-wide. The player lives at the app root (see PlayerHost) rather
 * than inside a screen, so playback can continue while the user browses.
 */
export const nowPlayingStore = createStore<NowPlayingState>(IDLE);

let nextRequestId = 1;

export function startPlayback(
  queue: VideoItem[],
  startIndex: number,
  startFromBeginning = false,
): void {
  const first = queue[startIndex];
  nowPlayingStore.setState({
    request: {
      id: nextRequestId++,
      queue,
      startIndex,
      startFromBeginning,
    },
    presentation: 'full',
    // Known from the library, so the screen turns while the file is still opening.
    orientation: first ? orientationOfItem(first) : null,
  });
}

export function showFullPlayer(): void {
  nowPlayingStore.setState(state =>
    state.request && state.presentation !== 'full'
      ? { ...state, presentation: 'full' }
      : state,
  );
}

export function stopPlayback(): void {
  nowPlayingStore.setState(IDLE);
}

export function setPlayerOrientation(orientation: PlayerOrientation): void {
  nowPlayingStore.setState(state =>
    state.orientation === orientation ? state : { ...state, orientation },
  );
}

/** The playing item and its transport, published by the player for the mini player. */
export interface ActivePlayback {
  item: VideoItem;
  paused: boolean;
  hasNext: boolean;
  duration: number;
  clock: PlaybackClock;
  togglePlayback: () => void;
  next: () => void;
}

export const activePlaybackStore = createStore<ActivePlayback | null>(null);

/**
 * Called when the full player is dismissed: playback carries on in the mini player when
 * background play is on (audio always does), otherwise it stops.
 */
export function leaveFullPlayer(): void {
  const { request, presentation } = nowPlayingStore.getState();
  if (!request || presentation !== 'full') {
    return;
  }
  const active = activePlaybackStore.getState();
  const keepPlaying =
    active !== null &&
    playsInBackground(active.item, settingsStore.getState().backgroundPlay);
  if (keepPlaying) {
    nowPlayingStore.setState(state => ({ ...state, presentation: 'mini' }));
  } else {
    stopPlayback();
  }
}
