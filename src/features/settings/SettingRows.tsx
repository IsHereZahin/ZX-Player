import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ChevronRightIcon, type IconComponent } from '../../shared/icons';
import { colors, radius, spacing, typography } from '../../shared/theme';

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

interface RowBaseProps {
  icon: IconComponent;
  title: string;
  description?: string;
  destructive?: boolean;
}

function RowContent({
  icon: Icon,
  title,
  description,
  destructive,
}: RowBaseProps) {
  return (
    <>
      <View style={[styles.iconTile, destructive && styles.iconTileDanger]}>
        <Icon
          size={18}
          color={destructive ? colors.danger : colors.primaryText}
        />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, destructive && styles.titleDanger]}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
    </>
  );
}

interface SwitchRowProps extends RowBaseProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}

export function SettingSwitchRow({
  value,
  onValueChange,
  testID,
  ...content
}: SwitchRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={content.title}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      <RowContent {...content} />
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceHigh, true: colors.primary }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.surfaceHigh}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

interface ActionRowProps extends RowBaseProps {
  value?: string;
  onPress: () => void;
  testID?: string;
}

/** Row that opens a picker (shows the current value) or performs an action. */
export function SettingActionRow({
  value,
  onPress,
  testID,
  ...content
}: ActionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${content.title}, ${value}` : content.title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      <RowContent {...content} />
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {content.destructive ? null : (
        <ChevronRightIcon size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.overline,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    color: colors.textMuted,
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  iconTile: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  iconTileDanger: {
    backgroundColor: colors.dangerSoft,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  titleDanger: {
    color: colors.danger,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.caption,
    color: colors.primaryText,
  },
});
