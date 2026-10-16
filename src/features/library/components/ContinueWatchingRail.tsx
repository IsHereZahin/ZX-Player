import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { formatTimeLeft } from '../../../shared/utils/format';
import { watchProgress, type WatchEntry } from '../../history/watchHistory';
import { describeFileName } from '../services/mediaLibrary';
import { VideoThumbnail } from './VideoThumbnail';

const CARD_WIDTH = 208;

interface ContinueWatchingRailProps {
  entries: WatchEntry[];
  onPlay: (index: number) => void;
}

/** Horizontal strip of unfinished videos at the top of the library. */
export function ContinueWatchingRail({
  entries,
  onPlay,
}: ContinueWatchingRailProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: WatchEntry; index: number }) => {
      const { title } = describeFileName(item.video.fileName);
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue ${title}`}
          onPress={() => onPlay(index)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          testID={`continue-${item.video.id}`}
        >
          <VideoThumbnail
            video={item.video}
            width={CARD_WIDTH}
            progress={watchProgress(item)}
          />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.caption}>
            {formatTimeLeft(item.durationSec - item.positionSec)}
          </Text>
        </Pressable>
      );
    },
    [onPlay],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        Continue watching
      </Text>
      <FlatList
        horizontal
        data={entries}
        keyExtractor={entry => entry.video.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        testID="continue-watching"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  heading: {
    ...typography.headline,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    color: colors.textPrimary,
  },
  list: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: CARD_WIDTH,
  },
  pressed: {
    opacity: 0.8,
  },
  title: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.sm,
    color: colors.textPrimary,
  },
  caption: {
    ...typography.label,
    marginTop: 2,
    color: colors.primaryText,
  },
});
