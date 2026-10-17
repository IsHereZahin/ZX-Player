import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IconButton } from '../../../shared/components/IconButton';
import { EllipsisVerticalIcon } from '../../../shared/icons';
import { radius, spacing, typography } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import { useWatchEntry, watchProgress } from '../../history/watchHistory';
import { isNewItem } from '../recentlyAdded';
import type { VideoItem } from '../types';
import { NewTag } from './NewTag';
import { SelectionMark } from './SelectionMark';
import { describeVideo } from './videoMeta';
import { VideoThumbnail } from './VideoThumbnail';

interface VideoGridCardProps {
  video: VideoItem;
  width: number;
  onPress: (video: VideoItem) => void;
  onMore: (video: VideoItem) => void;
  highlighted?: boolean;
  /** Defaults to opening the menu; lists that can select use it to start selecting. */
  onLongPress?: (video: VideoItem) => void;
  selecting?: boolean;
  selected?: boolean;
}

export const VideoGridCard = memo(function VideoGridCardView({
  video,
  width,
  onPress,
  onMore,
  highlighted = false,
  onLongPress = onMore,
  selecting = false,
  selected = false,
}: VideoGridCardProps) {
  const styles = useStyles();
  const entry = useWatchEntry(video.id);
  const isNew = isNewItem(video, entry);
  const { title, details, status } = describeVideo(video, entry);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isNew ? `New, ${title}` : title}
      accessibilityState={selecting ? { selected } : undefined}
      onPress={() => onPress(video)}
      onLongPress={() => onLongPress(video)}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed && styles.pressed,
      ]}
      testID={`video-${video.id}`}
    >
      <View>
        <VideoThumbnail
          video={video}
          width={width}
          progress={watchProgress(entry)}
        />
        {isNew ? (
          <View style={styles.newTag}>
            <NewTag testID={`new-mark-${video.id}`} />
          </View>
        ) : null}
        {selecting ? (
          <View style={styles.mark}>
            <SelectionMark selected={selected} />
          </View>
        ) : null}
      </View>
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
        {selecting ? null : (
          <IconButton
            icon={EllipsisVerticalIcon}
            size="sm"
            accessibilityLabel={`More options for ${title}`}
            onPress={() => onMore(video)}
            testID={`video-more-${video.id}`}
          />
        )}
      </View>
    </Pressable>
  );
});

const useStyles = makeStyles(colors => ({
  card: {
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.7,
  },
  newTag: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  mark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
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
    ...typography.footnoteStrong,
    color: colors.textPrimary,
  },
  titleHighlighted: {
    color: colors.accentText,
  },
  details: {
    ...typography.caption,
    color: colors.textSecondary,
  },
}));
