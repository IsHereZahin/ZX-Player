import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  useWindowDimensions,
  View,
} from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { useBottomInset } from '../../../app/navigation/useBottomInset';
import { useOpenPlayer } from '../../../app/navigation/useOpenPlayer';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import {
  HeaderGlow,
  ScreenHeader,
  useHidingHeader,
} from '../../../shared/components/ScreenHeader';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import {
  ArrowDownUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CopyIcon,
  FolderInputIcon,
  ListChecksIcon,
  ListPlusIcon,
  Trash2Icon,
  FilmIcon,
  LayoutGridIcon,
  ListIcon,
  MusicIcon,
  ShuffleIcon,
} from '../../../shared/icons';
import { spacing } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { shuffled } from '../../../shared/utils/shuffle';
import { useLastPlayedId } from '../../history/watchHistory';
import { FAB_CLEARANCE, PlayAllButton } from '../components/PlayAllButton';
import { SelectionBar, type SelectionAction } from '../components/SelectionBar';
import { VideoGridCard } from '../components/VideoGridCard';
import { VIDEO_ROW_HEIGHT, VideoRow } from '../components/VideoRow';
import { SortSheet } from '../components/VideoSheets';
import { useFolderVideos } from '../hooks/useFolderVideos';
import { useSelection } from '../hooks/useSelection';
import { useVideoActions, type ExtraAction } from '../hooks/useVideoActions';
import { formatMediaCount, SCOPE_COPY } from '../scopeCopy';
import { updateLibraryPrefs, useLibraryPrefs } from '../libraryPrefs';
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
  const { width } = useWindowDimensions();
  const header = useHidingHeader();
  const bottom = useBottomInset();

  const sorted = useMemo(
    () => sortVideos(videos, sortKey, sortDirection),
    [videos, sortKey, sortDirection],
  );
  const selection = useSelection(sorted);
  const { toggle: toggleSelected, clear: clearSelection } = selection;
  const selectAction = useCallback(
    (video: VideoItem): ExtraAction[] => [
      {
        label: 'Select',
        icon: CircleCheckIcon,
        onPress: () => toggleSelected(video),
        testID: 'action-select',
      },
    ],
    [toggleSelected],
  );
  const { play, openMenu, files, addToPlaylist, sheets } = useVideoActions(
    sorted,
    { extraActions: selectAction, onFilesChanged: clearSelection },
  );
  const openPlayer = useOpenPlayer();
  const { selecting, selectedIds, selectedItems } = selection;

  const grid = viewMode === 'grid';
  const columns = gridColumns(width);
  const cardWidth =
    (width - spacing.lg * 2 - spacing.md * (columns - 1)) / columns;

  // While selecting, a press toggles an item instead of playing it.
  const onItemPress = selecting ? toggleSelected : play;
  const renderItem = useCallback(
    ({ item }: { item: VideoItem }) =>
      grid ? (
        <VideoGridCard
          video={item}
          width={cardWidth}
          onPress={onItemPress}
          onMore={openMenu}
          onLongPress={toggleSelected}
          highlighted={item.id === lastPlayedId}
          selecting={selecting}
          selected={selectedIds.has(item.id)}
        />
      ) : (
        <VideoRow
          video={item}
          onPress={onItemPress}
          onMore={openMenu}
          onLongPress={toggleSelected}
          highlighted={item.id === lastPlayedId}
          selecting={selecting}
          selected={selectedIds.has(item.id)}
        />
      ),
    [
      cardWidth,
      grid,
      lastPlayedId,
      onItemPress,
      openMenu,
      selectedIds,
      selecting,
      toggleSelected,
    ],
  );

  const selectionActions: SelectionAction[] = [
    {
      label: 'Playlist',
      icon: ListPlusIcon,
      onPress: () => addToPlaylist(selectedItems),
      testID: 'selection-playlist',
    },
  ];
  if (files.available) {
    selectionActions.push(
      {
        label: 'Copy',
        icon: CopyIcon,
        onPress: () => files.copy(selectedItems),
        testID: 'selection-copy',
      },
      {
        label: 'Move',
        icon: FolderInputIcon,
        onPress: () => files.move(selectedItems, folder.relativePath),
        testID: 'selection-move',
      },
      {
        label: 'Delete',
        icon: Trash2Icon,
        destructive: true,
        onPress: () => files.remove(selectedItems),
        testID: 'selection-delete',
      },
    );
  }

  const subtitle =
    loadState === 'ready'
      ? `${formatMediaCount(videos.length, folder.scope)}${complete ? '' : '…'}`
      : undefined;

  // Loading, error and empty states sit between the floating header and tab bar.
  const padded = (content: ReactNode) => (
    <View
      style={[
        styles.fill,
        { paddingTop: header.height, paddingBottom: bottom },
      ]}
    >
      {content}
    </View>
  );

  const renderBody = () => {
    if (loadState === 'error') {
      return padded(
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
      return padded(<ListSkeleton testID="videos-loading" />);
    }
    if (videos.length === 0) {
      return padded(
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
      <>
        <Animated.FlatList
          // Changing columns requires a fresh list instance.
          key={grid ? `grid-${columns}` : 'list'}
          {...MEDIA_LIST_TUNING}
          data={sorted}
          keyExtractor={video => video.id}
          renderItem={renderItem}
          numColumns={grid ? columns : 1}
          columnWrapperStyle={grid ? styles.gridRow : undefined}
          ListHeaderComponent={<View style={{ height: header.height }} />}
          getItemLayout={
            grid
              ? undefined
              : (_, index) => ({
                  length: VIDEO_ROW_HEIGHT,
                  offset: header.height + VIDEO_ROW_HEIGHT * index,
                  index,
                })
          }
          contentContainerStyle={[
            grid && styles.gridContent,
            { paddingBottom: bottom + FAB_CLEARANCE },
          ]}
          onScroll={header.onScroll}
          scrollEventThrottle={16}
          ListFooterComponent={
            complete ? undefined : (
              <ActivityIndicator color={colors.accent} style={styles.footer} />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              progressViewOffset={header.height}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surfaceRaised}
            />
          }
          testID="videos-list"
        />
        {selecting ? (
          <SelectionBar actions={selectionActions} />
        ) : (
          <PlayAllButton onPress={() => play(sorted[0])} />
        )}
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <HeaderGlow scrollY={header.scrollY} />
      {renderBody()}
      {selecting ? (
        <ScreenHeader
          title={`${selectedItems.length} selected`}
          onBack={clearSelection}
          actions={
            <IconButton
              icon={ListChecksIcon}
              variant="raised"
              active={selection.allSelected}
              accessibilityLabel={
                selection.allSelected ? 'Deselect all' : 'Select all'
              }
              onPress={selection.toggleAll}
              testID="select-all"
            />
          }
          hiding={header}
        />
      ) : (
        <ScreenHeader
          title={folder.title}
          subtitle={subtitle}
          onBack={navigation.goBack}
          actions={
            <>
              {sorted.length > 0 ? (
                <IconButton
                  icon={ShuffleIcon}
                  variant="raised"
                  accessibilityLabel="Shuffle"
                  onPress={() => openPlayer(shuffled(sorted), 0)}
                  testID="shuffle-all"
                />
              ) : null}
              <IconButton
                icon={ArrowDownUpIcon}
                variant="raised"
                accessibilityLabel="Sort"
                onPress={() => setSortOpen(true)}
                testID="open-sort"
              />
              <IconButton
                icon={grid ? ListIcon : LayoutGridIcon}
                variant="raised"
                accessibilityLabel={grid ? 'Show as list' : 'Show as grid'}
                onPress={() =>
                  updateLibraryPrefs({ viewMode: grid ? 'list' : 'grid' })
                }
                testID="toggle-view"
              />
            </>
          }
          hiding={header}
        />
      )}
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
  gridContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  gridRow: {
    gap: spacing.md,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
}));
