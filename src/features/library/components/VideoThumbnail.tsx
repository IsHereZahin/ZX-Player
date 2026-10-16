import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../../../shared/components/ProgressBar';
import { FilmIcon, MusicIcon } from '../../../shared/icons';
import { radius, spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { formatDuration } from '../../../shared/utils/format';
import { useThumbnail } from '../hooks/useThumbnail';
import type { VideoItem } from '../types';

interface VideoThumbnailProps {
  video: VideoItem;
  width: number;
  /** Watched fraction (0–1); a bar is drawn along the bottom when above zero. */
  progress?: number;
}

export function VideoThumbnail({
  video,
  width,
  progress = 0,
}: VideoThumbnailProps) {
  const styles = useStyles();
  const colors = useColors();
  const uri = useThumbnail(video);
  const [failed, setFailed] = useState(false);
  const height = Math.round((width * 9) / 16);
  // Album art is square: it sits centred in the same 16:9 slot so mixed lists line up.
  const isAudio = video.kind === 'audio';
  const PlaceholderIcon = isAudio ? MusicIcon : FilmIcon;

  useEffect(() => setFailed(false), [uri]);

  return (
    <View style={[styles.frame, { width, height }]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={
            isAudio
              ? [styles.albumArt, { width: height, height }]
              : StyleSheet.absoluteFill
          }
          resizeMode="cover"
          // Android fades every image in over 300 ms, which reads as lag while scrolling.
          fadeDuration={0}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.placeholder} testID="thumbnail-placeholder">
          <PlaceholderIcon
            size={Math.min(28, width / 5)}
            color={colors.textMuted}
            strokeWidth={1.5}
          />
        </View>
      )}
      {video.durationSec > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {formatDuration(video.durationSec)}
          </Text>
        </View>
      ) : null}
      {progress > 0 ? (
        <ProgressBar
          progress={progress}
          trackColor="rgba(0, 0, 0, 0.55)"
          style={styles.progress}
          testID="thumbnail-progress"
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  frame: {
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  albumArt: {
    alignSelf: 'center',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: spacing.xs + 2,
    bottom: spacing.xs + 4,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  badgeText: {
    ...typography.label,
    fontSize: 11,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  progress: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
}));
