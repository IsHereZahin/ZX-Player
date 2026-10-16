import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGroupedRowStyle } from '../../../shared/components/GroupedList';
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
import { spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { formatMediaCount } from '../scopeCopy';
import type { VideoFolder } from '../types';

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
  /** Position in the grouped card, for its rounded corners and separators. */
  index: number;
  count: number;
}

/** Row in the Folders card, like a folder in the Files app. */
export const FolderRow = memo(function FolderRowView({
  folder,
  onPress,
  index,
  count,
}: FolderRowProps) {
  const styles = useStyles();
  const colors = useColors();
  const groupedRow = useGroupedRowStyle();
  const Icon = folderIcon(folder);
  const subtitle =
    folder.count === null
      ? 'Entire library'
      : formatMediaCount(folder.count, folder.scope);

  return (
    <View style={groupedRow(index, count)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${folder.title}, ${subtitle}`}
        onPress={() => onPress(folder)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID={`folder-${folder.id}`}
      >
        <Icon size={26} color={colors.primaryText} strokeWidth={1.6} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {folder.title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <ChevronRightIcon
          size={18}
          color={colors.textMuted}
          strokeWidth={2.5}
        />
      </Pressable>
      {index < count - 1 ? <View style={styles.separator} /> : null}
    </View>
  );
});

const useStyles = makeStyles(colors => ({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  text: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 26 + spacing.md + 2,
    backgroundColor: colors.divider,
  },
}));
