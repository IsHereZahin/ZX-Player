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
import {
  LargeTitle,
  NavigationBar,
  useCollapsingTitle,
} from '../../../shared/components/NavigationBar';
import { SearchField } from '../../../shared/components/SearchField';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import { CircleAlertIcon, FilmIcon, MusicIcon } from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { isInProgress, useHistoryList } from '../../history/watchHistory';
import { ContinueWatchingRail } from '../components/ContinueWatchingRail';
import { FolderRow } from '../components/FolderRow';
import { PermissionGate } from '../components/PermissionGate';
import { useVideoFolders } from '../hooks/useVideoFolders';
import { libraryTitle, SCOPE_COPY, useLibraryScope } from '../scopeCopy';
import { kindsOf } from '../services/mediaLibrary';
import type { MediaScope, VideoFolder } from '../types';

const CONTINUE_WATCHING_LIMIT = 12;

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
          onScroll={onScroll}
          onOpenFolder={openFolder}
        />
      </PermissionGate>
    </View>
  );
}

interface FolderListProps {
  scope: MediaScope;
  /** Large title and search field, scrolled with the list. */
  header: ReactNode;
  onScroll: ScrollHandler;
  onOpenFolder: (folder: VideoFolder) => void;
}

function FolderList({
  scope,
  header,
  onScroll,
  onOpenFolder,
}: FolderListProps) {
  const styles = useStyles();
  const colors = useColors();
  const copy = SCOPE_COPY[scope];
  const { folders, loadState, refreshing, reload, refresh } =
    useVideoFolders(scope);
  const history = useHistoryList();
  const openPlayer = useOpenPlayer();
  const continueEntries = useMemo(() => {
    const kinds = kindsOf(scope);
    return history
      .filter(entry => kinds.includes(entry.video.kind) && isInProgress(entry))
      .slice(0, CONTINUE_WATCHING_LIMIT);
  }, [history, scope]);

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
      {continueEntries.length > 0 ? (
        <ContinueWatchingRail
          title={copy.continueHeading}
          entries={continueEntries}
          onPlay={index =>
            openPlayer(
              continueEntries.map(entry => entry.video),
              index,
            )
          }
        />
      ) : (
        <View style={styles.headerGap} />
      )}
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
          onRefresh={refresh}
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
