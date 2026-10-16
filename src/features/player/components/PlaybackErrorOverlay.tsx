import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { CircleAlertIcon } from '../../../shared/icons';
import { playerColors, spacing, typography } from '../../../shared/theme';
import type { PlaybackError } from '../hooks/usePlayback';

interface PlaybackErrorOverlayProps {
  error: PlaybackError;
  hasNext: boolean;
  onRetry: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function PlaybackErrorOverlay({
  error,
  hasNext,
  onRetry,
  onNext,
  onBack,
}: PlaybackErrorOverlayProps) {
  return (
    <View style={styles.overlay} testID="playback-error">
      <CircleAlertIcon
        size={40}
        color={playerColors.danger}
        strokeWidth={1.75}
      />
      <Text style={styles.message} accessibilityRole="alert">
        {error.message}
      </Text>
      {error.detail ? (
        <Text style={styles.detail} numberOfLines={3}>
          {error.detail}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label="Back" variant="secondary" onPress={onBack} />
        {hasNext ? (
          <Button label="Next video" variant="secondary" onPress={onNext} />
        ) : null}
        <Button label="Try again" onPress={onRetry} testID="playback-retry" />
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
    padding: spacing.xxxl,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
  },
  message: {
    ...typography.headline,
    color: playerColors.white,
    textAlign: 'center',
  },
  detail: {
    ...typography.caption,
    maxWidth: 480,
    color: playerColors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
