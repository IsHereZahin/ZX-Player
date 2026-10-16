import React, { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '../icons';
import { spacing, typography } from '../theme';
import { makeStyles } from '../theming';
import { IconButton } from './IconButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back button; tab root screens omit it and get a large title instead. */
  onBack?: () => void;
  /** Shown before the title, e.g. the app logo on the home tab. */
  leading?: ReactNode;
  actions?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  leading,
  actions,
}: ScreenHeaderProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const large = !onBack;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (large ? spacing.md : spacing.xs),
          paddingLeft: Math.max(insets.left, large ? spacing.xl : spacing.xs),
          paddingRight: Math.max(insets.right, spacing.sm),
        },
      ]}
    >
      {onBack ? (
        <IconButton
          icon={ArrowLeftIcon}
          accessibilityLabel="Back"
          onPress={onBack}
        />
      ) : null}
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={[styles.titles, onBack && styles.titlesWithBack]}>
        <Text
          style={large ? styles.largeTitle : styles.title}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  leading: {
    marginRight: spacing.md,
  },
  titles: {
    flex: 1,
  },
  titlesWithBack: {
    marginLeft: spacing.xs,
  },
  largeTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}));
