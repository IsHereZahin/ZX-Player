import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { IconComponent } from '../icons';
import { colors, spacing, typography } from '../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: IconComponent;
  title?: string;
  message?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/** Centred placeholder for loading, empty, permission and error states. */
export function EmptyState({
  icon: Icon,
  title,
  message,
  loading = false,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primaryBright}
          accessibilityLabel="Loading"
        />
      ) : null}
      {Icon && !loading ? (
        <View style={styles.iconCircle}>
          <Icon size={32} color={colors.primaryText} strokeWidth={1.75} />
        </View>
      ) : null}
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxl,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 72,
    height: 72,
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    maxWidth: 340,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
    minWidth: 180,
  },
});
