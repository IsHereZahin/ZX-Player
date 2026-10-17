import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import type { IconComponent } from '../icons';
import { radius, spacing, typography, type ColorTokens } from '../theme';
import { makeStyles, useColors } from '../theming';

/**
 * Apple's button styles: `primary` is filled with the tint ("prominent"), `tinted` a
 * light tint wash, `secondary` grey with tinted text ("bordered"), `ghost` plain text.
 */
type Variant = 'primary' | 'tinted' | 'secondary' | 'ghost' | 'danger';
type Size = 'regular' | 'small';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconComponent;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function textColor(colors: ColorTokens, variant: Variant): string {
  const byVariant: Record<Variant, string> = {
    primary: colors.onPrimary,
    tinted: colors.primaryText,
    secondary: colors.primaryText,
    ghost: colors.primaryText,
    danger: colors.danger,
  };
  return byVariant[variant];
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon: Icon,
  style,
  testID,
}: ButtonProps) {
  const styles = useStyles();
  const color = textColor(useColors(), variant);
  const small = size === 'small';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.regular,
        styles[variant],
        pressed && styles.pressed,
        style,
      ]}
    >
      {Icon ? (
        <Icon size={small ? 16 : 20} color={color} strokeWidth={2.25} />
      ) : null}
      <Text style={[small ? styles.labelSmall : styles.label, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(colors => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  regular: {
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  small: {
    minHeight: 34,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  primary: { backgroundColor: colors.primary },
  tinted: { backgroundColor: colors.primarySoft },
  secondary: { backgroundColor: colors.fill },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.dangerSoft },
  // Apple dims buttons while pressed rather than recolouring them.
  pressed: { opacity: 0.6 },
  label: {
    ...typography.headline,
  },
  labelSmall: {
    ...typography.subheadlineStrong,
  },
}));
