import React, { useMemo, useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon } from '../icons';
import { spacing, typography } from '../theme';
import { makeStyles, useColors } from '../theming';

/** Height of the large title block; the bar's own title fades in once it scrolls away. */
const LARGE_TITLE_HEIGHT = 52;
export const NAVIGATION_BAR_HEIGHT = 44;

/**
 * Scroll position for a screen with a collapsing large title. Pass `onScroll` to the
 * screen's Animated list (it runs on the native thread) and `scrollY` to NavigationBar.
 */
export function useCollapsingTitle() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () =>
      Animated.event<NativeSyntheticEvent<NativeScrollEvent>>(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true },
      ),
    [scrollY],
  );
  return { scrollY, onScroll };
}

interface NavigationBarProps {
  title: string;
  /** With a large title in the content: the bar title and background appear on scroll. */
  scrollY?: Animated.Value;
  onBack?: () => void;
  /** Label next to the back chevron, usually the previous screen's title. */
  backLabel?: string;
  right?: ReactNode;
  /** Plain-list screens sit on `canvas`, grouped ones on `background`. */
  tone?: 'grouped' | 'plain';
}

/**
 * iOS-style navigation bar: back button with the previous title, centred title and
 * trailing actions. Over a large title it starts transparent and blends in.
 */
export function NavigationBar({
  title,
  scrollY,
  onBack,
  backLabel = 'Back',
  right,
  tone = 'grouped',
}: NavigationBarProps) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const collapsed = scrollY
    ? scrollY.interpolate({
        inputRange: [LARGE_TITLE_HEIGHT - 12, LARGE_TITLE_HEIGHT],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 1;
  const background = tone === 'plain' ? colors.canvas : colors.background;

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          backgroundColor: background,
        },
      ]}
    >
      <Animated.View
        style={[styles.chrome, { opacity: collapsed }]}
        pointerEvents="none"
      />
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Back to ${backLabel}`}
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
              testID="navigation-back"
            >
              <ChevronLeftIcon
                size={28}
                color={colors.primaryText}
                strokeWidth={2.25}
              />
              <Text style={styles.backLabel} numberOfLines={1}>
                {backLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Animated.Text
          style={[styles.title, { opacity: collapsed }]}
          numberOfLines={1}
          // A large title in the content is the screen's heading instead.
          accessibilityRole={scrollY ? undefined : 'header'}
          importantForAccessibility={scrollY ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={Boolean(scrollY)}
        >
          {title}
        </Animated.Text>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </View>
  );
}

interface LargeTitleProps {
  title: string;
  subtitle?: string;
  /** Shown at the trailing edge of the title, e.g. an avatar or logo. */
  accessory?: ReactNode;
}

/** The large, left-aligned title that starts a scrolling screen. */
export function LargeTitle({ title, subtitle, accessory }: LargeTitleProps) {
  const styles = useStyles();
  return (
    <View style={styles.largeTitleBlock}>
      <View style={styles.largeTitleRow}>
        <Text
          style={styles.largeTitle}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {accessory}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  bar: {
    zIndex: 1,
  },
  chrome: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.chrome,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  row: {
    height: NAVIGATION_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
    paddingRight: spacing.xs,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
    maxWidth: 140,
  },
  dimmed: {
    opacity: 0.4,
  },
  backLabel: {
    ...typography.body,
    marginLeft: -spacing.xxs,
    color: colors.primaryText,
  },
  title: {
    ...typography.headline,
    flexShrink: 1,
    maxWidth: '50%',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  largeTitleBlock: {
    minHeight: LARGE_TITLE_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  largeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  largeTitle: {
    ...typography.largeTitle,
    flexShrink: 1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
}));
