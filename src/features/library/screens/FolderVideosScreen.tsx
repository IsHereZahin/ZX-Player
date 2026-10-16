import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { Button } from '../../../shared/components/Button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import {
  LargeTitle,
  NavigationBar,
  useCollapsingTitle,
} from '../../../shared/components/NavigationBar';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import {
  ArrowDownUpIcon,
  CircleAlertIcon,
  FilmIcon,
  LayoutGridIcon,
  ListIcon,
  MusicIcon,
  PlayIcon,
} from '../../../shared/icons';
import { spacing } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { useLastPlayedId } from '../../history/watchHistory';
import { VideoGridCard } from '../components/VideoGridCard';
import { VIDEO_ROW_HEIGHT, VideoRow } from '../components/VideoRow';
import { SortSheet } from '../components/VideoSheets';
import { useFolderVideos } from '../hooks/useFolderVideos';
import { useVideoActions } from '../hooks/useVideoActions';
import { updateLibraryPrefs, useLibraryPrefs } from '../libraryPrefs';
import { formatMediaCount, libraryTitle, SCOPE_COPY } from '../scopeCopy';
import type { VideoItem } from '../types';
import { sortVideos } from '../utils/sortVideos';

type Props = LibraryStackScreenProps<'FolderVideos'>;

function gridColumns(width: number): number {
  if (width >= 900) {
    return 4;
  }
  return width >= 600 ? 3 : 2;
}

export function FolderVideosScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { folder } = route.params;
  const { videos, loadState, complete, refreshing, reload, refresh } =
    useFolderVideos(folder);
  const { sortKey, sortDirection, viewMode } = useLibraryPrefs();
  const lastPlayedId = useLastPlayedId();
  const [sortOpen, setSortOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { width } = useWindowDimensions();
  const { scrollY, onScroll } = useCollapsingTitle();

  const sorted = useMemo(
    () => sortVideos(videos, sortKey, sortDirection),
    [videos, sortKey, sortDirection],
  );
  const { play, openMenu, sheets } = useVideoActions(sorted);

  const grid = viewMode === 'grid';
  const columns = gridColumns(width);
  const cardWidth =
    (width - spacing.lg * 2 - spacing.md * (columns - 1)) / columns;
  const lastIndex = sorted.length - 1;

  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) =>
      grid ? (
        <VideoGridCard
          video={item}
          width={cardWidth}
          onPress={play}
          onMore={openMenu}
          highlighted={item.id === lastPlayedId}
        />
      ) : (
        <VideoRow
          video={item}
          onPress={play}
          onMore={openMenu}
          highlighted={item.id === lastPlayedId}
          separator={index < lastIndex}
        />
      ),
    [cardWidth, grid, lastIndex, lastPlayedId, openMenu, play],
  );

  const subtitle =
    loadState === 'ready'
      ? `${formatMediaCount(videos.length, folder.scope)}${complete ? '' : '…'}`
      : undefined;

  const onHeaderLayout = useCallback(
    (event: LayoutChangeEvent) =>
      setHeaderHeight(event.nativeEvent.layout.height),
    [],
  );

  const header = (
    <View onLayout={onHeaderLayout}>
      <LargeTitle title={folder.title} subtitle={subtitle} />
      {sorted.length > 0 ? (
        <View style={styles.actions}>
          <Button
            label="Play"
            icon={PlayIcon}
            variant="secondary"
            onPress={() => play(sorted[0])}
            style={styles.action}
            testID="play-all"
          />
        </View>
      ) : null}
    </View>
  );

  // The title stays above loading, empty and error states too.
  const withHeader = (content: React.ReactNode) => (
    <View style={styles.fill}>
      {header}
      {content}
    </View>
  );

  const renderBody = () => {
    if (loadState === 'error') {
      return withHeader(
        <EmptyState
          icon={CircleAlertIcon}
          title="Couldn't load this folder"
          message="Something went wrong while reading its contents."
          actionLabel="Try again"
          onAction={reload}
          testID="videos-error"
        />,
      );
    }
    if (loadState === 'loading' || (videos.length === 0 && !complete)) {
      return withHeader(<ListSkeleton testID="videos-loading" />);
    }
    if (videos.length === 0) {
      return withHeader(
        <EmptyState
          icon={folder.scope === 'audio' ? MusicIcon : FilmIcon}
          title="This folder is empty"
          message={SCOPE_COPY[folder.scope].folderEmpty}
          actionLabel="Refresh"
          onAction={reload}
          testID="videos-empty"
        />,
      );
    }
    return (
      <Animated.FlatList
        // Changing columns requires a fresh list instance.
        key={grid ? `grid-${columns}` : 'list'}
        {...MEDIA_LIST_TUNING}
        data={sorted}
        keyExtractor={video => video.id}
        renderItem={renderItem}
        numColumns={grid ? columns : 1}
        columnWrapperStyle={grid ? styles.gridRow : undefined}
        ListHeaderComponent={header}
        getItemLayout={
          grid
            ? undefined
            : (_, index) => ({
                length: VIDEO_ROW_HEIGHT,
                offset: headerHeight + VIDEO_ROW_HEIGHT * index,
                index,
              })
        }
        contentContainerStyle={[styles.listContent, grid && styles.gridContent]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListFooterComponent={
          complete ? undefined : (
            <ActivityIndicator
              color={colors.textSecondary}
              style={styles.footer}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.textSecondary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        testID="videos-list"
      />
    );
  };

  return (
    <View style={styles.screen}>
      <NavigationBar
        title={folder.title}
        scrollY={scrollY}
        tone="plain"
        onBack={navigation.goBack}
        backLabel={libraryTitle(folder.scope)}
        right={
          <>
            <IconButton
              icon={ArrowDownUpIcon}
              variant="plain"
              accessibilityLabel="Sort"
              onPress={() => setSortOpen(true)}
              testID="open-sort"
            />
            <IconButton
              icon={grid ? ListIcon : LayoutGridIcon}
              variant="plain"
              accessibilityLabel={grid ? 'Show as list' : 'Show as grid'}
              onPress={() =>
                updateLibraryPrefs({ viewMode: grid ? 'list' : 'grid' })
              }
              testID="toggle-view"
            />
          </>
        }
      />
      {renderBody()}
      <SortSheet
        visible={sortOpen}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSelect={(key, direction) =>
          updateLibraryPrefs({ sortKey: key, sortDirection: direction })
        }
        onClose={() => setSortOpen(false)}
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
  gridContent: {
    gap: spacing.lg,
  },
  gridRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
}));
