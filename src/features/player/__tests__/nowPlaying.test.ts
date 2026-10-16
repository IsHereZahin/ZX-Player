import { makeVideo, sampleSong } from '../../../test/fixtures';
import { updateSettings } from '../../settings/settingsStore';
import {
  activePlaybackStore,
  leaveFullPlayer,
  nowPlayingStore,
  startPlayback,
  type ActivePlayback,
} from '../nowPlaying';
import { createPlaybackClock } from '../playbackClock';

function playing(item = makeVideo('1')): ActivePlayback {
  return {
    item,
    paused: false,
    hasNext: false,
    duration: 60,
    clock: createPlaybackClock(0),
    togglePlayback: jest.fn(),
    next: jest.fn(),
  };
}

describe('leaveFullPlayer', () => {
  it('keeps a video playing in the mini player with background play on', () => {
    updateSettings({ backgroundPlay: true });
    startPlayback([makeVideo('1')], 0);
    activePlaybackStore.setState(playing());

    leaveFullPlayer();

    expect(nowPlayingStore.getState()).toMatchObject({ presentation: 'mini' });
    expect(nowPlayingStore.getState().request).not.toBeNull();
  });

  it('stops a video when background play is off', () => {
    startPlayback([makeVideo('1')], 0);
    activePlaybackStore.setState(playing());

    leaveFullPlayer();

    expect(nowPlayingStore.getState().request).toBeNull();
  });

  it('always keeps audio playing', () => {
    startPlayback([sampleSong], 0);
    activePlaybackStore.setState(playing(sampleSong));

    leaveFullPlayer();

    expect(nowPlayingStore.getState().presentation).toBe('mini');
  });

  it('starts every new queue in the full player', () => {
    updateSettings({ backgroundPlay: true });
    startPlayback([makeVideo('1')], 0);
    activePlaybackStore.setState(playing());
    leaveFullPlayer();
    const first = nowPlayingStore.getState().request?.id;

    startPlayback([makeVideo('2')], 0);

    expect(nowPlayingStore.getState().presentation).toBe('full');
    expect(nowPlayingStore.getState().request?.id).not.toBe(first);
  });
});
