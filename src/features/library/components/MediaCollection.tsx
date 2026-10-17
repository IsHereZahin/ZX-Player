import React, { useCallback, type ReactNode } from 'react';
import { Animated, View } from 'react-native';

import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import {
  HeaderGlow,
  ScreenHeader,
  useHidingHeader,
} from '../../../shared/components/ScreenHeader';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import { ShuffleIcon, type IconComponent } from '../../../shared/icons';
import { shuffled } from '../../../shared/utils/shuffle';
import { useBottomInset } from '../../../app/navigation/useBottomInset';
import { useOpenPlayer } from '../../../app/navigation/useOpenPlayer';
import { makeStyles } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { useLastPlayedId } from '../../history/watchHistory';
import { useVideoActions, type ExtraAction } from '../hooks/useVideoActions';
import type { VideoItem } from '../types';
import { FAB_CLEARANCE, PlayAllButton } from './PlayAllButton';
import { VideoRow } from './VideoRow';

interface MediaCollectionProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  items: VideoItem[];
  loading?: boolean;
  empty: { icon: IconComponent; title: string; message: string };
  /** Header buttons after Shuffle, e.g. a playlist's options. */
  actions?: ReactNode;
  /** Options added to each item's menu, e.g. "Remove from Playlist". */
  extraActions?: (item: VideoItem) => ExtraAction[];
  testID?: string;
}

/**
 * A titled list of videos and audio (favorites, recently added, a playlist), laid out
 * like a folder: compact header, rows with menus and a floating Play button.
 */
export function MediaCollection({
  title,
  subtitle,
  onBack,
  items,
  loading = false,
  empty,
  actions,
  extraActions,
  testID,
}: MediaCollectionProps) {
  const styles = useStyles();
  const { play, openMenu, sheets } = useVideoActions(items, { extraActions });
  const openPlayer = useOpenPlayer();
  const lastPlayedId = useLastPlayedId();
  const header = useHidingHeader();
  const bottom = useBottomInset();
  const padding = { paddingTop: header.height, paddingBottom: bottom };

  const renderItem = useCallback(
    ({ item }: { item: VideoItem }) => (
      <VideoRow
        video={item}
        onPress={play}
        onMore={openMenu}
        highlighted={item.id === lastPlayedId}
      />
    ),
    [lastPlayedId, openMenu, play],
  );

  let body: ReactNode;
  if (loading) {
    body = (
      <View style={[styles.fill, padding]}>
        <ListSkeleton testID="collection-loading" />
      </View>
    );
  } else if (items.length === 0) {
    body = (
      <View style={[styles.fill, padding]}>
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          message={empty.message}
          testID="collection-empty"
        />
      </View>
    );
  } else {
    body = (
      <>
        <Animated.FlatList
          {...MEDIA_LIST_TUNING}
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={<View style={{ height: header.height }} />}
          contentContainerStyle={{ paddingBottom: bottom + FAB_CLEARANCE }}
          onScroll={header.onScroll}
          scrollEventThrottle={16}
          testID="collection-list"
        />
        <PlayAllButton onPress={() => play(items[0])} />
      </>
    );
  }

  return (
    <View style={styles.screen} testID={testID}>
      <HeaderGlow scrollY={header.scrollY} />
      {body}
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        actions={
          <>
            {items.length > 0 ? (
              <IconButton
                icon={ShuffleIcon}
                variant="raised"
                accessibilityLabel="Shuffle"
                onPress={() => openPlayer(shuffled(items), 0)}
                testID="shuffle-all"
              />
            ) : null}
            {actions}
          </>
        }
        hiding={header}
      />
      {sheets}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  fill: {
    flex: 1,
  },
}));
