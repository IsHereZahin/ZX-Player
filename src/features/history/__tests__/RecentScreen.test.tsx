import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MainTabScreenProps } from '../../../app/navigation/types';
import { makeVideo } from '../../../test/fixtures';
import { mockNavigation, screenProps } from '../../../test/navigation';
import { RecentScreen } from '../RecentScreen';
import { historyStore, recordProgress } from '../watchHistory';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../test/navigation').mockNavigation,
}));

async function renderScreen() {
  await render(
    <RecentScreen {...screenProps<MainTabScreenProps<'Recent'>>('Recent')} />,
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
    const [, params] = mockNavigation.navigate.mock.calls[0];
    expect(params.queue.map((video: { id: string }) => video.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
    expect(params.startIndex).toBe(1);
  });

  it('clears history after confirmation', async () => {
    recordProgress(makeVideo('a'), 100, 600);
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        buttons?.find(button => button.style === 'destructive')?.onPress?.();
      });
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Clear watch history'));
    expect(historyStore.getState()).toEqual({});
    expect(screen.getByText('Nothing watched yet')).toBeOnTheScreen();
  });
});
