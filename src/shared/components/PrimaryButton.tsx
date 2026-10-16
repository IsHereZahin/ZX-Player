import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PrimaryButton({
  label,
  onPress,
  style,
  testID,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: colors.onAccent,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});
