import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../../shared/theme';

interface ControlButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  /** Text label; ignored when `children` is given. */
  label?: string;
  children?: ReactNode;
  active?: boolean;
  size?: 'regular' | 'large';
  testID?: string;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export function ControlButton({
  accessibilityLabel,
  onPress,
  label,
  children,
  active = false,
  size = 'regular',
  testID,
}: ControlButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.base,
        size === 'large' ? styles.large : styles.regular,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      {children ?? (
        <Text style={[styles.label, active && styles.labelActive]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  regular: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: spacing.md,
  },
  large: {
    width: 72,
    height: 72,
    backgroundColor: colors.playerPanel,
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.accent,
  },
});
