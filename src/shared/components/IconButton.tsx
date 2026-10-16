import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IconComponent } from '../icons';
import { colors, hitSlop, radius } from '../theme';

type Variant = 'ghost' | 'tonal' | 'filled' | 'overlay';
type Size = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon: IconComponent;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /** Highlights the icon in the brand colour (e.g. a toggled-on control). */
  active?: boolean;
  disabled?: boolean;
  testID?: string;
}

const CONTAINER: Record<Size, number> = { sm: 36, md: 44, lg: 64 };
const ICON: Record<Size, number> = { sm: 18, md: 22, lg: 30 };

function iconColor(variant: Variant, active: boolean): string {
  if (variant === 'filled') {
    return colors.onPrimary;
  }
  if (variant === 'tonal' || active) {
    return colors.primaryText;
  }
  return variant === 'overlay' ? colors.white : colors.textPrimary;
}

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  variant = 'ghost',
  size = 'md',
  active = false,
  disabled = false,
  testID,
}: IconButtonProps) {
  const dimension = CONTAINER[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: active }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={size === 'sm' ? hitSlop : undefined}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { width: dimension, height: dimension },
        styles[variant],
        active && variant === 'overlay' && styles.overlayActive,
        pressed && pressedStyles[variant],
        disabled && styles.disabled,
      ]}
    >
      <View pointerEvents="none">
        <Icon
          size={ICON[size]}
          color={iconColor(variant, active)}
          strokeWidth={variant === 'filled' ? 2.25 : 2}
          fill={
            variant === 'filled' && size === 'lg' ? colors.onPrimary : 'none'
          }
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  ghost: {},
  tonal: { backgroundColor: colors.primarySoft },
  filled: { backgroundColor: colors.primary },
  overlay: { backgroundColor: colors.playerButton },
  overlayActive: { backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.35 },
});

const pressedStyles = StyleSheet.create({
  ghost: { backgroundColor: colors.pressed },
  tonal: { backgroundColor: colors.primarySoftPressed },
  filled: { backgroundColor: colors.primaryPressed },
  overlay: { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
});
