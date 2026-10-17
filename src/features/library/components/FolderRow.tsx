import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  CameraIcon,
  DownloadIcon,
  FilmIcon,
  FolderIcon,
  MusicIcon,
  VideoIcon,
  type IconComponent,
} from '../../../shared/icons';
import { radius, spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { useNewCount } from '../recentlyAdded';
import { formatMediaCount } from '../scopeCopy';
import type { VideoFolder } from '../types';
import { NewTag } from './NewTag';

const FOLDER_ROW_HEIGHT = 72;
const TILE_SIZE = 44;

const FOLDER_ICON_RULES: ReadonlyArray<[RegExp, IconComponent]> = [
  [/camera|dcim/i, CameraIcon],
  [/download/i, DownloadIcon],
  [/screen ?(record|cast)/i, VideoIcon],
  [/song|music/i, MusicIcon],
];

function folderIcon(folder: VideoFolder): IconComponent {
  if (folder.album === null) {
    return folder.scope === 'audio' ? MusicIcon : FilmIcon;
  }
  return (
    FOLDER_ICON_RULES.find(([pattern]) => pattern.test(folder.title))?.[1] ??
    FolderIcon
  );
}

interface FolderRowProps {
  folder: VideoFolder;
  onPress: (folder: VideoFolder) => void;
}

/**
 * A white card with icon, name and count, and a "new" tag while it holds unplayed new
 * files: the whole card opens the folder.
 */
export const FolderRow = memo(function FolderRowView({
  folder,
  onPress,
}: FolderRowProps) {
  const styles = useStyles();
  const colors = useColors();
  const Icon = folderIcon(folder);
  const newCount = useNewCount(folder.newIds);
  const subtitle =
    folder.count === null
      ? 'Entire library'
      : formatMediaCount(folder.count, folder.scope);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${folder.title}, ${subtitle}${
        newCount > 0 ? `, ${newCount} new` : ''
      }`}
      onPress={() => onPress(folder)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={`folder-${folder.id}`}
    >
      <View style={styles.tile}>
        <Icon size={22} color={colors.primaryText} strokeWidth={1.75} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {folder.title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {newCount > 0 ? (
        <NewTag count={newCount} testID={`folder-new-${folder.id}`} />
      ) : null}
    </Pressable>
  );
});

const useStyles = makeStyles(colors => ({
  card: {
    height: FOLDER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TILE_SIZE / 2,
    backgroundColor: colors.primarySoft,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
}));
