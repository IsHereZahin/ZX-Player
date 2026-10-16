import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import type { RootStackScreenProps } from '../../../../app/navigation/types';
import { makePhotoIdentifier } from '../../../../test/fixtures';
import { mockNavigation, screenProps } from '../../../../test/navigation';
import { SearchScreen } from '../SearchScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => require('../../../../test/navigation').mockNavigation,
}));

const getPhotos = CameraRoll.getPhotos as jest.Mock;

async function renderScreen() {
  await render(
    <SearchScreen {...screenProps<RootStackScreenProps<'Search'>>('Search')} />,
  );
}

describe('SearchScreen', () => {
  beforeEach(() => {
    getPhotos.mockResolvedValueOnce({
      edges: [
        makePhotoIdentifier('1', { filename: 'Cox Bazar trip.mp4' }),
        makePhotoIdentifier('2', { filename: 'Birthday party.mov' }),
        makePhotoIdentifier('3', { filename: 'Sylhet trip.mkv' }),
      ],
      page_info: { has_next_page: false },
    });
  });

  it('invites a search before anything is typed', async () => {
    await renderScreen();
    expect(screen.getByText('Search your library')).toBeOnTheScreen();
  });

  it('filters the whole library by name and plays from the results', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('search-input'), 'trip');

    expect(await screen.findByText('2 results')).toBeOnTheScreen();
    expect(screen.getByText('Cox Bazar trip')).toBeOnTheScreen();
    expect(screen.queryByText('Birthday party')).toBeNull();
    // The whole library is queried, not a single album.
    expect(getPhotos.mock.calls[0][0]).not.toHaveProperty('groupName');

    await fireEvent.press(screen.getByText('Sylhet trip'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Player', {
      queue: [
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({ id: '3' }),
      ],
      startIndex: 1,
      startFromBeginning: false,
    });
  });

  it('says so when nothing matches and clears the query', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('search-input'), 'wedding');
    expect(await screen.findByText('No matches')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Clear search'));
    expect(screen.getByText('Search your library')).toBeOnTheScreen();
  });
});
