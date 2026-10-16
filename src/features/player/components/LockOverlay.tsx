import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '../../../shared/components/IconButton';
import { LockOpenIcon } from '../../../shared/icons';
import {
  playerColors,
  radius,
  spacing,
  typography,
} from '../../../shared/theme';

/** Shown briefly after a tap while the screen is locked; the only way out of lock mode. */
export function LockOverlay({ onUnlock }: { onUnlock: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={[
          styles.unlock,
          { left: Math.max(insets.left, spacing.lg) + spacing.sm },
        ]}
        pointerEvents="box-none"
      >
        <IconButton
          icon={LockOpenIcon}
          variant="filled"
          accessibilityLabel="Unlock controls"
          onPress={onUnlock}
          testID="unlock-button"
        />
      </View>
      <View
        style={[styles.hintLayer, { top: insets.top + spacing.xl }]}
        pointerEvents="none"
      >
        <Text style={styles.hint}>
          Screen locked · Tap the button to unlock
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  unlock: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  hintLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    ...typography.captionStrong,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: playerColors.playerChip,
    color: playerColors.white,
  },
});
