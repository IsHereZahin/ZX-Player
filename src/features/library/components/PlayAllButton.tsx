import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayIcon } from '../../../shared/icons';
import { colors, spacing } from '../../../shared/theme';

/** Floating action button that plays the current list from the top. */
export function PlayAllButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Play all"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: insets.bottom + spacing.xl,
          right: insets.right + spacing.xl,
        },
        pressed && styles.pressed,
      ]}
      testID="play-all"
    >
      <PlayIcon size={26} color={colors.onPrimary} fill={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    borderRadius: 30,
    backgroundColor: colors.primary,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
});
