import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MainTabScreenProps } from '../../../app/navigation/types';
import { DialogHost } from '../../../shared/components/Dialog';
import { makeVideo } from '../../../test/fixtures';
import {
  lastPlaybackRequest,
  mockNavigation,
  screenProps,
} from '../../../test/navigation';
import { RecentScreen } from '../RecentScreen';
import { historyStore, recordProgress } from '../watchHistory';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../test/navigation').mockNavigation,
}));

async function renderScreen() {
  await render(
    <>
      <RecentScreen {...screenProps<MainTabScreenProps<'Recent'>>('Recent')} />
      <DialogHost />
    </>,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('RecentScreen', () => {
  it('explains the empty state', async () => {
    await renderScreen();
    expect(screen.getByText('Nothing watched yet')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Clear watch history')).toBeNull();
  });

  it('separates unfinished videos from finished ones, newest first', async () => {
    recordProgress(
      makeVideo('a', { fileName: 'Old lecture.mp4' }),
      600,
      600,
      1,
    );
    recordProgress(makeVideo('b', { fileName: 'Drama.mp4' }), 120, 600, 2);
    recordProgress(makeVideo('c', { fileName: 'Talk.mp4' }), 300, 600, 3);
    await renderScreen();

    expect(screen.getByText('Continue watching')).toBeOnTheScreen();
    expect(screen.getByText('Recently played')).toBeOnTheScreen();
    expect(screen.getByText('Watched')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Drama'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Player');
    const request = lastPlaybackRequest();
    expect(request?.queue.map(video => video.id)).toEqual(['c', 'b', 'a']);
    expect(request?.startIndex).toBe(1);
  });

  it('clears history after confirmation', async () => {
    recordProgress(makeVideo('a'), 100, 600);
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Clear watch history'));
    expect(screen.getByText('Clear watch history?')).toBeOnTheScreen();
    expect(historyStore.getState()).not.toEqual({});

    await fireEvent.press(screen.getByTestId('dialog-Clear'));
    expect(historyStore.getState()).toEqual({});
    expect(screen.getByText('Nothing watched yet')).toBeOnTheScreen();
  });
});
