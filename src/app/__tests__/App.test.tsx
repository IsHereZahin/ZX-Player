import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { sampleAlbums } from '../../test/fixtures';
import App from '../App';

describe('App', () => {
  it('boots into the folder list', async () => {
    (CameraRoll.getAlbums as jest.Mock).mockResolvedValueOnce(sampleAlbums);
    await render(<App />);
    expect(await screen.findByText('Camera')).toBeOnTheScreen();
  });
});
