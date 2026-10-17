import React, { useCallback, useMemo, type ReactNode } from 'react';
import { Animated, RefreshControl, Text, View } from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { useBottomInset } from '../../../app/navigation/useBottomInset';
import { useOpenPlayer } from '../../../app/navigation/useOpenPlayer';
import { AppLogo } from '../../../shared/components/AppLogo';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import {
  HeaderGlow,
  ScreenHeader,
  useHidingHeader,
  type HidingHeader,
} from '../../../shared/components/ScreenHeader';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import {
  CircleAlertIcon,
  FilmIcon,
  MusicIcon,
  SearchIcon,
} from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { NO_CLIPPING } from '../../../shared/utils/listTuning';
import { isInProgress, useHistoryList } from '../../history/watchHistory';
import { ContinueWatchingRail } from '../components/ContinueWatchingRail';
import { FolderRow } from '../components/FolderRow';
import { LibraryShortcuts } from '../components/LibraryShortcuts';
import { PermissionGate } from '../components/PermissionGate';
import { useVideoFolders } from '../hooks/useVideoFolders';
import { libraryTitle, SCOPE_COPY, useLibraryScope } from '../scopeCopy';
import { canManageFiles } from '../services/fileOperations';
import { kindsOf } from '../services/mediaLibrary';
import type { MediaScope, VideoFolder } from '../types';

const CONTINUE_WATCHING_LIMIT = 12;

type Props = LibraryStackScreenProps<'LibraryHome'>;

/** Folders of one library tab: videos, audio, or both (see `useLibraryScope`). */
export function LibraryScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const scope = useLibraryScope(route.params.tab);
  const copy = SCOPE_COPY[scope];
  const header = useHidingHeader();
  const bottom = useBottomInset();
  const openFolder = useCallback(
    (folder: VideoFolder) => navigation.navigate('FolderVideos', { folder }),
    [navigation],
  );

  const shortcuts = (
    <LibraryShortcuts
      onOpenFavorites={() => navigation.navigate('Favorites', { scope })}
      onOpenRecentlyAdded={() =>
        navigation.navigate('RecentlyAdded', { scope })
      }
      onOpenPlaylists={() => navigation.navigate('Playlists', { scope })}
      onOpenRecycleBin={
        canManageFiles()
          ? () => navigation.navigate('RecycleBin', { scope })
          : undefined
      }
    />
  );

  return (
    <View style={styles.screen} testID="library-screen">
      <HeaderGlow scrollY={header.scrollY} />
      {/* Keyed so switching the scope starts its permission check and scan afresh. */}
      <PermissionGate
        key={scope}
        scope={scope}
        style={{ paddingTop: header.height, paddingBottom: bottom }}
      >
        <FolderList
          scope={scope}
          shortcuts={shortcuts}
          header={header}
          bottomInset={bottom}
          onOpenFolder={openFolder}
        />
      </PermissionGate>
      <ScreenHeader
        title={libraryTitle(scope)}
        leading={<AppLogo size={34} />}
        actions={
          <IconButton
            icon={SearchIcon}
            variant="raised"
            accessibilityLabel={copy.searchLabel}
            onPress={() => navigation.navigate('Search', { scope })}
            testID="open-search"
          />
        }
        hiding={header}
      />
    </View>
  );
}

function FolderList({
  scope,
  shortcuts,
  header,
  bottomInset,
  onOpenFolder,
}: {
  scope: MediaScope;
  /** Favorites, Recently Added and Playlists, above the rail and the folders. */
  shortcuts: ReactNode;
  header: HidingHeader;
  bottomInset: number;
  onOpenFolder: (folder: VideoFolder) => void;
}) {
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

  const renderItem = useCallback(
    ({ item }: { item: VideoFolder }) => (
      <FolderRow folder={item} onPress={onOpenFolder} />
    ),
    [onOpenFolder],
  );

  // Loading, error and empty states sit between the floating header and tab bar.
  const padded = (content: ReactNode) => (
    <View
      style={[
        styles.fill,
        { paddingTop: header.height, paddingBottom: bottomInset },
      ]}
    >
      {content}
    </View>
  );

  if (loadState === 'loading') {
    return padded(<ListSkeleton thumbnail={false} testID="folders-loading" />);
  }

  if (loadState === 'error') {
    return padded(
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
    return padded(
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
      <View style={{ height: header.height }} />
      {shortcuts}
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
      ) : null}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Folders
      </Text>
    </>
  );

  return (
    <Animated.FlatList
      {...NO_CLIPPING}
      data={folders}
      keyExtractor={folder => folder.id}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      contentContainerStyle={{ paddingBottom: bottomInset + spacing.lg }}
      onScroll={header.onScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          progressViewOffset={header.height}
          tintColor={colors.accent}
          colors={[colors.accent]}
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
    backgroundColor: colors.canvas,
  },
  fill: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.overline,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
    color: colors.textSecondary,
  },
}));
