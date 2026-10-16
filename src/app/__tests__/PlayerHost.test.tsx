import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { updateSettings } from '../../features/settings/settingsStore';
import { makePhotoIdentifier, sampleAlbums } from '../../test/fixtures';
import App from '../App';

const video = () => screen.getByTestId('video-surface');

async function openFirstVideo() {
  (CameraRoll.getAlbums as jest.Mock).mockResolvedValueOnce(sampleAlbums);
  (CameraRoll.getPhotos as jest.Mock).mockResolvedValueOnce({
    edges: [makePhotoIdentifier('1'), makePhotoIdentifier('2')],
    page_info: { has_next_page: false },
  });
  await render(<App />);
  await fireEvent.press(await screen.findByText('Camera'));
  await fireEvent.press(await screen.findByText('clip-1'));
  await fireEvent(video(), 'load', {
    currentTime: 0,
    duration: 125,
    naturalSize: { width: 1920, height: 1080, orientation: 'landscape' },
    audioTracks: [],
    textTracks: [],
    videoTracks: [],
  });
}

describe('playback outside the player', () => {
  it('keeps playing behind the mini player when background play is on', async () => {
    updateSettings({ backgroundPlay: true });
    await openFirstVideo();
    expect(await screen.findByTestId('player-route')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('player-back'));

    // Back in the folder, the same native player plays on.
    expect(await screen.findByTestId('mini-player')).toBeOnTheScreen();
    expect(video().props.paused).toBe(false);
    expect(screen.queryByTestId('player-controls')).toBeNull();

    await fireEvent.press(screen.getByTestId('mini-play-pause'));
    expect(video().props.paused).toBe(true);

    await fireEvent.press(screen.getByTestId('mini-player'));
    expect(await screen.findByTestId('player-controls')).toBeOnTheScreen();
    expect(screen.queryByTestId('mini-player')).toBeNull();
  });

  it('stops from the mini player', async () => {
    updateSettings({ backgroundPlay: true });
    await openFirstVideo();
    await fireEvent.press(screen.getByTestId('player-back'));

    await fireEvent.press(await screen.findByTestId('mini-close'));

    expect(screen.queryByTestId('mini-player')).toBeNull();
    expect(screen.queryByTestId('video-surface')).toBeNull();
  });

  it('stops when leaving the player with background play off', async () => {
    await openFirstVideo();

    await fireEvent.press(screen.getByTestId('player-back'));

    expect(screen.queryByTestId('mini-player')).toBeNull();
    expect(screen.queryByTestId('video-surface')).toBeNull();
  });
});
