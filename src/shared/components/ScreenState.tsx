import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface ScreenStateProps {
  title?: string;
  message?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/** Full-screen loading / empty / error placeholder shared by the library screens. */
export function ScreenState({
  title,
  message,
  loading = false,
  actionLabel,
  onAction,
  testID,
}: ScreenStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      {loading ? (
        <ActivityIndicator
          color={colors.accent}
          size="large"
          accessibilityLabel="Loading"
        />
      ) : null}
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
  },
});
