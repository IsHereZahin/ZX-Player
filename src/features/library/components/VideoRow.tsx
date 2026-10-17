import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IconButton } from '../../../shared/components/IconButton';
import { EllipsisVerticalIcon } from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { formatDuration } from '../../../shared/utils/format';
import { useWatchEntry, watchProgress } from '../../history/watchHistory';
import { isNewItem } from '../recentlyAdded';
import type { VideoItem } from '../types';
import { NewTag } from './NewTag';
import { SelectionMark } from './SelectionMark';
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
  /** Defaults to opening the menu; lists that can select use it to start selecting. */
  onLongPress?: (video: VideoItem) => void;
  /** While selecting, a check replaces the menu button and a press toggles the item. */
  selecting?: boolean;
  selected?: boolean;
  /** Replaces the watch status line, e.g. when a file in the recycle bin expires. */
  note?: string;
}

export const VideoRow = memo(function VideoRowView({
  video,
  onPress,
  onMore,
  highlighted = false,
  onLongPress = onMore,
  selecting = false,
  selected = false,
  note,
}: VideoRowProps) {
  const styles = useStyles();
  const colors = useColors();
  const entry = useWatchEntry(video.id);
  const isNew = isNewItem(video, entry);
  const { title, details, status } = describeVideo(video, entry);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isNew ? 'New, ' : ''}${title}, ${formatDuration(
        video.durationSec,
      )}${status ? `, ${status}` : ''}`}
      accessibilityState={selecting ? { selected } : undefined}
      onPress={() => onPress(video)}
      onLongPress={() => onLongPress(video)}
      delayLongPress={350}
      android_ripple={{ color: colors.pressed }}
      style={({ pressed }) => [
        styles.row,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
      testID={`video-${video.id}`}
    >
      <VideoThumbnail
        video={video}
        width={THUMBNAIL_WIDTH}
        progress={watchProgress(entry)}
      />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          {isNew ? <NewTag testID={`new-mark-${video.id}`} /> : null}
          <Text
            style={[styles.title, highlighted && styles.titleHighlighted]}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        {details ? (
          <Text style={styles.details} numberOfLines={1}>
            {details}
          </Text>
        ) : null}
        {note ? (
          <Text style={styles.note} numberOfLines={1}>
            {note}
          </Text>
        ) : status ? (
          <Text style={styles.status} numberOfLines={1}>
            {status}
          </Text>
        ) : null}
      </View>
      {selecting ? (
        <View style={styles.mark}>
          <SelectionMark selected={selected} />
        </View>
      ) : (
        <IconButton
          icon={EllipsisVerticalIcon}
          size="sm"
          accessibilityLabel={`More options for ${title}`}
          onPress={() => onMore(video)}
          testID={`video-more-${video.id}`}
        />
      )}
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
  pressed: {
    backgroundColor: colors.pressed,
  },
  selected: {
    backgroundColor: colors.accentSoft,
  },
  mark: {
    width: 36,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
    flexShrink: 1,
    color: colors.textPrimary,
  },
  titleHighlighted: {
    color: colors.accentText,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  details: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  status: {
    ...typography.captionStrong,
    color: colors.accentText,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
  },
}));
