import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MusicIcon } from '../../../shared/icons';
import {
  playerColors,
  radius,
  spacing,
  typography,
} from '../../../shared/theme';
import { useThumbnail } from '../../library/hooks/useThumbnail';
import { mediaTitle } from '../../library/services/mediaLibrary';
import type { VideoItem } from '../../library/types';
import type { Size } from '../utils/aspectRatio';

/** Room kept free below the artwork for the audio transport and seek bar. */
const AUDIO_CONTROLS_HEIGHT = 190;
const TOP_BAR_HEIGHT = 64;
const TEXT_BLOCK_HEIGHT = 72;
const MAX_ART_SIZE = 340;
/** Below this the cover is left out (e.g. a phone in landscape) and only text shows. */
const MIN_ART_SIZE = 96;

interface AudioArtworkProps {
  item: VideoItem;
  layout: Size;
}

/** What the player shows for audio: blurred backdrop, cover art, title and artist. */
export function AudioArtwork({ item, layout }: AudioArtworkProps) {
  const insets = useSafeAreaInsets();
  const art = useThumbnail(item);
  const top = insets.top + TOP_BAR_HEIGHT;
  const bottom = insets.bottom + AUDIO_CONTROLS_HEIGHT;
  const available = layout.height - top - bottom - TEXT_BLOCK_HEIGHT;
  const artSize = Math.min(layout.width * 0.72, available, MAX_ART_SIZE);
  const subtitle = [item.artist, item.album].filter(Boolean).join(' · ');

  return (
    <View style={styles.layer} pointerEvents="none" testID="audio-artwork">
      {art ? (
        <Image
          source={{ uri: art }}
          style={styles.backdrop}
          resizeMode="cover"
          blurRadius={40}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View
        style={[styles.content, { paddingTop: top, paddingBottom: bottom }]}
      >
        {artSize >= MIN_ART_SIZE ? (
          art ? (
            <Image
              source={{ uri: art }}
              style={[styles.cover, { width: artSize, height: artSize }]}
              accessibilityIgnoresInvertColors
              testID="audio-cover"
            />
          ) : (
            <View
              style={[
                styles.cover,
                styles.placeholder,
                { width: artSize, height: artSize },
              ]}
            >
              <MusicIcon
                size={artSize * 0.34}
                color={playerColors.primaryText}
                strokeWidth={1.5}
              />
            </View>
          )
        ) : null}
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>
            {mediaTitle(item)}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: playerColors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  cover: {
    borderRadius: radius.lg,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: playerColors.primarySoft,
  },
  text: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.title2,
    color: playerColors.white,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: playerColors.textSecondary,
    textAlign: 'center',
  },
});
