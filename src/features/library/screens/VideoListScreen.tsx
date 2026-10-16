import React, { useCallback, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import type { RootStackScreenProps } from '../../../app/navigation/types';
import { ScreenState } from '../../../shared/components/ScreenState';
import { colors, spacing } from '../../../shared/theme';
import { VIDEO_ROW_HEIGHT, VideoRow } from '../components/VideoRow';
import { useFolderVideos } from '../hooks/useFolderVideos';
import type { VideoItem } from '../types';

type Props = RootStackScreenProps<'VideoList'>;

export function VideoListScreen({ navigation, route }: Props) {
  const { folder } = route.params;
  const {
    videos,
    loadState,
    refreshing,
    loadingMore,
    loadMore,
    reload,
    refresh,
  } = useFolderVideos(folder);

  useLayoutEffect(() => {
    navigation.setOptions({ title: folder.title });
  }, [navigation, folder.title]);

  const openVideo = useCallback(
    (video: VideoItem) => navigation.navigate('Player', { video }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: VideoItem }) => (
      <VideoRow video={item} onPress={openVideo} />
    ),
    [openVideo],
  );

  if (loadState === 'loading') {
    return <ScreenState loading testID="videos-loading" />;
  }

  if (loadState === 'error') {
    return (
      <ScreenState
        title="Couldn't load this folder"
        message="Something went wrong while reading its videos."
        actionLabel="Try again"
        onAction={reload}
        testID="videos-error"
      />
    );
  }

  if (videos.length === 0) {
    return (
      <ScreenState
        title="This folder is empty"
        message="It no longer contains any videos."
        actionLabel="Refresh"
        onAction={reload}
        testID="videos-empty"
      />
    );
  }

  return (
    <FlatList
      data={videos}
      keyExtractor={video => video.id}
      renderItem={renderItem}
      getItemLayout={(_, index) => ({
        length: VIDEO_ROW_HEIGHT,
        offset: VIDEO_ROW_HEIGHT * index,
        index,
      })}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color={colors.accent} style={styles.footer} />
        ) : undefined
      }
      style={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      testID="videos-list"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
