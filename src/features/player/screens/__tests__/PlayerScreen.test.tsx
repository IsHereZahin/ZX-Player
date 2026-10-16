import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';
import { keepLocalCopy, pick } from '@react-native-documents/picker';
import { resetBrightness, setBrightness } from 'zxplayer-brightness';
import { setVolume } from 'react-native-volume-manager';

import { reportError } from '../../../../shared/logger';
import { SAMPLE_SRT, sampleVideo } from '../../../../test/fixtures';
import { createScreenProps } from '../../../../test/navigation';
import { PlayerScreen } from '../PlayerScreen';

const { mockVideoRef } = jest.requireMock<{
  mockVideoRef: { seek: jest.Mock };
}>('react-native-video');

const SCREEN = { width: 800, height: 400 };

async function renderPlayer() {
  const { props, navigation } = createScreenProps('Player', {
    video: sampleVideo,
  });
  const result = await render(<PlayerScreen {...props} />, {
    wrapper: GestureHandlerRootView,
  });
  await fireEvent(screen.getByTestId('player-screen'), 'layout', {
    nativeEvent: { layout: SCREEN },
  });
  await fireEvent(screen.getByTestId('video-surface'), 'load', {
    currentTime: 0,
    duration: 600,
    naturalSize: { width: 1920, height: 1080, orientation: 'landscape' },
    audioTracks: [],
    textTracks: [],
    videoTracks: [],
  });
  return { ...result, navigation };
}

const video = () => screen.getByTestId('video-surface');

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

/**
 * Drives a gesture through lifecycle steps. Returns a continuation so a test can assert
 * mid-gesture and then finish the same gesture (controllers keep per-gesture state).
 */
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

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('PlayerScreen — controls', () => {
  it('plays immediately and toggles play/pause from the centre button', async () => {
    await renderPlayer();
    expect(video().props.paused).toBe(false);

    await fireEvent.press(screen.getByTestId('play-pause-button'));
    expect(video().props.paused).toBe(true);
    expect(screen.getByLabelText('Play')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('play-pause-button'));
    expect(video().props.paused).toBe(false);
  });

  it('skips with the ±10 s buttons', async () => {
    await renderPlayer();
    await progressTo(100);

    await fireEvent.press(screen.getByTestId('skip-forward-button'));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(110);

    await fireEvent.press(screen.getByTestId('skip-back-button'));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(100);
  });

  it('cycles Fit → Fill → Crop → Stretch and resizes the video view', async () => {
    await renderPlayer();
    const aspectButton = screen.getByTestId('aspect-button');
    const expectFrame = (width: number, height: number) => {
      expect(video().props.style.width).toBeCloseTo(width);
      expect(video().props.style.height).toBeCloseTo(height);
    };
    expect(screen.getByText('Fit')).toBeOnTheScreen();
    // Fit: 16:9 inside 800×400 → 711×400.
    expectFrame(711.11, 400);

    await fireEvent.press(aspectButton);
    expect(screen.getByText('Fill')).toBeOnTheScreen();
    expect(screen.getByTestId('player-toast')).toHaveTextContent(
      'Fill · fills screen, edges trimmed',
    );
    expectFrame(800, 450);

    await fireEvent.press(aspectButton);
    expect(screen.getByText('Crop')).toBeOnTheScreen();

    await fireEvent.press(aspectButton);
    expect(screen.getByText('Stretch')).toBeOnTheScreen();
    expect(video().props.style).toEqual(SCREEN);

    await fireEvent.press(aspectButton);
    expect(screen.getByText('Fit')).toBeOnTheScreen();
  });

  it('locks to landscape and back', async () => {
    const { navigation } = await renderPlayer();
    await fireEvent.press(screen.getByTestId('orientation-button'));
    expect(navigation.setOptions).toHaveBeenLastCalledWith({
      orientation: 'landscape',
    });
    await fireEvent.press(screen.getByTestId('orientation-button'));
    expect(navigation.setOptions).toHaveBeenLastCalledWith({
      orientation: 'default',
    });
  });

  it('restarts from the beginning after the video ends', async () => {
    await renderPlayer();
    await fireEvent(video(), 'end');
    expect(video().props.paused).toBe(true);

    await fireEvent.press(screen.getByTestId('play-pause-button'));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(0);
    expect(video().props.paused).toBe(false);
  });

  it('shows a playback error and retries by reloading the source', async () => {
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
    expect(video().props.paused).toBe(false);

    // The remounted source resumes where playback failed.
    await fireEvent(video(), 'load', {
      currentTime: 0,
      duration: 600,
      naturalSize: { width: 1920, height: 1080, orientation: 'landscape' },
    });
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(42);
  });

  it('restores system brightness when the player closes', async () => {
    const { unmount } = await renderPlayer();
    await unmount();
    expect(resetBrightness).toHaveBeenCalled();
  });
});

describe('PlayerScreen — gestures', () => {
  it('seeks with a horizontal drag and commits on release', async () => {
    await renderPlayer();
    await progressTo(100);

    const drag = await runGesture('player-pan', [
      ['begin', { x: 300, y: 200 }],
      ['activate', { x: 320, y: 200, translationX: 20, translationY: 2 }],
      ['update', { x: 700, y: 200, translationX: 400, translationY: 5 }],
    ]);
    // Half the width = 45 s forward; the preview is shown but not yet applied.
    expect(screen.getByTestId('gesture-feedback-seek')).toHaveTextContent(
      '+0:452:25 / 10:00',
    );
    expect(mockVideoRef.seek).not.toHaveBeenCalled();

    await drag.continueWith([['end', {}]]);
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(145);
  });

  it('adjusts brightness with a vertical drag on the left half', async () => {
    await renderPlayer();

    await runGesture('player-pan', [
      ['begin', { x: 100, y: 300 }],
      ['activate', { x: 100, y: 280, translationX: 0, translationY: -20 }],
      ['update', { x: 100, y: 160, translationX: 0, translationY: -140 }],
      ['end', {}],
    ]);

    // Baseline 0.6 + 140 / (400 × 0.7) = 1.0
    expect(setBrightness).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('gesture-feedback-brightness')).toHaveTextContent(
      'Brightness100%',
    );
    expect(setVolume).not.toHaveBeenCalled();
  });

  it('adjusts volume with a vertical drag on the right half', async () => {
    await renderPlayer();

    await runGesture('player-pan', [
      ['begin', { x: 700, y: 100 }],
      ['activate', { x: 700, y: 120, translationX: 1, translationY: 20 }],
      ['update', { x: 700, y: 170, translationX: 1, translationY: 70 }],
      ['end', {}],
    ]);

    // Baseline 0.5 − 70 / 280 = 0.25, without the system volume HUD.
    expect(setVolume).toHaveBeenLastCalledWith(0.25, {
      type: 'music',
      showUI: false,
    });
    expect(screen.getByTestId('gesture-feedback-volume')).toHaveTextContent(
      'Volume25%',
    );
    expect(setBrightness).not.toHaveBeenCalled();
  });

  it('skips on double tap at the edges and toggles playback in the centre', async () => {
    await renderPlayer();
    await progressTo(200);

    await runGesture('player-double-tap', tap(760));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(210);
    expect(screen.getByTestId('gesture-feedback-skip')).toHaveTextContent(
      '» 10s',
    );

    await runGesture('player-double-tap', tap(40));
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(200);

    await runGesture('player-double-tap', tap(400));
    expect(video().props.paused).toBe(true);
  });

  it('toggles the controls on single tap', async () => {
    await renderPlayer();
    expect(screen.getByTestId('player-controls')).toBeOnTheScreen();

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

describe('PlayerScreen — subtitles', () => {
  it('loads an SRT file and shows the cue for the current time', async () => {
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

    expect(await screen.findByText('Subtitles: movie.srt')).toBeOnTheScreen();
    // Picking a file pauses playback so nothing is missed.
    expect(video().props.paused).toBe(true);

    await progressTo(2);
    expect(screen.getByTestId('subtitle-text')).toHaveTextContent(
      'Hello there!',
    );

    await progressTo(4.5);
    expect(screen.queryByTestId('subtitle-text')).toBeNull();
  });

  it('reports an invalid subtitle file without crashing', async () => {
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

    expect(
      await screen.findByText('Choose an .srt, .ass or .ssa subtitle file.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('subtitle-text')).toBeNull();
    expect(reportError).toHaveBeenCalledWith(
      'Loading subtitles failed',
      expect.any(Error),
    );
  });
});
