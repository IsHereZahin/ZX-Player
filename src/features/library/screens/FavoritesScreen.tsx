import React, { useMemo } from 'react';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { HeartIcon } from '../../../shared/icons';
import { MediaCollection } from '../components/MediaCollection';
import { useFavoriteList } from '../favorites';
import { formatMediaCount, libraryTitle } from '../scopeCopy';
import { kindsOf } from '../services/mediaLibrary';

type Props = LibraryStackScreenProps<'Favorites'>;

export function FavoritesScreen({ navigation, route }: Props) {
  const { scope } = route.params;
  const kinds = useMemo(() => kindsOf(scope), [scope]);
  const favorites = useFavoriteList(kinds);

  return (
    <MediaCollection
      title="Favorites"
      subtitle={
        favorites.length > 0
          ? formatMediaCount(favorites.length, scope)
          : undefined
      }
      backLabel={libraryTitle(scope)}
      onBack={navigation.goBack}
      items={favorites}
      empty={{
        icon: HeartIcon,
        title: 'No favorites yet',
        message:
          'Add favorites from the ••• menu or the player to find them here.',
      }}
      testID="favorites-screen"
    />
  );
}
