import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { IconComponent } from '../icons';
import { colors, radius, spacing, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconComponent;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.onPrimary,
  secondary: colors.textPrimary,
  ghost: colors.primaryText,
  danger: colors.danger,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  style,
  testID,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && pressedStyles[variant],
        style,
      ]}
    >
      {Icon ? (
        <Icon size={18} color={TEXT_COLOR[variant]} strokeWidth={2.25} />
      ) : null}
      <Text style={[styles.label, { color: TEXT_COLOR[variant] }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceHigh },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.dangerSoft },
  label: {
    ...typography.bodyStrong,
  },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.border },
  ghost: { backgroundColor: colors.primarySoft },
  danger: { backgroundColor: 'rgba(248, 113, 113, 0.24)' },
});
