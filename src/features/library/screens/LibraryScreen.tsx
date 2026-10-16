import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { useOpenPlayer } from '../../../app/navigation/useOpenPlayer';
import { AppLogo } from '../../../shared/components/AppLogo';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import { ScreenHeader } from '../../../shared/components/ScreenHeader';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import {
  CircleAlertIcon,
  FilmIcon,
  MusicIcon,
  SearchIcon,
} from '../../../shared/icons';
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

/** Folders of one library tab: videos, audio, or both (see `useLibraryScope`). */
export function LibraryScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const scope = useLibraryScope(route.params.tab);
  const copy = SCOPE_COPY[scope];
  const openFolder = useCallback(
    (folder: VideoFolder) => navigation.navigate('FolderVideos', { folder }),
    [navigation],
  );

  return (
    <View style={styles.screen} testID="library-screen">
      <ScreenHeader
        title={libraryTitle(scope)}
        leading={<AppLogo size={36} />}
        actions={
          <IconButton
            icon={SearchIcon}
            accessibilityLabel={copy.searchLabel}
            onPress={() => navigation.navigate('Search', { scope })}
            testID="open-search"
          />
        }
      />
      {/* Keyed so switching the scope starts its permission check and scan afresh. */}
      <PermissionGate key={scope} scope={scope}>
        <FolderList scope={scope} onOpenFolder={openFolder} />
      </PermissionGate>
    </View>
  );
}

function FolderList({
  scope,
  onOpenFolder,
}: {
  scope: MediaScope;
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

  if (loadState === 'loading') {
    return <ListSkeleton thumbnail={false} testID="folders-loading" />;
  }

  if (loadState === 'error') {
    return (
      <EmptyState
        icon={CircleAlertIcon}
        title="Couldn't read your library"
        message={copy.scanError}
        actionLabel="Try again"
        onAction={reload}
        testID="folders-error"
      />
    );
  }

  // Only the synthetic "All …" entry means no real folders were found.
  if (folders.length <= 1) {
    return (
      <EmptyState
        icon={scope === 'audio' ? MusicIcon : FilmIcon}
        title={copy.emptyTitle}
        message={copy.emptyMessage}
        actionLabel="Scan again"
        onAction={reload}
        testID="folders-empty"
      />
    );
  }

  const header = (
    <>
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
    <FlatList
      data={folders}
      keyExtractor={folder => folder.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primaryBright}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surfaceRaised}
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
  listContent: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.headline,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    color: colors.textPrimary,
  },
}));
