import React, { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import { mediaTitle } from '../services/mediaLibrary';
import type { VideoItem } from '../types';
import { VideoThumbnail } from './VideoThumbnail';

const CARD_WIDTH = 224;

interface MediaShelfProps {
  /** e.g. "Continue watching" or "Recently Added". */
  title: string;
  items: VideoItem[];
  /** Line under each card's title, e.g. time left or when it was added. */
  caption: (item: VideoItem) => string | null;
  /** Watched fraction drawn on the artwork. */
  progress?: (item: VideoItem) => number;
  onPlay: (index: number) => void;
  onSeeAll?: () => void;
  /** testID of the shelf; cards get `${testID}-${item.id}`. */
  testID: string;
}

/** Horizontal shelf of large cards, as in the TV and Music apps. */
export function MediaShelf({
  title: heading,
  items,
  caption,
  progress,
  onPlay,
  onSeeAll,
  testID,
}: MediaShelfProps) {
  const styles = useStyles();
  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) => {
      const title = mediaTitle(item);
      const subtitle = caption(item);
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
          onPress={() => onPlay(index)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          testID={`${testID}-${item.id}`}
        >
          <VideoThumbnail
            video={item}
            width={CARD_WIDTH}
            progress={progress?.(item)}
          />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.caption}>{subtitle}</Text> : null}
        </Pressable>
      );
    },
    [caption, onPlay, progress, styles, testID],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading} accessibilityRole="header">
          {heading}
        </Text>
        {onSeeAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See all ${heading}`}
            onPress={onSeeAll}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
            testID={`${testID}-see-all`}
          >
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        testID={testID}
      />
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  container: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm + 2,
  },
  heading: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  seeAll: {
    ...typography.body,
    color: colors.primaryText,
  },
  list: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    ...typography.subheadlineStrong,
    marginTop: spacing.sm,
    color: colors.textPrimary,
  },
  caption: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
}));
