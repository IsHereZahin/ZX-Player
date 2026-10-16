import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import type { RootStackScreenProps } from '../../../app/navigation/types';
import { ScreenState } from '../../../shared/components/ScreenState';
import { colors } from '../../../shared/theme';
import { FOLDER_ROW_HEIGHT, FolderRow } from '../components/FolderRow';
import { PermissionGate } from '../components/PermissionGate';
import { useVideoFolders } from '../hooks/useVideoFolders';
import type { VideoFolder } from '../types';

type Props = RootStackScreenProps<'Folders'>;

export function FoldersScreen({ navigation }: Props) {
  const openFolder = useCallback(
    (folder: VideoFolder) => navigation.navigate('VideoList', { folder }),
    [navigation],
  );

  return (
    <PermissionGate>
      <FolderList onOpenFolder={openFolder} />
    </PermissionGate>
  );
}

function FolderList({
  onOpenFolder,
}: {
  onOpenFolder: (folder: VideoFolder) => void;
}) {
  const { folders, loadState, refreshing, reload, refresh } = useVideoFolders();

  const renderItem = useCallback(
    ({ item }: { item: VideoFolder }) => (
      <FolderRow folder={item} onPress={onOpenFolder} />
    ),
    [onOpenFolder],
  );

  if (loadState === 'loading') {
    return <ScreenState loading testID="folders-loading" />;
  }

  if (loadState === 'error') {
    return (
      <ScreenState
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
      <ScreenState
        title="No videos yet"
        message="Videos you record, download or copy to this device will show up here."
        actionLabel="Scan again"
        onAction={reload}
        testID="folders-empty"
      />
    );
  }

  return (
    <FlatList
      data={folders}
      keyExtractor={folder => folder.id}
      renderItem={renderItem}
      getItemLayout={(_, index) => ({
        length: FOLDER_ROW_HEIGHT,
        offset: FOLDER_ROW_HEIGHT * index,
        index,
      })}
      style={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      testID="folders-list"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
