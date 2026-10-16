import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../../shared/theme';
import { formatDuration } from '../../../shared/utils/format';
import { useThumbnail } from '../hooks/useThumbnail';
import type { VideoItem } from '../types';

interface VideoThumbnailProps {
  video: VideoItem;
  width: number;
}

export function VideoThumbnail({ video, width }: VideoThumbnailProps) {
  const uri = useThumbnail(video);
  const [failed, setFailed] = useState(false);
  const height = Math.round((width * 9) / 16);

  useEffect(() => setFailed(false), [uri]);

  return (
    <View style={[styles.frame, { width, height }]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.placeholder} testID="thumbnail-placeholder">
          <View style={styles.playGlyph} />
        </View>
      )}
      {video.durationSec > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {formatDuration(video.durationSec)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // CSS-triangle play glyph; avoids pulling in an icon font for one shape.
  playGlyph: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.textSecondary,
  },
  badge: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: fontSize.caption - 1,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
