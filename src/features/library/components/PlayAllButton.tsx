import React from 'react';
import { Pressable } from 'react-native';

import { useBottomInset } from '../../../app/navigation/useBottomInset';

import { PlayIcon } from '../../../shared/icons';
import { spacing } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';

const FAB_SIZE = 60;
const FAB_MARGIN = spacing.lg;

/**
 * Extra bottom padding (on top of useBottomInset) for a list under the button, so its last
 * row can scroll clear of it.
 */
export const FAB_CLEARANCE = FAB_SIZE + FAB_MARGIN + spacing.md;

/** Floating action button that plays the current list. */
export function PlayAllButton({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  const bottomInset = useBottomInset();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Play all"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: bottomInset + FAB_MARGIN,
          right: spacing.xl,
        },
        pressed && styles.pressed,
      ]}
      testID="play-all"
    >
      <PlayIcon size={26} color={colors.onAccent} fill={colors.onAccent} />
    </Pressable>
  );
}

const useStyles = makeStyles(colors => ({
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.accent,
    elevation: 6,
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: {
    opacity: 0.85,
  },
}));
