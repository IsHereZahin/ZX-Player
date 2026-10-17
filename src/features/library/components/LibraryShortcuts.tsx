import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import {
  HeartIcon,
  ListMusicIcon,
  SparklesIcon,
  Trash2Icon,
  type IconComponent,
} from '../../../shared/icons';
import { font, radius, spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';

interface LibraryShortcutsProps {
  onOpenFavorites: () => void;
  onOpenRecentlyAdded: () => void;
  onOpenPlaylists: () => void;
  /** Only where Android has a recycle bin (11+). */
  onOpenRecycleBin?: () => void;
}

interface Shortcut {
  label: string;
  icon: IconComponent;
  onPress: () => void;
  testID: string;
}

/**
 * One line of small chips under the library header: the collections stay a tap away
 * without pushing the folders down. Scrolls sideways when the screen is too narrow.
 */
export function LibraryShortcuts({
  onOpenFavorites,
  onOpenRecentlyAdded,
  onOpenPlaylists,
  onOpenRecycleBin,
}: LibraryShortcutsProps) {
  const styles = useStyles();
  const colors = useColors();
  const shortcuts: Shortcut[] = [
    {
      label: 'Favorites',
      icon: HeartIcon,
      onPress: onOpenFavorites,
      testID: 'open-favorites',
    },
    {
      label: 'Recently Added',
      icon: SparklesIcon,
      onPress: onOpenRecentlyAdded,
      testID: 'open-recently-added',
    },
    {
      label: 'Playlists',
      icon: ListMusicIcon,
      onPress: onOpenPlaylists,
      testID: 'open-playlists',
    },
  ];
  if (onOpenRecycleBin) {
    shortcuts.push({
      label: 'Recycle Bin',
      icon: Trash2Icon,
      onPress: onOpenRecycleBin,
      testID: 'open-recycle-bin',
    });
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {shortcuts.map(({ label, icon: Icon, onPress, testID }) => (
        <Pressable
          key={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          testID={testID}
        >
          <Icon size={16} color={colors.textPrimary} strokeWidth={1.75} />
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles(colors => ({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  chip: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  label: {
    ...typography.footnote,
    ...font('medium', 13),
    color: colors.textPrimary,
  },
}));
