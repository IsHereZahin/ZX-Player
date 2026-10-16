import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../../shared/components/IconButton';
import { EllipsisIcon, HeartIcon } from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { formatDuration } from '../../../shared/utils/format';
import { useWatchEntry, watchProgress } from '../../history/watchHistory';
import { useIsFavorite } from '../favorites';
import { isNewItem } from '../recentlyAdded';
import type { VideoItem } from '../types';
import { describeVideo } from './videoMeta';
import { VideoThumbnail } from './VideoThumbnail';

const THUMBNAIL_WIDTH = 120;
export const VIDEO_ROW_HEIGHT = 92;
/** Separators start under the text, as in iOS lists. */
const SEPARATOR_INSET = spacing.lg + THUMBNAIL_WIDTH + spacing.md;

interface VideoRowProps {
  video: VideoItem;
  onPress: (video: VideoItem) => void;
  onMore: (video: VideoItem) => void;
  /** Marks the most recently played video. */
  highlighted?: boolean;
  /** Draws the hairline under the row (all but the last of a list). */
  separator?: boolean;
}

export const VideoRow = memo(function VideoRowView({
  video,
  onPress,
  onMore,
  highlighted = false,
  separator = false,
}: VideoRowProps) {
  const styles = useStyles();
  const colors = useColors();
  const entry = useWatchEntry(video.id);
  const favorite = useIsFavorite(video.id);
  const isNew = isNewItem(video, entry);
  const { title, details, status } = describeVideo(video, entry);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isNew ? 'New, ' : ''}${title}, ${formatDuration(
        video.durationSec,
      )}${status ? `, ${status}` : ''}`}
      onPress={() => onPress(video)}
      onLongPress={() => onMore(video)}
      delayLongPress={350}
      android_ripple={{ color: colors.pressed }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`video-${video.id}`}
    >
      <VideoThumbnail
        video={video}
        width={THUMBNAIL_WIDTH}
        progress={watchProgress(entry)}
      />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          {isNew ? (
            <View style={styles.newDot} testID={`new-mark-${video.id}`} />
          ) : null}
          <Text
            style={[styles.title, highlighted && styles.titleHighlighted]}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        {details || favorite ? (
          <View style={styles.detailsRow}>
            {favorite ? (
              <View
                accessibilityLabel="Favorite"
                testID={`favorite-mark-${video.id}`}
              >
                <HeartIcon size={11} color={colors.pink} fill={colors.pink} />
              </View>
            ) : null}
            <Text style={styles.details} numberOfLines={1}>
              {details}
            </Text>
          </View>
        ) : null}
        {status ? (
          <Text style={styles.status} numberOfLines={1}>
            {status}
          </Text>
        ) : null}
      </View>
      <IconButton
        icon={EllipsisIcon}
        size="sm"
        variant="plain"
        accessibilityLabel={`More options for ${title}`}
        onPress={() => onMore(video)}
        testID={`video-more-${video.id}`}
      />
      {separator ? <View style={styles.separator} /> : null}
    </Pressable>
  );
});

const useStyles = makeStyles(colors => ({
  row: {
    height: VIDEO_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  separator: {
    position: 'absolute',
    left: SEPARATOR_INSET,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.subheadlineStrong,
    flexShrink: 1,
    color: colors.textPrimary,
  },
  titleHighlighted: {
    color: colors.primaryText,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  details: {
    flexShrink: 1,
    ...typography.footnote,
    color: colors.textSecondary,
  },
  status: {
    ...typography.captionStrong,
    color: colors.primaryText,
  },
}));
