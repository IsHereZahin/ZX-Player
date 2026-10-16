import React, { useCallback, useMemo, type ReactNode } from 'react';
import {
  Animated,
  RefreshControl,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { useOpenPlayer } from '../../../app/navigation/useOpenPlayer';
import { AppLogo } from '../../../shared/components/AppLogo';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ListRow, ListSection } from '../../../shared/components/GroupedList';
import {
  LargeTitle,
  NavigationBar,
  useCollapsingTitle,
} from '../../../shared/components/NavigationBar';
import { SearchField } from '../../../shared/components/SearchField';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import {
  CircleAlertIcon,
  FilmIcon,
  HeartIcon,
  ListMusicIcon,
  MusicIcon,
  SparklesIcon,
} from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { formatAddedAgo, formatTimeLeft } from '../../../shared/utils/format';
import { makeStyles, useColors } from '../../../shared/theming';
import {
  historyStore,
  isInProgress,
  useHistoryList,
  watchProgress,
} from '../../history/watchHistory';
import { MediaShelf } from '../components/MediaShelf';
import { useFavoriteList } from '../favorites';
import { useMediaIndex } from '../hooks/useMediaIndex';
import { usePlaylists } from '../playlists';
import { addedAt, selectRecentlyAdded } from '../recentlyAdded';
import { invalidateMediaIndex } from '../services/videoIndex';
import { FolderRow } from '../components/FolderRow';
import { PermissionGate } from '../components/PermissionGate';
import { useVideoFolders } from '../hooks/useVideoFolders';
import { libraryTitle, SCOPE_COPY, useLibraryScope } from '../scopeCopy';
import { kindsOf } from '../services/mediaLibrary';
import type { MediaScope, VideoFolder, VideoItem } from '../types';

const SHELF_LIMIT = 12;

const timeLeft = (item: VideoItem) => {
  const entry = historyStore.getState()[item.id];
  return entry ? formatTimeLeft(entry.durationSec - entry.positionSec) : null;
};
const progressOf = (item: VideoItem) =>
  watchProgress(historyStore.getState()[item.id]);
const addedAgo = (item: VideoItem) => formatAddedAgo(addedAt(item));

type Props = LibraryStackScreenProps<'LibraryHome'>;
type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

/** Folders of one library tab: videos, audio, or both (see `useLibraryScope`). */
export function LibraryScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const scope = useLibraryScope(route.params.tab);
  const copy = SCOPE_COPY[scope];
  const title = libraryTitle(scope);
  const { scrollY, onScroll } = useCollapsingTitle();

  const openFolder = useCallback(
    (folder: VideoFolder) => navigation.navigate('FolderVideos', { folder }),
    [navigation],
  );
  const openSearch = useCallback(
    () => navigation.navigate('Search', { scope }),
    [navigation, scope],
  );
  const openFavorites = useCallback(
    () => navigation.navigate('Favorites', { scope }),
    [navigation, scope],
  );
  const openRecentlyAdded = useCallback(
    () => navigation.navigate('RecentlyAdded', { scope }),
    [navigation, scope],
  );
  const openPlaylists = useCallback(
    () => navigation.navigate('Playlists', { scope }),
    [navigation, scope],
  );

  const top = (
    <>
      <LargeTitle title={title} accessory={<AppLogo size={34} />} />
      <View style={styles.search}>
        <SearchField
          placeholder={copy.searchLabel}
          onPress={openSearch}
          testID="open-search"
        />
      </View>
    </>
  );

  return (
    <View style={styles.screen} testID="library-screen">
      <NavigationBar title={title} scrollY={scrollY} />
      {/* Keyed so switching the scope starts its permission check and scan afresh. */}
      <PermissionGate key={scope} scope={scope} header={top}>
        <FolderList
          scope={scope}
          header={top}
          collections={
            <Collections
              scope={scope}
              onOpenFavorites={openFavorites}
              onOpenRecentlyAdded={openRecentlyAdded}
              onOpenPlaylists={openPlaylists}
            />
          }
          onScroll={onScroll}
          onOpenFolder={openFolder}
          onOpenRecentlyAdded={openRecentlyAdded}
        />
      </PermissionGate>
    </View>
  );
}

/** Items added in the last month, from the shared media index (null while loading). */
function useRecentlyAdded(scope: MediaScope): VideoItem[] | null {
  const { items } = useMediaIndex(scope);
  return useMemo(() => (items ? selectRecentlyAdded(items) : null), [items]);
}

/** Favorites and other collections, listed above the shelves. */
function Collections({
  scope,
  onOpenFavorites,
  onOpenRecentlyAdded,
  onOpenPlaylists,
}: {
  scope: MediaScope;
  onOpenFavorites: () => void;
  onOpenRecentlyAdded: () => void;
  onOpenPlaylists: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const kinds = useMemo(() => kindsOf(scope), [scope]);
  const favorites = useFavoriteList(kinds).length;
  const recent = useRecentlyAdded(scope)?.length ?? 0;
  const playlists = usePlaylists().length;
  return (
    <ListSection style={styles.collections}>
      <ListRow
        icon={SparklesIcon}
        iconBackground={colors.blue}
        title="Recently Added"
        value={recent > 0 ? String(recent) : undefined}
        accessory="chevron"
        onPress={onOpenRecentlyAdded}
        testID="open-recently-added"
      />
      <ListRow
        icon={HeartIcon}
        iconBackground={colors.pink}
        title="Favorites"
        value={favorites > 0 ? String(favorites) : undefined}
        accessory="chevron"
        onPress={onOpenFavorites}
        testID="open-favorites"
      />
      <ListRow
        icon={ListMusicIcon}
        iconBackground={colors.orange}
        title="Playlists"
        value={playlists > 0 ? String(playlists) : undefined}
        accessory="chevron"
        onPress={onOpenPlaylists}
        testID="open-playlists"
      />
    </ListSection>
  );
}

interface FolderListProps {
  scope: MediaScope;
  /** Large title and search field, scrolled with the list. */
  header: ReactNode;
  collections: ReactNode;
  onScroll: ScrollHandler;
  onOpenFolder: (folder: VideoFolder) => void;
  onOpenRecentlyAdded: () => void;
}

function FolderList({
  scope,
  header,
  collections,
  onScroll,
  onOpenFolder,
  onOpenRecentlyAdded,
}: FolderListProps) {
  const styles = useStyles();
  const colors = useColors();
  const copy = SCOPE_COPY[scope];
  const { folders, loadState, refreshing, reload, refresh } =
    useVideoFolders(scope);
  const history = useHistoryList();
  const openPlayer = useOpenPlayer();
  const continueItems = useMemo(() => {
    const kinds = kindsOf(scope);
    return history
      .filter(entry => kinds.includes(entry.video.kind) && isInProgress(entry))
      .slice(0, SHELF_LIMIT)
      .map(entry => entry.video);
  }, [history, scope]);
  const recentlyAdded = useRecentlyAdded(scope);
  const newest = useMemo(
    () => (recentlyAdded ?? []).slice(0, SHELF_LIMIT),
    [recentlyAdded],
  );
  const refreshAll = useCallback(() => {
    invalidateMediaIndex();
    refresh();
  }, [refresh]);

  const folderCount = folders.length;
  const renderItem = useCallback(
    ({ item, index }: { item: VideoFolder; index: number }) => (
      <FolderRow
        folder={item}
        onPress={onOpenFolder}
        index={index}
        count={folderCount}
      />
    ),
    [folderCount, onOpenFolder],
  );

  const withHeader = (content: ReactNode) => (
    <View style={styles.fill}>
      {header}
      {content}
    </View>
  );

  if (loadState === 'loading') {
    return withHeader(
      <ListSkeleton thumbnail={false} testID="folders-loading" />,
    );
  }

  if (loadState === 'error') {
    return withHeader(
      <EmptyState
        icon={CircleAlertIcon}
        title="Couldn't read your library"
        message={copy.scanError}
        actionLabel="Try again"
        onAction={reload}
        testID="folders-error"
      />,
    );
  }

  // Only the synthetic "All …" entry means no real folders were found.
  if (folders.length <= 1) {
    return withHeader(
      <EmptyState
        icon={scope === 'audio' ? MusicIcon : FilmIcon}
        title={copy.emptyTitle}
        message={copy.emptyMessage}
        actionLabel="Scan again"
        onAction={reload}
        testID="folders-empty"
      />,
    );
  }

  const listHeader = (
    <>
      {header}
      {collections}
      {continueItems.length > 0 ? (
        <MediaShelf
          title={copy.continueHeading}
          items={continueItems}
          caption={timeLeft}
          progress={progressOf}
          onPlay={index => openPlayer(continueItems, index)}
          testID="continue"
        />
      ) : null}
      {newest.length > 0 ? (
        <MediaShelf
          title="Recently Added"
          items={newest}
          caption={addedAgo}
          onPlay={index => openPlayer(newest, index)}
          onSeeAll={onOpenRecentlyAdded}
          testID="recently-added"
        />
      ) : null}
      {continueItems.length === 0 && newest.length === 0 ? (
        <View style={styles.headerGap} />
      ) : null}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Folders
      </Text>
    </>
  );

  return (
    <Animated.FlatList
      data={folders}
      keyExtractor={folder => folder.id}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      contentContainerStyle={styles.listContent}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshAll}
          tintColor={colors.textSecondary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
      testID="folders-list"
    />
  );
}

const useStyles = makeStyles(colors => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  search: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerGap: {
    height: spacing.lg,
  },
  collections: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.title3,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm + 2,
    color: colors.textPrimary,
  },
}));
