import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import type { IconComponent } from '../icons';
import { radius, spacing, typography, type ColorTokens } from '../theme';
import { makeStyles, useColors } from '../theming';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconComponent;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function textColor(colors: ColorTokens, variant: Variant): string {
  const byVariant: Record<Variant, string> = {
    primary: colors.onPrimary,
    secondary: colors.textPrimary,
    ghost: colors.primaryText,
    danger: colors.danger,
  };
  return byVariant[variant];
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  style,
  testID,
}: ButtonProps) {
  const styles = useStyles();
  const pressedStyles = usePressedStyles();
  const color = textColor(useColors(), variant);
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
      {Icon ? <Icon size={18} color={color} strokeWidth={2.25} /> : null}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(colors => ({
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
}));

const usePressedStyles = makeStyles(colors => ({
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.border },
  ghost: { backgroundColor: colors.primarySoft },
  danger: { backgroundColor: colors.dangerSoft },
}));
