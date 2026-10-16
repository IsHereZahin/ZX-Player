import React from 'react';
import { Platform } from 'react-native';
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
import { setVolume } from 'react-native-volume-manager';

import type { RootStackScreenProps } from '../../../../app/navigation/types';
import { reportError } from '../../../../shared/logger';
import { makeVideo, SAMPLE_SRT, sampleVideo } from '../../../../test/fixtures';
import { mockNavigation, screenProps } from '../../../../test/navigation';
import { historyStore, recordProgress } from '../../../history/watchHistory';
import type { VideoItem } from '../../../library/types';
import { updateSettings } from '../../../settings/settingsStore';
import { PlayerScreen } from '../PlayerScreen';

const { mockVideoRef } = jest.requireMock<{
  mockVideoRef: { seek: jest.Mock; enterPictureInPicture: jest.Mock };
}>('react-native-video');

const SCREEN = { width: 800, height: 400 };

type PlayerParams = RootStackScreenProps<'Player'>['route']['params'];

const video = () => screen.getByTestId('video-surface');

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
      {...screenProps<RootStackScreenProps<'Player'>>('Player', {
        queue: [sampleVideo],
        startIndex: 0,
        ...params,
      })}
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

  it('updates the elapsed time from progress events', async () => {
    await renderPlayer();
    await progressTo(75);
    expect(screen.getByText('1:15')).toBeOnTheScreen();
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
    expect(video().props.style).toEqual({ width: 960, height: 540 }); // 100 % at 2× density

    await fireEvent.press(screen.getByTestId('aspect-button'));
    expect(video().props.style).not.toEqual({ width: 960, height: 540 });
    expect(video().props.resizeMode).toBe('stretch');
  });

  it('starts in the default aspect ratio from settings', async () => {
    updateSettings({ defaultAspectMode: 'fill' });
    await renderPlayer();
    expect(video().props.resizeMode).toBe('cover');
  });

  it('matches orientation to the video and rotates on demand', async () => {
    await renderPlayer();
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({
      orientation: 'landscape',
    });

    await fireEvent.press(screen.getByTestId('rotate-button'));
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({
      orientation: 'portrait_up',
    });
  });

  it('changes playback speed', async () => {
    await renderPlayer();
    await fireEvent.press(screen.getByTestId('speed-button'));
    await fireEvent.press(screen.getByTestId('speed-option-1.5'));

    expect(video().props.rate).toBe(1.5);
    expect(screen.getByLabelText('Playback speed 1.5×')).toBeOnTheScreen();
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
    await fireEvent(video(), 'end');
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
    await loadVideo();
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(42);
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

  it('restores system brightness when the player closes', async () => {
    const { unmount } = await renderPlayer();
    await unmount();
    expect(resetBrightness).toHaveBeenCalled();
  });
});

describe('queue', () => {
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
    await fireEvent(video(), 'end');
    await loadVideo();
    expect(screen.getByText('Video 2')).toBeOnTheScreen();
    expect(video().props.paused).toBe(false);

    await act(async () => updateSettings({ autoPlayNext: false }));
    await fireEvent(video(), 'end');
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

    await fireEvent(video(), 'end');
    await loadVideo();
    expect(screen.getByText('Video 1')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('more-button'));
    await fireEvent.press(screen.getByTestId('more-repeat'));
    expect(video().props.repeat).toBe(true);
  });

  it('stops at the end of the video when the sleep timer says so', async () => {
    useAndroid();
    await renderPlayer({ queue: queueOf(2) });
    await fireEvent.press(screen.getByTestId('more-button'));
    await fireEvent.press(screen.getByTestId('more-sleep'));
    await fireEvent.press(screen.getByTestId('sleep-end-of-video'));

    await fireEvent(video(), 'end');
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

    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(125);
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
