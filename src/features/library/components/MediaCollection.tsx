import React, { useCallback, type ReactNode } from 'react';
import { Animated, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { EmptyState } from '../../../shared/components/EmptyState';
import {
  LargeTitle,
  NavigationBar,
  useCollapsingTitle,
} from '../../../shared/components/NavigationBar';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import { PlayIcon, type IconComponent } from '../../../shared/icons';
import { spacing } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { useLastPlayedId } from '../../history/watchHistory';
import { useVideoActions, type ExtraAction } from '../hooks/useVideoActions';
import type { VideoItem } from '../types';
import { VideoRow } from './VideoRow';

interface MediaCollectionProps {
  title: string;
  subtitle?: string;
  backLabel: string;
  onBack: () => void;
  items: VideoItem[];
  loading?: boolean;
  empty: { icon: IconComponent; title: string; message: string };
  /** Buttons in the navigation bar. */
  navigationRight?: ReactNode;
  /** Options added to each item's menu, e.g. "Remove from Playlist". */
  extraActions?: (item: VideoItem) => ExtraAction[];
  testID?: string;
}

/**
 * A titled list of videos and audio (favorites, recently added, a playlist): large title,
 * Play button, rows with menus. Laid out like an album page in Apple Music.
 */
export function MediaCollection({
  title,
  subtitle,
  backLabel,
  onBack,
  items,
  loading = false,
  empty,
  navigationRight,
  extraActions,
  testID,
}: MediaCollectionProps) {
  const styles = useStyles();
  const { scrollY, onScroll } = useCollapsingTitle();
  const { play, openMenu, sheets } = useVideoActions(items, extraActions);
  const lastPlayedId = useLastPlayedId();
  const lastIndex = items.length - 1;

  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) => (
      <VideoRow
        video={item}
        onPress={play}
        onMore={openMenu}
        highlighted={item.id === lastPlayedId}
        separator={index < lastIndex}
      />
    ),
    [lastIndex, lastPlayedId, openMenu, play],
  );

  const header = (
    <>
      <LargeTitle title={title} subtitle={subtitle} />
      {items.length > 0 ? (
        <View style={styles.actions}>
          <Button
            label="Play"
            icon={PlayIcon}
            variant="secondary"
            onPress={() => play(items[0])}
            style={styles.action}
            testID="play-all"
          />
        </View>
      ) : null}
    </>
  );

  let body: ReactNode;
  if (loading) {
    body = (
      <View style={styles.fill}>
        {header}
        <ListSkeleton testID="collection-loading" />
      </View>
    );
  } else if (items.length === 0) {
    body = (
      <View style={styles.fill}>
        {header}
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
      <Animated.FlatList
        {...MEDIA_LIST_TUNING}
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID="collection-list"
      />
    );
  }

  return (
    <View style={styles.screen} testID={testID}>
      <NavigationBar
        title={title}
        scrollY={scrollY}
        tone="plain"
        onBack={onBack}
        backLabel={backLabel}
        right={navigationRight}
      />
      {body}
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  action: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
}));
