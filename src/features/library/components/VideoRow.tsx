import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../../../shared/theme';
import { formatBytes, formatDuration } from '../../../shared/utils/format';
import { describeFileName } from '../services/mediaLibrary';
import type { VideoItem } from '../types';
import { VideoThumbnail } from './VideoThumbnail';

const THUMBNAIL_WIDTH = 128;
const ROW_VERTICAL_PADDING = spacing.sm;
export const VIDEO_ROW_HEIGHT =
  Math.round((THUMBNAIL_WIDTH * 9) / 16) + ROW_VERTICAL_PADDING * 2;

interface VideoRowProps {
  video: VideoItem;
  onPress: (video: VideoItem) => void;
}

export const VideoRow = memo(function VideoRowView({
  video,
  onPress,
}: VideoRowProps) {
  const { title, extension } = describeFileName(video.fileName);
  const resolution =
    video.width > 0 && video.height > 0
      ? `${video.width}×${video.height}`
      : null;
  const details = [extension, formatBytes(video.sizeBytes), resolution]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatDuration(video.durationSec)}`}
      onPress={() => onPress(video)}
      android_ripple={{ color: colors.surfaceRaised }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`video-${video.id}`}
    >
      <VideoThumbnail video={video} width={THUMBNAIL_WIDTH} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {details ? (
          <Text style={styles.details} numberOfLines={1}>
            {details}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: VIDEO_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: ROW_VERTICAL_PADDING,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  details: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
});
