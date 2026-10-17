import React from 'react';
import { Platform } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { getMedia } from 'zxplayer-media';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { makeVideo } from '../../../test/fixtures';
import { screenProps } from '../../../test/navigation';
import { recordProgress } from '../../history/watchHistory';
import { VideoRow } from '../components/VideoRow';
import { isNewItem, selectRecentlyAdded } from '../recentlyAdded';
import { RecentlyAddedScreen } from '../screens/RecentlyAddedScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../test/navigation').mockNavigation,
}));

const DAY = 24 * 60 * 60;
const now = 1_800_000_000;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('isNewItem', () => {
  it('marks unplayed items from the last week', () => {
    const recent = makeVideo('1', { addedAtSec: now - 2 * DAY });
    expect(isNewItem(recent, undefined, now)).toBe(true);
    expect(
      isNewItem(makeVideo('2', { addedAtSec: now - 9 * DAY }), undefined, now),
    ).toBe(false);
  });

  it('stops being new once played', () => {
    const video = makeVideo('1', { addedAtSec: now - DAY });
    const entry = { video, positionSec: 3, durationSec: 600, lastPlayedAt: 1 };
    expect(isNewItem(video, entry, now)).toBe(false);
  });
});

describe('selectRecentlyAdded', () => {
  it('keeps the last 30 days, newest first, using the change date as a fallback', () => {
    const items = [
      makeVideo('old', { addedAtSec: now - 40 * DAY }),
      makeVideo('week', { addedAtSec: now - 7 * DAY }),
      makeVideo('today', { addedAtSec: now - 60 }),
      makeVideo('legacy', { addedAtSec: undefined, modifiedAtSec: now - DAY }),
    ];
    expect(selectRecentlyAdded(items, now).map(item => item.id)).toEqual([
      'today',
      'legacy',
      'week',
    ]);
  });
});

describe('the new dot', () => {
  it('shows on unplayed new rows and goes away after playing', async () => {
    const video = makeVideo('1', { addedAtSec: Date.now() / 1000 - DAY });
    await render(
      <VideoRow video={video} onPress={jest.fn()} onMore={jest.fn()} />,
    );
    expect(screen.getByTestId('new-mark-1')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^New, Video 1/)).toBeOnTheScreen();

    await act(async () => recordProgress(video, 30, 600));
    expect(screen.queryByTestId('new-mark-1')).toBeNull();
  });
});

describe('RecentlyAddedScreen', () => {
  it('lists what arrived this month, newest first', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const today = Date.now() / 1000;
    (getMedia as jest.Mock).mockResolvedValueOnce({
      items: [
        {
          ...makeVideo('a', { fileName: 'Older.mp4' }),
          addedAtSec: today - 5 * DAY,
          title: null,
          artist: null,
          album: null,
        },
        {
          ...makeVideo('b', { fileName: 'Newest.mp4' }),
          addedAtSec: today - 60,
          title: null,
          artist: null,
          album: null,
        },
        {
          ...makeVideo('c', { fileName: 'Ancient.mp4' }),
          addedAtSec: today - 90 * DAY,
          title: null,
          artist: null,
          album: null,
        },
      ],
      hasMore: false,
    });

    await render(
      <RecentlyAddedScreen
        {...screenProps<LibraryStackScreenProps<'RecentlyAdded'>>(
          'RecentlyAdded',
          { scope: 'video' },
        )}
      />,
    );

    expect(await screen.findByText('2 videos')).toBeOnTheScreen();
    const titles = screen
      .getAllByText(/^(Older|Newest|Ancient)$/)
      .map(node => node.props.children);
    expect(titles).toEqual(['Newest', 'Older']);
  });
});
