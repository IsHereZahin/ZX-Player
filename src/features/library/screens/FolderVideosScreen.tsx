import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  useWindowDimensions,
  View,
} from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import { ScreenHeader } from '../../../shared/components/ScreenHeader';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import {
  ArrowDownUpIcon,
  CircleAlertIcon,
  FilmIcon,
  LayoutGridIcon,
  ListIcon,
  MusicIcon,
} from '../../../shared/icons';
import { spacing } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { useLastPlayedId } from '../../history/watchHistory';
import { PlayAllButton } from '../components/PlayAllButton';
import { VideoGridCard } from '../components/VideoGridCard';
import { VIDEO_ROW_HEIGHT, VideoRow } from '../components/VideoRow';
import { SortSheet } from '../components/VideoSheets';
import { useFolderVideos } from '../hooks/useFolderVideos';
import { useVideoActions } from '../hooks/useVideoActions';
import { formatMediaCount, SCOPE_COPY } from '../scopeCopy';
import { updateLibraryPrefs, useLibraryPrefs } from '../libraryPrefs';
import type { VideoItem } from '../types';
import { sortVideos } from '../utils/sortVideos';

type Props = LibraryStackScreenProps<'FolderVideos'>;

const FAB_CLEARANCE = 96;

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
  const { width } = useWindowDimensions();

  const sorted = useMemo(
    () => sortVideos(videos, sortKey, sortDirection),
    [videos, sortKey, sortDirection],
  );
  const { play, openMenu, sheets } = useVideoActions(sorted);

  const grid = viewMode === 'grid';
  const columns = gridColumns(width);
  const cardWidth =
    (width - spacing.lg * 2 - spacing.md * (columns - 1)) / columns;

  const renderItem = useCallback(
    ({ item }: { item: VideoItem }) =>
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
        />
      ),
    [cardWidth, grid, lastPlayedId, openMenu, play],
  );

  const subtitle =
    loadState === 'ready'
      ? `${formatMediaCount(videos.length, folder.scope)}${complete ? '' : '…'}`
      : undefined;

  const renderBody = () => {
    if (loadState === 'error') {
      return (
        <EmptyState
          icon={CircleAlertIcon}
          title="Couldn't load this folder"
          message="Something went wrong while reading its contents."
          actionLabel="Try again"
          onAction={reload}
          testID="videos-error"
        />
      );
    }
    if (loadState === 'loading' || (videos.length === 0 && !complete)) {
      return <ListSkeleton testID="videos-loading" />;
    }
    if (videos.length === 0) {
      return (
        <EmptyState
          icon={folder.scope === 'audio' ? MusicIcon : FilmIcon}
          title="This folder is empty"
          message={SCOPE_COPY[folder.scope].folderEmpty}
          actionLabel="Refresh"
          onAction={reload}
          testID="videos-empty"
        />
      );
    }
    return (
      <>
        <FlatList
          // Changing columns requires a fresh list instance.
          key={grid ? `grid-${columns}` : 'list'}
          {...MEDIA_LIST_TUNING}
          data={sorted}
          keyExtractor={video => video.id}
          renderItem={renderItem}
          numColumns={grid ? columns : 1}
          columnWrapperStyle={grid ? styles.gridRow : undefined}
          getItemLayout={
            grid
              ? undefined
              : (_, index) => ({
                  length: VIDEO_ROW_HEIGHT,
                  offset: VIDEO_ROW_HEIGHT * index,
                  index,
                })
          }
          contentContainerStyle={[
            styles.listContent,
            grid && styles.gridContent,
          ]}
          ListFooterComponent={
            complete ? undefined : (
              <ActivityIndicator
                color={colors.primaryBright}
                style={styles.footer}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primaryBright}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surfaceRaised}
            />
          }
          testID="videos-list"
        />
        <PlayAllButton onPress={() => play(sorted[0])} />
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={folder.title}
        subtitle={subtitle}
        onBack={navigation.goBack}
        actions={
          <>
            <IconButton
              icon={ArrowDownUpIcon}
              accessibilityLabel="Sort"
              onPress={() => setSortOpen(true)}
              testID="open-sort"
            />
            <IconButton
              icon={grid ? ListIcon : LayoutGridIcon}
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
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: FAB_CLEARANCE,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  gridRow: {
    gap: spacing.md,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
}));
