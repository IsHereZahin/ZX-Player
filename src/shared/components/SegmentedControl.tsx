import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

interface SegmentedControlProps<T extends string | number> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  testID?: string;
}

/** Single-choice chips; wraps onto further lines when space runs out. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              selected ? styles.chipSelected : pressed && styles.chipPressed,
            ]}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minWidth: 56,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
  },
  chipPressed: {
    backgroundColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.label,
    fontSize: 13,
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.onPrimary,
  },
});
