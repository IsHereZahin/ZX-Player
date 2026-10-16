import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { colors, fontSize, spacing } from '../../../shared/theme';
import type { PlaybackError } from '../hooks/usePlayback';
import { ControlButton } from './ControlButton';

interface PlaybackErrorOverlayProps {
  error: PlaybackError;
  onRetry: () => void;
  onBack: () => void;
}

export function PlaybackErrorOverlay({
  error,
  onRetry,
  onBack,
}: PlaybackErrorOverlayProps) {
  return (
    <View style={styles.overlay} testID="playback-error">
      <Text style={styles.message} accessibilityRole="alert">
        {error.message}
      </Text>
      {error.detail ? (
        <Text style={styles.detail} numberOfLines={3}>
          {error.detail}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <ControlButton
          accessibilityLabel="Back to library"
          label="Back"
          onPress={onBack}
        />
        <PrimaryButton
          label="Try again"
          onPress={onRetry}
          testID="playback-retry"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  message: {
    color: colors.textPrimary,
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    textAlign: 'center',
  },
  detail: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
});
