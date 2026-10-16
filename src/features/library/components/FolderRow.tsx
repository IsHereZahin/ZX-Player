import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../../shared/theme';
import { formatVideoCount } from '../../../shared/utils/format';
import type { VideoFolder } from '../types';

export const FOLDER_ROW_HEIGHT = 72;

interface FolderRowProps {
  folder: VideoFolder;
  onPress: (folder: VideoFolder) => void;
}

export const FolderRow = memo(function FolderRowView({
  folder,
  onPress,
}: FolderRowProps) {
  const subtitle =
    folder.count === null ? 'Entire library' : formatVideoCount(folder.count);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${folder.title}, ${subtitle}`}
      onPress={() => onPress(folder)}
      android_ripple={{ color: colors.surfaceRaised }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`folder-${folder.id}`}
    >
      <View style={styles.icon}>
        <View style={styles.iconTab} />
        <View style={styles.iconBody} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {folder.title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron} importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: FOLDER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  icon: {
    width: 44,
    height: 36,
    justifyContent: 'flex-end',
  },
  iconTab: {
    width: 18,
    height: 6,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
  iconBody: {
    height: 30,
    borderRadius: radius.sm,
    borderTopLeftRadius: 0,
    backgroundColor: colors.accent,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.subtitle,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 28,
  },
});
