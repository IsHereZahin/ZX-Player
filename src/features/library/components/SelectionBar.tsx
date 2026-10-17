import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useBottomInset } from '../../../app/navigation/useBottomInset';
import { FrostedBackground } from '../../../shared/components/FrostedBackground';
import type { IconComponent } from '../../../shared/icons';
import { radius, spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';

export interface SelectionAction {
  label: string;
  icon: IconComponent;
  onPress: () => void;
  destructive?: boolean;
  testID: string;
}

/** Floating, frosted bar of actions for the selected items, just above the tab bar. */
export function SelectionBar({ actions }: { actions: SelectionAction[] }) {
  const styles = useStyles();
  const colors = useColors();
  const bottom = useBottomInset();
  return (
    <View
      style={[styles.wrap, { bottom: bottom + spacing.md }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} testID="selection-bar">
        <FrostedBackground />
        {actions.map(({ label, icon: Icon, onPress, destructive, testID }) => {
          const color = destructive ? colors.danger : colors.textPrimary;
          return (
            <Pressable
              key={testID}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed,
              ]}
              testID={testID}
            >
              <Icon size={20} color={color} strokeWidth={1.75} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    // A translucent view casts its elevation shadow through itself on Android.
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: colors.black,
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
        }
      : null),
  },
  action: {
    minWidth: 72,
    alignItems: 'center',
    gap: spacing.xxs + 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  label: {
    ...typography.caption2,
  },
}));
