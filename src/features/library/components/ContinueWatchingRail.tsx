import React, { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import { formatTimeLeft } from '../../../shared/utils/format';
import { watchProgress, type WatchEntry } from '../../history/watchHistory';
import { mediaTitle } from '../services/mediaLibrary';
import { VideoThumbnail } from './VideoThumbnail';

const CARD_WIDTH = 208;

interface ContinueWatchingRailProps {
  /** e.g. "Continue watching" or "Continue listening". */
  title: string;
  entries: WatchEntry[];
  onPlay: (index: number) => void;
}

/** Horizontal strip of unfinished items at the top of the library. */
export function ContinueWatchingRail({
  title: heading,
  entries,
  onPlay,
}: ContinueWatchingRailProps) {
  const styles = useStyles();
  const renderItem = useCallback(
    ({ item, index }: { item: WatchEntry; index: number }) => {
      const title = mediaTitle(item.video);
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
    [onPlay, styles],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        {heading}
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

const useStyles = makeStyles(colors => ({
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
}));
