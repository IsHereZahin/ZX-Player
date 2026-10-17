import React, { type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { IconComponent } from '../icons';
import { spacing, typography } from '../theme';
import { makeStyles, useColors } from '../theming';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: IconComponent;
  /** Artwork shown instead of the icon, e.g. the app logo. */
  illustration?: ReactNode;
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
  illustration,
  title,
  message,
  loading = false,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.container} testID={testID}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.accent}
          accessibilityLabel="Loading"
        />
      ) : null}
      {illustration && !loading ? (
        <View style={styles.illustration}>{illustration}</View>
      ) : null}
      {Icon && !illustration && !loading ? (
        <View style={styles.icon}>
          <Icon size={52} color={colors.textMuted} strokeWidth={1.5} />
        </View>
      ) : null}
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="tinted"
          size="small"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxl,
  },
  illustration: {
    marginBottom: spacing.sm,
  },
  icon: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...typography.subheadline,
    maxWidth: 320,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
  },
}));
