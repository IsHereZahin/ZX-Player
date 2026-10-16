import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import type { MainTabScreenProps } from '../../../app/navigation/types';
import { useOpenPlayer } from '../../../app/navigation/useOpenPlayer';
import { AppLogo } from '../../../shared/components/AppLogo';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import { ScreenHeader } from '../../../shared/components/ScreenHeader';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import { CircleAlertIcon, FilmIcon, SearchIcon } from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { isInProgress, useHistoryList } from '../../history/watchHistory';
import { ContinueWatchingRail } from '../components/ContinueWatchingRail';
import { FolderRow } from '../components/FolderRow';
import { PermissionGate } from '../components/PermissionGate';
import { useVideoFolders } from '../hooks/useVideoFolders';
import type { VideoFolder } from '../types';

const CONTINUE_WATCHING_LIMIT = 12;

type Props = MainTabScreenProps<'Library'>;

export function LibraryScreen({ navigation }: Props) {
  const styles = useStyles();
  const openFolder = useCallback(
    (folder: VideoFolder) => navigation.navigate('FolderVideos', { folder }),
    [navigation],
  );

  return (
    <View style={styles.screen} testID="library-screen">
      <ScreenHeader
        title="Library"
        leading={<AppLogo size={36} />}
        actions={
          <IconButton
            icon={SearchIcon}
            accessibilityLabel="Search videos"
            onPress={() => navigation.navigate('Search')}
            testID="open-search"
          />
        }
      />
      <PermissionGate>
        <FolderList onOpenFolder={openFolder} />
      </PermissionGate>
    </View>
  );
}

function FolderList({
  onOpenFolder,
}: {
  onOpenFolder: (folder: VideoFolder) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const { folders, loadState, refreshing, reload, refresh } = useVideoFolders();
  const history = useHistoryList();
  const openPlayer = useOpenPlayer();
  const continueEntries = useMemo(
    () => history.filter(isInProgress).slice(0, CONTINUE_WATCHING_LIMIT),
    [history],
  );

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
        message="Something went wrong while scanning for videos."
        actionLabel="Try again"
        onAction={reload}
        testID="folders-error"
      />
    );
  }

  // Only the synthetic "All videos" entry means no real folders were found.
  if (folders.length <= 1) {
    return (
      <EmptyState
        icon={FilmIcon}
        title="No videos yet"
        message="Videos you record, download or copy to this device will show up here."
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
