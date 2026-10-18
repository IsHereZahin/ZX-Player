import React from 'react';
import {
  AppState,
  Platform,
  StyleSheet,
  type AppStateStatus,
} from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';
import { keepLocalCopy, pick } from '@react-native-documents/picker';
import { resetBrightness, setBrightness } from 'zxplayer-brightness';
import { clearNowPlaying, setNowPlaying } from 'zxplayer-media';
import { setVolume } from 'react-native-volume-manager';

import { reportError } from '../../../../shared/logger';
import {
  makeSong,
  makeVideo,
  SAMPLE_SRT,
  sampleSong,
  sampleVideo,
} from '../../../../test/fixtures';
import { historyStore, recordProgress } from '../../../history/watchHistory';
import { favoritesStore } from '../../../library/favorites';
import type { VideoItem } from '../../../library/types';
import { settingsStore, updateSettings } from '../../../settings/settingsStore';
import { PlayerScreen } from '../PlayerScreen';

const { mockVideoRef } = jest.requireMock<{
  mockVideoRef: Record<
    'seek' | 'pause' | 'resume' | 'setSource' | 'enterPictureInPicture',
    jest.Mock
  >;
}>('react-native-video');

const SCREEN = { width: 800, height: 400 };

interface PlayerParams {
  queue: VideoItem[];
  startIndex: number;
  startFromBeginning?: boolean;
  minimized?: boolean;
}

const onClose = jest.fn();
const onOrientationChange = jest.fn();

const { __sendPlaybackEnded: sendPlaybackEnded } = jest.requireMock<{
  __sendPlaybackEnded: (uri: string) => void;
}>('zxplayer-media');

const video = () => screen.getByTestId('video-surface');
const videoStyle = () => StyleSheet.flatten(video().props.style);

/** Ends the playing item the way the platform reports it (see VideoSurface). */
async function endItem() {
  if (Platform.OS === 'android') {
    const { uri } = video().props.source as { uri: string };
    await act(async () => sendPlaybackEnded(uri));
  } else {
    await fireEvent(video(), 'end');
  }
}

async function loadVideo(overrides: Record<string, unknown> = {}) {
  await fireEvent(video(), 'load', {
    currentTime: 0,
    duration: 600,
    naturalSize: { width: 1920, height: 1080, orientation: 'landscape' },
    audioTracks: [],
    textTracks: [],
    videoTracks: [],
    ...overrides,
  });
}

async function renderPlayer(
  params: Partial<PlayerParams> = {},
  loadOverrides: Record<string, unknown> = {},
) {
  const result = await render(
    <PlayerScreen
      queue={[sampleVideo]}
      startIndex={0}
      {...params}
      onClose={onClose}
      onOrientationChange={onOrientationChange}
    />,
    { wrapper: GestureHandlerRootView },
  );
  await fireEvent(screen.getByTestId('player-screen'), 'layout', {
    nativeEvent: { layout: SCREEN },
  });
  await loadVideo(loadOverrides);
  return result;
}

async function progressTo(currentTime: number) {
  await fireEvent(video(), 'progress', {
    currentTime,
    playableDuration: currentTime + 30,
    seekableDuration: 600,
  });
}

type GestureStep = [
  'begin' | 'activate' | 'update' | 'end',
  Record<string, number>,
];

/** Drives a gesture; the returned continuation finishes the same gesture later. */
async function runGesture(testID: string, steps: GestureStep[]) {
  const controller = createGestureController(testID);
  const apply = async (batch: GestureStep[]) => {
    await act(async () => {
      for (const [step, event] of batch) {
        controller[step](event);
      }
    });
  };
  await apply(steps);
  return { continueWith: apply };
}

const tap = (x: number, y = 200): GestureStep[] => [
  ['begin', { x, y }],
  ['activate', { x, y }],
  ['end', { x, y }],
];

const queueOf = (count: number): VideoItem[] =>
  Array.from({ length: count }, (_, i) => makeVideo(String(i + 1)));

/** Captures the app's AppState listeners; call the result to change the app state. */
function captureAppState() {
  const listeners: Array<(state: AppStateStatus) => void> = [];
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, listener) => {
      listeners.push(listener as (state: AppStateStatus) => void);
      return { remove: jest.fn() } as never;
    });
  return (state: AppStateStatus) =>
    act(async () => listeners.forEach(listener => listener(state)));
}

/** Sheets opened from "More" wait for iOS modal dismissal, which Jest never reports. */
function useAndroid() {
  jest.replaceProperty(Platform, 'OS', 'android');
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('controls', () => {
  it('plays immediately and toggles play/pause', async () => {
    await renderPlayer();
    expect(video().props.paused).toBe(false);

    await fireEvent.press(screen.getByTestId('play-pause-button'));
    expect(video().props.paused).toBe(true);
    expect(screen.getByLabelText('Play')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('play-pause-button'));
    expect(video().props.paused).toBe(false);
  });

  it('starts local files on a short buffer', async () => {
    await renderPlayer();
    expect(video().props.source.bufferConfig).toEqual(
      expect.objectContaining({
        bufferForPlaybackMs: 500,
        bufferForPlaybackAfterRebufferMs: 1000,
      }),
    );
  });

  it('shows elapsed and remaining time from progress events', async () => {
    await renderPlayer();
    await progressTo(75);
    expect(screen.getByText('1:15')).toBeOnTheScreen();
    expect(screen.getByText('−8:45')).toBeOnTheScreen();
  });

  it('skips by the interval chosen in settings', async () => {
    updateSettings({ skipSeconds: 15 });
    await renderPlayer();
    await progressTo(100);

    await fireEvent.press(screen.getByLabelText('Forward 15 seconds'));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(115);
    await fireEvent.press(screen.getByLabelText('Back 15 seconds'));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(100);
  });

  it('cycles aspect modes using native resize modes', async () => {
    await renderPlayer();
    expect(video().props.resizeMode).toBe('contain');

    await fireEvent.press(screen.getByTestId('aspect-button'));
    expect(video().props.resizeMode).toBe('cover');
    expect(screen.getByTestId('player-toast')).toHaveTextContent(
      'Fill · Fills the screen, trims the edges',
    );

    await fireEvent.press(screen.getByTestId('aspect-button'));
    expect(video().props.resizeMode).toBe('stretch');
    expect(videoStyle()).toEqual({ width: 960, height: 540 }); // 100 % at 2× density

    await fireEvent.press(screen.getByTestId('aspect-button'));
    expect(videoStyle()).not.toEqual({ width: 960, height: 540 });
    expect(video().props.resizeMode).toBe('stretch');
  });

  it('starts in the default aspect ratio from settings', async () => {
    updateSettings({ defaultAspectMode: 'fill' });
    await renderPlayer();
    expect(video().props.resizeMode).toBe('cover');
  });

  it('matches orientation to the video and rotates on demand', async () => {
    await renderPlayer();
    expect(onOrientationChange).toHaveBeenLastCalledWith('landscape');

    await fireEvent.press(screen.getByTestId('rotate-button'));
    expect(onOrientationChange).toHaveBeenLastCalledWith('portrait');
  });

  it('opens a portrait video in portrait, before it has loaded', async () => {
    await render(
      <PlayerScreen
        queue={[makeVideo('9', { width: 1080, height: 1920 })]}
        startIndex={0}
        onClose={onClose}
        onOrientationChange={onOrientationChange}
      />,
      { wrapper: GestureHandlerRootView },
    );
    expect(onOrientationChange).toHaveBeenLastCalledWith('portrait');
  });

  it('turns the screen for each video in the queue', async () => {
    await renderPlayer({
      queue: [makeVideo('1'), makeVideo('2', { width: 1080, height: 1920 })],
    });
    expect(onOrientationChange).toHaveBeenLastCalledWith('landscape');

    await fireEvent.press(screen.getByTestId('next-button'));
    expect(onOrientationChange).toHaveBeenLastCalledWith('portrait');
  });

  it('keeps a manual rotation for the rest of the queue', async () => {
    await renderPlayer({ queue: queueOf(2) });
    await fireEvent.press(screen.getByTestId('rotate-button'));
    await fireEvent.press(screen.getByTestId('next-button'));
    expect(onOrientationChange).toHaveBeenLastCalledWith('portrait');
  });

  it('waits for the player on Android 9, whose library sizes ignore rotation', async () => {
    useAndroid();
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(28);
    await renderPlayer(
      { queue: [makeVideo('9')] },
      { naturalSize: { width: 1080, height: 1920, orientation: 'portrait' } },
    );
    expect(onOrientationChange).toHaveBeenCalledWith(null);
    expect(onOrientationChange).toHaveBeenLastCalledWith('portrait');
  });

  it('shows the thumbnail until the first frame is drawn', async () => {
    await renderPlayer();
    expect(screen.getByTestId('video-poster')).toBeOnTheScreen();

    await fireEvent(video(), 'readyForDisplay');
    expect(screen.queryByTestId('video-poster')).toBeNull();
  });

  it('changes playback speed', async () => {
    await renderPlayer();
    await fireEvent.press(screen.getByTestId('speed-button'));
    await fireEvent.press(screen.getByTestId('speed-option-1.5'));

    expect(video().props.rate).toBe(1.5);
    expect(screen.getByLabelText('Playback speed 1.5×')).toBeOnTheScreen();
  });

  it('offers round quick actions under the top bar', async () => {
    updateSettings({ backgroundPlay: false });
    await renderPlayer();
    const quick = screen.getByTestId('quick-actions');
    expect(within(quick).getByLabelText('Playback speed 1×')).toBeOnTheScreen();
    expect(within(quick).getByTestId('rotate-button')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('repeat-button'));
    expect(screen.getByLabelText('Repeat all')).toBeSelected();
    expect(screen.getByTestId('player-toast')).toHaveTextContent('Repeat all');

    await fireEvent.press(screen.getByTestId('background-play-button'));
    expect(settingsStore.getState().backgroundPlay).toBe(true);
    expect(screen.getByTestId('background-play-button')).toBeSelected();
    expect(screen.getByTestId('player-toast')).toHaveTextContent(
      'Background play on',
    );

    await fireEvent.press(screen.getByTestId('sleep-button'));
    expect(screen.getByTestId('sleep-sheet')).toBeOnTheScreen();
  });

  it('shows a handle at the playback position', async () => {
    await renderPlayer();
    await loadVideo();
    await fireEvent(screen.getByTestId('seek-bar'), 'layout', {
      nativeEvent: { layout: { width: 400, height: 40 } },
    });
    await act(async () =>
      fireEvent(video(), 'progress', {
        currentTime: 60,
        playableDuration: 90,
      }),
    );
    // 60 s of 600 s on a 400 pt track; the 16 pt handle is centred on that point.
    expect(
      StyleSheet.flatten(screen.getByTestId('seek-thumb').props.style).left,
    ).toBeCloseTo((60 / 600) * 400 - 8);
  });

  it('locks the controls until the unlock button is pressed', async () => {
    await renderPlayer();
    await fireEvent.press(screen.getByTestId('lock-button'));
    expect(screen.queryByTestId('player-controls')).toBeNull();
    expect(screen.getByTestId('unlock-button')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('unlock-button'));
    expect(screen.getByTestId('player-controls')).toBeOnTheScreen();
  });

  it('replays from the start after a single video ends', async () => {
    await renderPlayer();
    await endItem();
    expect(video().props.paused).toBe(true);

    await fireEvent.press(screen.getByTestId('play-pause-button'));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(0);
    expect(video().props.paused).toBe(false);
  });

  it('shows a playback error and retries where it failed', async () => {
    await renderPlayer();
    await progressTo(42);
    await fireEvent(video(), 'error', {
      error: { errorString: 'ExoPlaybackException: decoder init failed' },
    });

    expect(
      screen.getByText("This video can't be played on this device."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('ExoPlaybackException: decoder init failed'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('playback-retry'));
    expect(screen.queryByTestId('playback-error')).toBeNull();
    // A fresh native player starts where the failed one stopped.
    expect(video().props.source.startPosition).toBe(42000);
  });

  it('hides everything but the video in picture-in-picture', async () => {
    await renderPlayer();
    await fireEvent.press(screen.getByTestId('pip-button'));
    expect(mockVideoRef.enterPictureInPicture).toHaveBeenCalled();

    await fireEvent(video(), 'pictureInPictureStatusChanged', {
      isActive: true,
    });
    expect(screen.queryByTestId('player-controls')).toBeNull();
    expect(video()).toBeOnTheScreen();
  });

  it('keeps playing when picture-in-picture sends the app to the background', async () => {
    const setAppState = captureAppState();
    await renderPlayer();

    await fireEvent.press(screen.getByTestId('pip-button'));
    await setAppState('background');
    expect(video().props.paused).toBe(false);
  });

  it('brings the controls back after picture-in-picture, even unannounced', async () => {
    const setAppState = captureAppState();
    await renderPlayer();
    await fireEvent.press(screen.getByTestId('pip-button'));
    await fireEvent(video(), 'pictureInPictureStatusChanged', {
      isActive: true,
    });

    await setAppState('active');

    expect(screen.getByTestId('player-controls')).toBeOnTheScreen();
  });

  it('still pauses when the app is backgrounded without background play', async () => {
    const setAppState = captureAppState();
    await renderPlayer();
    await setAppState('background');
    expect(video().props.paused).toBe(true);
  });

  it('follows pauses and resumes made outside the app, such as in PiP', async () => {
    await renderPlayer();

    await fireEvent(video(), 'playbackStateChanged', {
      isPlaying: false,
      isSeeking: false,
    });
    expect(screen.getByLabelText('Play')).toBeOnTheScreen();
    expect(video().props.paused).toBe(true);

    await fireEvent(video(), 'playbackStateChanged', {
      isPlaying: true,
      isSeeking: false,
    });
    expect(screen.getByLabelText('Pause')).toBeOnTheScreen();
  });

  it('does not mistake buffering or seeking for a pause', async () => {
    await renderPlayer();

    await fireEvent(video(), 'playbackStateChanged', {
      isPlaying: false,
      isSeeking: true,
    });
    await fireEvent(video(), 'buffer', { isBuffering: true });
    await fireEvent(video(), 'playbackStateChanged', {
      isPlaying: false,
      isSeeking: false,
    });

    expect(video().props.paused).toBe(false);
  });

  it('restores system brightness when the player closes', async () => {
    const { unmount } = await renderPlayer();
    await unmount();
    expect(resetBrightness).toHaveBeenCalled();
  });
});

describe('queue', () => {
  it('keeps only the playing video, without controls, while minimised', async () => {
    const result = await renderPlayer();
    const nativePlayer = video();

    await result.rerender(
      <PlayerScreen
        queue={[sampleVideo]}
        startIndex={0}
        minimized
        onClose={onClose}
        onOrientationChange={onOrientationChange}
      />,
    );

    expect(video()).toBe(nativePlayer);
    expect(video().props.paused).toBe(false);
    expect(screen.queryByTestId('player-controls')).toBeNull();
  });

  it('keeps one native player for the whole queue, switching its source', async () => {
    await renderPlayer({ queue: queueOf(2) });
    const firstPlayer = video();

    await fireEvent.press(screen.getByTestId('next-button'));

    expect(video()).toBe(firstPlayer);
    expect(video().props.source.uri).toBe(
      'content://media/external/video/media/2',
    );
    expect(video().props.source.startPosition).toBe(0);
  });

  it('moves through the list with next and previous', async () => {
    await renderPlayer({ queue: queueOf(3), startIndex: 1 });
    expect(screen.getByText('Video 2')).toBeOnTheScreen();
    expect(screen.getByText('2 of 3')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('next-button'));
    await loadVideo();
    expect(screen.getByText('Video 3')).toBeOnTheScreen();
    expect(screen.getByTestId('next-button')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('previous-button'));
    await loadVideo();
    expect(screen.getByText('Video 2')).toBeOnTheScreen();
  });

  it('restarts the current video when "previous" is pressed mid-way', async () => {
    await renderPlayer({ queue: queueOf(2), startIndex: 1 });
    await progressTo(30);
    await fireEvent.press(screen.getByTestId('previous-button'));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(0);
    expect(screen.getByText('Video 2')).toBeOnTheScreen();
  });

  it('plays the next video automatically, unless turned off', async () => {
    await renderPlayer({ queue: queueOf(2) });
    await endItem();
    await loadVideo();
    expect(screen.getByText('Video 2')).toBeOnTheScreen();
    expect(video().props.paused).toBe(false);

    await act(async () => updateSettings({ autoPlayNext: false }));
    await endItem();
    expect(screen.getByText('Video 2')).toBeOnTheScreen();
    expect(video().props.paused).toBe(true);
  });

  it('repeats the whole list, then a single video', async () => {
    useAndroid();
    updateSettings({ autoPlayNext: false });
    await renderPlayer({ queue: queueOf(2), startIndex: 1 });

    await fireEvent.press(screen.getByTestId('more-button'));
    await fireEvent.press(screen.getByTestId('more-repeat'));
    expect(
      within(screen.getByTestId('more-repeat')).getByText('All'),
    ).toBeOnTheScreen();

    await endItem();
    await loadVideo();
    expect(screen.getByText('Video 1')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('more-button'));
    await fireEvent.press(screen.getByTestId('more-repeat'));
    expect(video().props.repeat).toBe(true);
  });

  it('adds the playing item to favorites from More', async () => {
    useAndroid();
    await renderPlayer();

    await fireEvent.press(screen.getByTestId('more-button'));
    await fireEvent.press(screen.getByTestId('more-favorite'));

    expect(favoritesStore.getState()[sampleVideo.id]).toBeDefined();
    expect(screen.getByTestId('player-toast')).toHaveTextContent(
      'Added to Favorites',
    );
  });

  it('stops at the end of the video when the sleep timer says so', async () => {
    useAndroid();
    await renderPlayer({ queue: queueOf(2) });
    await fireEvent.press(screen.getByTestId('more-button'));
    await fireEvent.press(screen.getByTestId('more-sleep'));
    await fireEvent.press(screen.getByTestId('sleep-end-of-video'));

    await endItem();
    expect(screen.getByText('Video 1')).toBeOnTheScreen();
    expect(video().props.paused).toBe(true);
  });

  it('pauses when a timed sleep timer runs out', async () => {
    useAndroid();
    jest.useFakeTimers();
    try {
      await renderPlayer();
      await fireEvent.press(screen.getByTestId('more-button'));
      await fireEvent.press(screen.getByTestId('more-sleep'));
      await fireEvent.press(screen.getByTestId('sleep-15'));
      expect(video().props.paused).toBe(false);

      await act(async () => {
        jest.advanceTimersByTime(15 * 60 * 1000);
      });
      expect(video().props.paused).toBe(true);
      expect(screen.getByTestId('player-toast')).toHaveTextContent(
        'Sleep timer ended · Playback paused',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers 15, 30 and 45 minutes, then a custom length', async () => {
    useAndroid();
    jest.useFakeTimers();
    try {
      await renderPlayer();
      await fireEvent.press(screen.getByTestId('sleep-button'));
      expect(screen.getByText('15 minutes')).toBeOnTheScreen();
      expect(screen.getByText('30 minutes')).toBeOnTheScreen();
      expect(screen.getByText('45 minutes')).toBeOnTheScreen();
      // Nothing to turn off yet.
      expect(screen.queryByTestId('sleep-off')).toBeNull();

      await fireEvent.press(screen.getByTestId('sleep-custom'));
      await fireEvent.changeText(screen.getByTestId('sleep-custom-input'), '0');
      await fireEvent.press(screen.getByTestId('sleep-custom-start'));
      expect(screen.getByTestId('sleep-custom-input')).toBeOnTheScreen();

      await fireEvent.changeText(
        screen.getByTestId('sleep-custom-input'),
        '20',
      );
      await fireEvent.press(screen.getByTestId('sleep-custom-start'));
      expect(screen.getByTestId('player-toast')).toHaveTextContent(
        'Sleep timer · 20 min left',
      );

      await act(async () => {
        jest.advanceTimersByTime(20 * 60 * 1000);
      });
      expect(video().props.paused).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('resume and history', () => {
  it('records progress when playback starts and pauses', async () => {
    await renderPlayer();
    expect(historyStore.getState()[sampleVideo.id]).toMatchObject({
      positionSec: 0,
    });

    await progressTo(120);
    await fireEvent.press(screen.getByTestId('play-pause-button'));
    expect(historyStore.getState()[sampleVideo.id]).toMatchObject({
      positionSec: 120,
      durationSec: 600,
    });
  });

  it('resumes from the saved position and offers to start over', async () => {
    recordProgress(sampleVideo, 125, 600);
    await renderPlayer();

    // Resumes natively from the start position, without a second seek.
    expect(video().props.source.startPosition).toBe(125000);
    expect(mockVideoRef.seek).not.toHaveBeenCalled();
    expect(screen.getByTestId('player-toast')).toHaveTextContent(
      /Resumed from 2:05/,
    );

    await fireEvent.press(screen.getByTestId('player-toast-action'));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(0);
    expect(screen.queryByTestId('player-toast')).toBeNull();
  });

  it('starts from the beginning when asked to or when resume is off', async () => {
    recordProgress(sampleVideo, 125, 600);
    await renderPlayer({ startFromBeginning: true });
    expect(mockVideoRef.seek).not.toHaveBeenCalled();
  });

  it('ignores saved positions when resume is turned off', async () => {
    recordProgress(sampleVideo, 125, 600);
    updateSettings({ resumePlayback: false });
    await renderPlayer();
    expect(mockVideoRef.seek).not.toHaveBeenCalled();
  });
});

describe('gestures', () => {
  it('seeks with a horizontal drag and commits on release', async () => {
    await renderPlayer();
    await progressTo(100);

    const drag = await runGesture('player-pan', [
      ['begin', { x: 300, y: 200 }],
      ['activate', { x: 320, y: 200, translationX: 20, translationY: 2 }],
      ['update', { x: 700, y: 200, translationX: 400, translationY: 5 }],
    ]);
    expect(screen.getByTestId('gesture-feedback-seek')).toHaveTextContent(
      '+0:452:25 / 10:00',
    );
    expect(mockVideoRef.seek).not.toHaveBeenCalled();

    await drag.continueWith([['end', {}]]);
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(145);
  });

  it('adjusts brightness on the left and volume on the right', async () => {
    await renderPlayer();

    await runGesture('player-pan', [
      ['begin', { x: 100, y: 300 }],
      ['activate', { x: 100, y: 280, translationX: 0, translationY: -20 }],
      ['update', { x: 100, y: 160, translationX: 0, translationY: -140 }],
      ['end', {}],
    ]);
    expect(setBrightness).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('gesture-feedback-brightness')).toHaveTextContent(
      '100%',
    );

    await runGesture('player-pan', [
      ['begin', { x: 700, y: 100 }],
      ['activate', { x: 700, y: 120, translationX: 1, translationY: 20 }],
      ['update', { x: 700, y: 170, translationX: 1, translationY: 70 }],
      ['end', {}],
    ]);
    expect(setVolume).toHaveBeenLastCalledWith(0.25, {
      type: 'music',
      showUI: false,
    });
    expect(screen.getByTestId('gesture-feedback-volume')).toHaveTextContent(
      '25%',
    );
  });

  it('respects gestures turned off in settings', async () => {
    updateSettings({ gestureBrightness: false });
    await renderPlayer();

    await runGesture('player-pan', [
      ['begin', { x: 100, y: 300 }],
      ['activate', { x: 100, y: 280, translationX: 0, translationY: -40 }],
      ['end', {}],
    ]);
    expect(setBrightness).not.toHaveBeenCalled();
    expect(screen.queryByTestId('gesture-feedback-brightness')).toBeNull();
  });

  it('adds up consecutive double taps on the same side', async () => {
    await renderPlayer();
    await progressTo(200);

    await runGesture('player-double-tap', tap(760));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(210);
    await runGesture('player-double-tap', tap(760));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(220);
    expect(screen.getByTestId('gesture-feedback-skip')).toHaveTextContent(
      '+20 sec',
    );

    await runGesture('player-double-tap', tap(400));
    expect(video().props.paused).toBe(true);
  });

  it('pinches to zoom and drags the zoomed picture', async () => {
    await renderPlayer();
    // Fit on an 800×400 screen: a 16:9 frame of 711×400.
    await runGesture('player-pinch', [
      ['begin', { scale: 1 }],
      ['activate', { scale: 1 }],
      ['update', { scale: 2 }],
      ['end', { scale: 2 }],
    ]);
    expect(videoStyle().width).toBeCloseTo(1422.2, 0);
    expect(videoStyle().height).toBeCloseTo(800, 0);
    expect(
      screen.getByLabelText('Zoomed to 2.0×. Reset zoom'),
    ).toBeOnTheScreen();

    // While zoomed, a drag moves the picture (up to its edge) instead of seeking.
    await runGesture('player-pan', [
      ['begin', { x: 400, y: 200, translationX: 0, translationY: 0 }],
      ['activate', { x: 1000, y: 200, translationX: 600, translationY: 0 }],
      ['end', { x: 1000, y: 200, translationX: 600, translationY: 0 }],
    ]);
    expect(videoStyle().left).toBeCloseTo(311.1, 0);
    expect(mockVideoRef.seek).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('reset-zoom'));
    expect(videoStyle()).toEqual(StyleSheet.flatten(StyleSheet.absoluteFill));
  });

  it('snaps back when a pinch barely zooms, and caps zoom at 4×', async () => {
    await renderPlayer();
    await runGesture('player-pinch', [
      ['begin', { scale: 1 }],
      ['activate', { scale: 1 }],
      ['update', { scale: 1.03 }],
      ['end', { scale: 1.03 }],
    ]);
    expect(screen.queryByTestId('reset-zoom')).toBeNull();

    await runGesture('player-pinch', [
      ['begin', { scale: 1 }],
      ['activate', { scale: 1 }],
      ['update', { scale: 9 }],
      ['end', { scale: 9 }],
    ]);
    expect(
      screen.getByLabelText('Zoomed to 4.0×. Reset zoom'),
    ).toBeOnTheScreen();
  });

  it('plays at 2× while the screen is held', async () => {
    await renderPlayer();
    const hold = await runGesture('player-hold', [
      ['begin', { x: 400, y: 200 }],
      ['activate', { x: 400, y: 200 }],
    ]);
    expect(video().props.rate).toBe(2);
    expect(screen.getByTestId('gesture-feedback-boost')).toHaveTextContent(
      '2× speed',
    );

    await hold.continueWith([['end', {}]]);
    expect(video().props.rate).toBe(1);
    expect(screen.queryByTestId('gesture-feedback-boost')).toBeNull();
  });

  it('toggles the controls on single tap', async () => {
    await renderPlayer();
    await runGesture('player-single-tap', tap(400));
    expect(screen.queryByTestId('player-controls')).toBeNull();
    await runGesture('player-single-tap', tap(400));
    expect(screen.getByTestId('player-controls')).toBeOnTheScreen();
  });

  it('scrubs with the seek bar and seeks on tap', async () => {
    await renderPlayer();
    await fireEvent(screen.getByTestId('seek-bar'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 600, height: 36 } },
    });

    const scrub = await runGesture('seek-bar-pan', [
      ['begin', { x: 60 }],
      ['activate', { x: 60 }],
      ['update', { x: 450 }],
    ]);
    expect(screen.getByLabelText('Playback position')).toHaveAccessibilityValue(
      { now: 450 },
    );
    expect(mockVideoRef.seek).not.toHaveBeenCalled();

    await scrub.continueWith([['end', {}]]);
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(450);

    await runGesture('seek-bar-tap', tap(150));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(150);
  });
});

describe('tracks and subtitles', () => {
  const audioTracks = [
    {
      index: 1,
      language: 'hin',
      title: 'Hindi',
      type: 'audio/ac3',
      selected: true,
    },
    { index: 2, language: 'eng', title: 'English', type: 'audio/mp4a-latm' },
  ];

  it('switches between audio tracks', async () => {
    await renderPlayer({}, { audioTracks });
    expect(video().props.selectedAudioTrack).toEqual({
      type: 'index',
      value: 1,
    });

    await fireEvent.press(screen.getByTestId('audio-button'));
    expect(screen.getByText('HIN · Dolby Digital')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('audio-track-2'));
    expect(video().props.selectedAudioTrack).toEqual({
      type: 'index',
      value: 2,
    });
  });

  it('turns embedded subtitles on and shows their text', async () => {
    await renderPlayer({}, { textTracks: [{ index: 0, language: 'eng' }] });
    expect(video().props.selectedTextTrack).toEqual({ type: 'disabled' });

    await fireEvent.press(screen.getByTestId('subtitles-button'));
    await fireEvent.press(screen.getByTestId('subtitle-track-0'));
    expect(video().props.selectedTextTrack).toEqual({
      type: 'index',
      value: 0,
    });

    // iOS reports embedded cues as text for the app to draw.
    await fireEvent(video(), 'textTrackDataChanged', {
      subtitleTracks: 'Hello from MKV',
    });
    expect(screen.getByTestId('subtitle-text')).toHaveTextContent(
      'Hello from MKV',
    );
  });

  it('loads an SRT file, shows cues and shifts their timing', async () => {
    useAndroid();
    (pick as jest.Mock).mockResolvedValueOnce([
      {
        uri: 'content://docs/1',
        name: 'movie.srt',
        size: SAMPLE_SRT.length,
        error: null,
      },
    ]);
    (keepLocalCopy as jest.Mock).mockResolvedValueOnce([
      {
        status: 'success',
        sourceUri: 'content://docs/1',
        localUri: 'file:///cache/movie.srt',
      },
    ]);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      text: async () => SAMPLE_SRT,
    } as unknown as Response);
    await renderPlayer();

    await fireEvent.press(screen.getByTestId('subtitles-button'));
    await fireEvent.press(screen.getByTestId('subtitle-load-file'));
    expect(await screen.findByText('Subtitles: movie.srt')).toBeOnTheScreen();
    expect(video().props.paused).toBe(true);

    await progressTo(2);
    expect(screen.getByTestId('subtitle-text')).toHaveTextContent(
      'Hello there!',
    );

    await progressTo(0.9);
    expect(screen.queryByTestId('subtitle-text')).toBeNull();
    await fireEvent.press(screen.getByTestId('subtitles-button'));
    await fireEvent.press(screen.getByTestId('subtitle-delay-minus'));
    expect(screen.getByTestId('subtitle-delay-value')).toHaveTextContent(
      '−0.25 s',
    );
    await progressTo(0.9);
    expect(screen.getByTestId('subtitle-text')).toHaveTextContent(
      'Hello there!',
    );
  });

  it('reports an invalid subtitle file without crashing', async () => {
    useAndroid();
    (pick as jest.Mock).mockResolvedValueOnce([
      { uri: 'content://docs/2', name: 'notes.txt', size: 20, error: null },
    ]);
    (keepLocalCopy as jest.Mock).mockResolvedValueOnce([
      {
        status: 'success',
        sourceUri: 'content://docs/2',
        localUri: 'file:///cache/notes.txt',
      },
    ]);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      text: async () => 'shopping list',
    } as unknown as Response);
    await renderPlayer();

    await fireEvent.press(screen.getByTestId('subtitles-button'));
    await fireEvent.press(screen.getByTestId('subtitle-load-file'));

    expect(
      await screen.findByText('Choose an .srt, .ass or .ssa subtitle file.'),
    ).toBeOnTheScreen();
    expect(reportError).toHaveBeenCalledWith(
      'Loading subtitles failed',
      expect.any(Error),
    );
  });
});

describe('audio', () => {
  const loadAudio = {
    naturalSize: { width: 0, height: 0, orientation: 'landscape' },
  };

  it('shows the track instead of a picture and keeps the controls up', async () => {
    await renderPlayer({ queue: [sampleSong] }, loadAudio);

    const artwork = screen.getByTestId('audio-artwork');
    expect(within(artwork).getByText('Night Drive')).toBeOnTheScreen();
    expect(
      within(artwork).getByText('The Blue Hours · Neon'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Now playing')).toBeOnTheScreen();

    // Picture-only controls are gone.
    expect(screen.queryByTestId('subtitles-button')).toBeNull();
    expect(screen.queryByTestId('aspect-button')).toBeNull();
    expect(screen.queryByTestId('pip-button')).toBeNull();

    // A tap does not hide the controls of an audio track.
    await runGesture('player-single-tap', tap(400));
    expect(screen.getByTestId('player-controls')).toBeOnTheScreen();
  });

  it('lays a track out like a music player', async () => {
    await renderPlayer({ queue: [makeSong('1'), makeSong('2')] }, loadAudio);

    expect(screen.getByText('1 of 2')).toBeOnTheScreen();
    expect(screen.getByTestId('audio-backdrop')).toBeOnTheScreen();
    // Speed, repeat, sleep and more; nothing that needs a picture.
    expect(screen.getByTestId('quick-actions')).toBeOnTheScreen();
    expect(screen.queryByTestId('rotate-button')).toBeNull();
    expect(screen.queryByTestId('lock-button')).toBeNull();

    await fireEvent.press(screen.getByTestId('play-pause-button'));
    expect(video().props.paused).toBe(true);
    expect(screen.getByLabelText('Play')).toBeOnTheScreen();
  });

  it('always keeps playing in the background, with notification controls', async () => {
    await renderPlayer({ queue: [sampleSong] }, loadAudio);
    expect(video().props.playInBackground).toBe(true);
    expect(video().props.showNotificationControls).toBe(true);
    expect(video().props.source.metadata).toMatchObject({
      title: 'Night Drive',
      artist: 'The Blue Hours',
    });
  });

  it('moves from track to track like videos', async () => {
    await renderPlayer({ queue: [makeSong('1'), makeSong('2')] }, loadAudio);
    await fireEvent.press(screen.getByLabelText('Next track'));
    expect(
      within(screen.getByTestId('audio-artwork')).getByText('Song 2'),
    ).toBeOnTheScreen();
  });

  it('plays mixed queues, switching between audio and video', async () => {
    await renderPlayer({ queue: [sampleSong, makeVideo('9')] }, loadAudio);
    await fireEvent.press(screen.getByTestId('next-button'));
    expect(screen.queryByTestId('audio-artwork')).toBeNull();
    expect(screen.getByTestId('subtitles-button')).toBeOnTheScreen();
  });
});

describe('notification and lock-screen controls', () => {
  const { __sendRemoteCommand: press } = jest.requireMock<{
    __sendRemoteCommand: (command: string, positionMs?: number) => void;
  }>('zxplayer-media');

  beforeEach(() => {
    useAndroid();
    updateSettings({ backgroundPlay: true });
  });

  it('shows the playing item with previous and next where the queue has them', async () => {
    await renderPlayer({ queue: queueOf(3), startIndex: 1 });

    expect(setNowPlaying).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: '2',
        title: 'Video 2',
        playing: true,
        hasPrevious: true,
        hasNext: true,
        durationMs: 600000,
      }),
    );
    expect(video().props.showNotificationControls).toBe(false);
  });

  it('moves through the queue from the notification', async () => {
    await renderPlayer({ queue: queueOf(3) });

    await act(async () => press('next'));
    expect(screen.getByText('Video 2')).toBeOnTheScreen();

    await act(async () => press('previous'));
    expect(screen.getByText('Video 1')).toBeOnTheScreen();
  });

  it('plays, pauses and seeks from the notification', async () => {
    await renderPlayer();

    await act(async () => press('pause'));
    expect(video().props.paused).toBe(true);
    expect(setNowPlaying).toHaveBeenLastCalledWith(
      expect.objectContaining({ playing: false }),
    );

    await act(async () => press('play'));
    expect(video().props.paused).toBe(false);

    await act(async () => press('seek', 30000));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(30);
  });

  describe('with the app in the background', () => {
    // Android's renderer holds view updates until the app returns, so the player has to
    // be driven by its commands.
    // The Jest preset mocks `currentState` as a function, so it is set directly.
    let foregroundState: unknown;
    beforeEach(() => {
      foregroundState = AppState.currentState;
      Object.assign(AppState, { currentState: 'background' });
    });
    afterEach(() => {
      Object.assign(AppState, { currentState: foregroundState });
    });

    it('moves to the next item from the notification', async () => {
      await renderPlayer({ queue: queueOf(2) });
      await loadVideo();

      await act(async () => press('next'));

      expect(mockVideoRef.setSource).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'content://media/external/video/media/2',
        }),
      );
      expect(setNowPlaying).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: '2', playing: true }),
      );
    });

    it('starts the next item as soon as one ends', async () => {
      await renderPlayer({ queue: queueOf(2) });
      await loadVideo();
      await endItem();

      expect(mockVideoRef.setSource).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'content://media/external/video/media/2',
        }),
      );
      expect(mockVideoRef.pause).not.toHaveBeenCalled();
      // No pause is reported in between, so the media session keeps its service.
      expect(setNowPlaying).not.toHaveBeenCalledWith(
        expect.objectContaining({ playing: false }),
      );
      expect(setNowPlaying).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: '2', playing: true }),
      );
    });

    it('pauses and resumes from the notification', async () => {
      await renderPlayer();

      await act(async () => press('pause'));
      expect(mockVideoRef.pause).toHaveBeenCalledTimes(1);

      await act(async () => press('play'));
      expect(mockVideoRef.resume).toHaveBeenCalledTimes(1);
    });
  });

  it('leaves the source to the view props in the foreground', async () => {
    await renderPlayer({ queue: queueOf(2) });
    await loadVideo();
    await endItem();

    expect(screen.getByText('Video 2')).toBeOnTheScreen();
    expect(mockVideoRef.setSource).not.toHaveBeenCalled();
  });

  it('takes the end of an item from the media module, not the view', async () => {
    await renderPlayer({ queue: queueOf(2) });
    await loadVideo();
    // React Native holds the view's events back in the background; a late onEnd would skip
    // an item, so the view's own one is not used.
    expect(video().props.onEnd).toBeUndefined();

    // An end reported for an item that is no longer playing changes nothing.
    await act(async () =>
      sendPlaybackEnded('content://media/external/video/media/9'),
    );
    expect(screen.getByText('Video 1')).toBeOnTheScreen();

    await endItem();
    expect(screen.getByText('Video 2')).toBeOnTheScreen();
  });

  it('stays out of the notification without background play', async () => {
    updateSettings({ backgroundPlay: false });
    await renderPlayer();
    expect(setNowPlaying).not.toHaveBeenCalled();
  });

  it('removes the notification when the player closes', async () => {
    const result = await renderPlayer();
    await result.unmount();
    expect(clearNowPlaying).toHaveBeenCalled();
  });

  it('leaves Now Playing to the video player on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await renderPlayer();
    expect(setNowPlaying).not.toHaveBeenCalled();
    expect(video().props.showNotificationControls).toBe(true);
  });
});
