import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../../shared/components/IconButton';
import { EllipsisVerticalIcon } from '../../../shared/icons';
import { colors, spacing, typography } from '../../../shared/theme';
import { formatDuration } from '../../../shared/utils/format';
import { useWatchEntry, watchProgress } from '../../history/watchHistory';
import type { VideoItem } from '../types';
import { describeVideo } from './videoMeta';
import { VideoThumbnail } from './VideoThumbnail';

const THUMBNAIL_WIDTH = 136;
export const VIDEO_ROW_HEIGHT = 100;

interface VideoRowProps {
  video: VideoItem;
  onPress: (video: VideoItem) => void;
  onMore: (video: VideoItem) => void;
  /** Marks the most recently played video. */
  highlighted?: boolean;
}

export const VideoRow = memo(function VideoRowView({
  video,
  onPress,
  onMore,
  highlighted = false,
}: VideoRowProps) {
  const entry = useWatchEntry(video.id);
  const { title, details, status } = describeVideo(video, entry);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatDuration(video.durationSec)}${
        status ? `, ${status}` : ''
      }`}
      onPress={() => onPress(video)}
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
        <Text
          style={[styles.title, highlighted && styles.titleHighlighted]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {details ? (
          <Text style={styles.details} numberOfLines={1}>
            {details}
          </Text>
        ) : null}
        {status ? (
          <Text style={styles.status} numberOfLines={1}>
            {status}
          </Text>
        ) : null}
      </View>
      <IconButton
        icon={EllipsisVerticalIcon}
        size="sm"
        accessibilityLabel={`More options for ${title}`}
        onPress={() => onMore(video)}
        testID={`video-more-${video.id}`}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: VIDEO_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  titleHighlighted: {
    color: colors.primaryText,
  },
  details: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  status: {
    ...typography.label,
    color: colors.primaryText,
  },
});
