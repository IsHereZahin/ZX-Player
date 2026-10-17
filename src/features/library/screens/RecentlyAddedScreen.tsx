import React, { useMemo } from 'react';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { SparklesIcon } from '../../../shared/icons';
import { MediaCollection } from '../components/MediaCollection';
import { useMediaIndex } from '../hooks/useMediaIndex';
import { RECENTLY_ADDED_DAYS, selectRecentlyAdded } from '../recentlyAdded';
import { formatMediaCount } from '../scopeCopy';

type Props = LibraryStackScreenProps<'RecentlyAdded'>;

export function RecentlyAddedScreen({ navigation, route }: Props) {
  const { scope } = route.params;
  const { items, loading } = useMediaIndex(scope);
  const recent = useMemo(
    () => (items ? selectRecentlyAdded(items) : []),
    [items],
  );

  return (
    <MediaCollection
      title="Recently Added"
      subtitle={
        recent.length > 0 ? formatMediaCount(recent.length, scope) : undefined
      }
      onBack={navigation.goBack}
      items={recent}
      loading={loading}
      empty={{
        icon: SparklesIcon,
        title: 'Nothing new',
        message: `Files added to this device in the last ${RECENTLY_ADDED_DAYS} days appear here.`,
      }}
      testID="recently-added-screen"
    />
  );
}
