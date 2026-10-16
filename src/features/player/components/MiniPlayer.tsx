import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { IconButton } from '../../../shared/components/IconButton';
import {
  FilmIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  XIcon,
} from '../../../shared/icons';
import { useStore } from '../../../shared/storage/store';
import { radius, spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { clamp } from '../../../shared/utils/math';
import { useThumbnail } from '../../library/hooks/useThumbnail';
import { mediaTitle } from '../../library/services/mediaLibrary';
import type { VideoItem } from '../../library/types';
import {
  activePlaybackStore,
  nowPlayingStore,
  stopPlayback,
} from '../nowPlaying';
import { usePlaybackClock, type PlaybackClock } from '../playbackClock';

const ARTWORK_SIZE = 44;

interface MiniPlayerProps {
  /** Brings the full player back. */
  onOpen: () => void;
}

/** Bar above the tab bar while the player is minimised and still playing. */
export function MiniPlayer({ onOpen }: MiniPlayerProps) {
  const styles = useStyles();
  const minimised = useStore(
    nowPlayingStore,
    state => state.request !== null && state.presentation === 'mini',
  );
  const active = useStore(activePlaybackStore, state => state);
  if (!minimised || !active) {
    return null;
  }

  const { item, paused } = active;
  const title = mediaTitle(item);
  let subtitle: string;
  if (item.kind === 'audio') {
    subtitle = item.artist || 'Unknown artist';
  } else {
    subtitle = paused ? 'Paused' : 'Playing in the background';
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. Open player`}
        onPress={onOpen}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
        testID="mini-player"
      >
        <Artwork item={item} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <IconButton
          icon={paused ? PlayIcon : PauseIcon}
          accessibilityLabel={paused ? 'Play' : 'Pause'}
          onPress={active.togglePlayback}
          testID="mini-play-pause"
        />
        <IconButton
          icon={SkipForwardIcon}
          size="sm"
          accessibilityLabel="Next"
          onPress={active.next}
          disabled={!active.hasNext}
          testID="mini-next"
        />
        <IconButton
          icon={XIcon}
          size="sm"
          accessibilityLabel="Stop playback"
          onPress={stopPlayback}
          testID="mini-close"
        />
        <Progress clock={active.clock} duration={active.duration} />
      </Pressable>
    </View>
  );
}

function Artwork({ item }: { item: VideoItem }) {
  const styles = useStyles();
  const colors = useColors();
  const uri = useThumbnail(item);
  const Placeholder = item.kind === 'audio' ? MusicIcon : FilmIcon;
  return uri ? (
    <Image
      source={{ uri }}
      style={styles.artwork}
      fadeDuration={0}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View style={[styles.artwork, styles.placeholder]}>
      <Placeholder size={20} color={colors.textSecondary} strokeWidth={1.75} />
    </View>
  );
}

/** Thin progress line along the bottom edge; the only part redrawn on every tick. */
function Progress({
  clock,
  duration,
}: {
  clock: PlaybackClock;
  duration: number;
}) {
  const styles = useStyles();
  const { currentTime } = usePlaybackClock(clock);
  const fraction = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  return (
    <View style={styles.track} pointerEvents="none">
      <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  wrap: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
  },
  bar: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.divider,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: radius.sm,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  text: {
    flex: 1,
  },
  title: {
    ...typography.subheadlineStrong,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.fill,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
}));
