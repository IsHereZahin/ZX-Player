import React from 'react';
import { Pressable, View } from 'react-native';

import type { IconComponent } from '../icons';
import { hitSlop, radius, type ColorTokens } from '../theme';
import { makeStyles, useColors } from '../theming';

/**
 * `plain` is a tinted glyph without a background; `glyph` is a white one for the video
 * player's transport; `raised` sits in a white circle, as in screen headers.
 */
type Variant =
  | 'ghost'
  | 'plain'
  | 'glyph'
  | 'raised'
  | 'tonal'
  | 'filled'
  | 'overlay';
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

function iconColor(
  colors: ColorTokens,
  variant: Variant,
  active: boolean,
): string {
  if (variant === 'filled') {
    return colors.onPrimary;
  }
  // Over video, "on" is shown in the accent: ink would vanish against the picture.
  if (variant === 'overlay') {
    return active ? colors.onAccent : colors.white;
  }
  if (variant === 'tonal' || variant === 'plain' || active) {
    return colors.primaryText;
  }
  return variant === 'glyph' ? colors.white : colors.textPrimary;
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
  const styles = useStyles();
  const pressedStyles = usePressedStyles();
  const colors = useColors();
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
          color={iconColor(colors, variant, active)}
          strokeWidth={variant === 'filled' ? 2.25 : 2}
          fill={
            size === 'lg' && (variant === 'filled' || variant === 'glyph')
              ? iconColor(colors, variant, active)
              : 'none'
          }
        />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(colors => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  ghost: {},
  plain: {},
  glyph: {},
  raised: { backgroundColor: colors.surface },
  tonal: { backgroundColor: colors.primarySoft },
  filled: { backgroundColor: colors.primary },
  overlay: { backgroundColor: colors.playerButton },
  overlayActive: { backgroundColor: colors.accent },
  disabled: { opacity: 0.35 },
}));

const usePressedStyles = makeStyles(colors => ({
  ghost: { backgroundColor: colors.pressed },
  plain: { opacity: 0.4 },
  glyph: { opacity: 0.5 },
  raised: { backgroundColor: colors.surfaceRaised },
  tonal: { backgroundColor: colors.primarySoftPressed },
  filled: { backgroundColor: colors.primaryPressed },
  overlay: { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
}));
