import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../../shared/components/IconButton';
import { EllipsisVerticalIcon } from '../../../shared/icons';
import { colors, radius, spacing, typography } from '../../../shared/theme';
import { useWatchEntry, watchProgress } from '../../history/watchHistory';
import type { VideoItem } from '../types';
import { describeVideo } from './videoMeta';
import { VideoThumbnail } from './VideoThumbnail';

interface VideoGridCardProps {
  video: VideoItem;
  width: number;
  onPress: (video: VideoItem) => void;
  onMore: (video: VideoItem) => void;
  highlighted?: boolean;
}

export const VideoGridCard = memo(function VideoGridCardView({
  video,
  width,
  onPress,
  onMore,
  highlighted = false,
}: VideoGridCardProps) {
  const entry = useWatchEntry(video.id);
  const { title, details, status } = describeVideo(video, entry);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(video)}
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed && styles.pressed,
      ]}
      testID={`video-${video.id}`}
    >
      <VideoThumbnail
        video={video}
        width={width}
        progress={watchProgress(entry)}
      />
      <View style={styles.info}>
        <View style={styles.text}>
          <Text
            style={[styles.title, highlighted && styles.titleHighlighted]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text style={styles.details} numberOfLines={1}>
            {status ?? details}
          </Text>
        </View>
        <IconButton
          icon={EllipsisVerticalIcon}
          size="sm"
          accessibilityLabel={`More options for ${title}`}
          onPress={() => onMore(video)}
          testID={`video-more-${video.id}`}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.8,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  titleHighlighted: {
    color: colors.primaryText,
  },
  details: {
    ...typography.label,
    fontWeight: '400',
    color: colors.textSecondary,
  },
});
