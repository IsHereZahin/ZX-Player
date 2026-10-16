import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  CameraIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilmIcon,
  FolderIcon,
  MusicIcon,
  VideoIcon,
  type IconComponent,
} from '../../../shared/icons';
import { radius, spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { formatMediaCount } from '../scopeCopy';
import type { VideoFolder } from '../types';

export const FOLDER_ROW_HEIGHT = 72;

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

export const FolderRow = memo(function FolderRowView({
  folder,
  onPress,
}: FolderRowProps) {
  const styles = useStyles();
  const colors = useColors();
  const Icon = folderIcon(folder);
  const subtitle =
    folder.count === null
      ? 'Entire library'
      : formatMediaCount(folder.count, folder.scope);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${folder.title}, ${subtitle}`}
      onPress={() => onPress(folder)}
      android_ripple={{ color: colors.pressed }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`folder-${folder.id}`}
    >
      <View style={styles.tile}>
        <Icon size={24} color={colors.primaryText} strokeWidth={1.75} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {folder.title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <ChevronRightIcon size={20} color={colors.textMuted} />
    </Pressable>
  );
});

const useStyles = makeStyles(colors => ({
  row: {
    height: FOLDER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  tile: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
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
    ...typography.caption,
    color: colors.textSecondary,
  },
}));
