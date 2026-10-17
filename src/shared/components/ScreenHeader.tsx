import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ArrowLeftIcon } from '../icons';
import { spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theming';
import { IconButton } from './IconButton';

/** Height of the header row before it has been measured. */
const ESTIMATED_ROW_HEIGHT = 60;
/** Scrolling this far gives the header its backdrop. */
const BACKDROP_AFTER = 16;
const GLOW_HEIGHT = 280;

/**
 * Lets a ScreenHeader float over the screen's content and slide away while the user
 * scrolls down; it comes back as soon as they scroll up. Pass `onScroll` to the screen's
 * Animated list (it runs on the native thread) and leave `height` free at its top.
 */
export interface HidingHeader {
  scrollY: Animated.Value;
  onScroll: ReturnType<typeof Animated.event>;
  /** The header's height, status bar included. */
  height: number;
  onLayout: (event: LayoutChangeEvent) => void;
}

export function useHidingHeader(): HidingHeader {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [height, setHeight] = useState(insets.top + ESTIMATED_ROW_HEIGHT);
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    setHeight(previous =>
      Math.abs(previous - measured) < 0.5 ? previous : measured,
    );
  }, []);
  return { scrollY, onScroll, height, onLayout };
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back button; tab root screens omit it and get a larger title instead. */
  onBack?: () => void;
  /** Shown before the title, e.g. the app logo on the home tab. */
  leading?: ReactNode;
  actions?: ReactNode;
  /** Floats the header over the content and hides it while scrolling down. */
  hiding?: HidingHeader;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  leading,
  actions,
  hiding,
}: ScreenHeaderProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const large = !onBack;

  const row = (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (large ? spacing.md : spacing.xs),
          paddingLeft: Math.max(insets.left, large ? spacing.xl : spacing.md),
          paddingRight: Math.max(insets.right, spacing.md),
        },
      ]}
    >
      {onBack ? (
        <IconButton
          icon={ArrowLeftIcon}
          variant="raised"
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

  return hiding ? <HidingFrame hiding={hiding}>{row}</HidingFrame> : row;
}

function HidingFrame({
  hiding,
  children,
}: {
  hiding: HidingHeader;
  children: ReactNode;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // Only the row slides away; the status bar area stays covered.
  const distance = Math.max(hiding.height - insets.top, 1);
  const { translateY, backdrop } = useMemo(
    () => ({
      translateY: Animated.diffClamp(hiding.scrollY, 0, distance).interpolate({
        inputRange: [0, distance],
        outputRange: [0, -distance],
      }),
      backdrop: hiding.scrollY.interpolate({
        inputRange: [0, BACKDROP_AFTER],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    }),
    [distance, hiding.scrollY],
  );

  return (
    <>
      <Animated.View
        onLayout={hiding.onLayout}
        style={[styles.overlay, { transform: [{ translateY }] }]}
        testID="screen-header"
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { opacity: backdrop }]}
        />
        {children}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.statusBar, { height: insets.top, opacity: backdrop }]}
      />
    </>
  );
}

/**
 * A soft wash of the colour theme at the top of a screen, behind its header. It scrolls
 * away with the content; place it before the screen's list.
 */
export function HeaderGlow({ scrollY }: { scrollY: Animated.Value }) {
  const styles = useStyles();
  const { scheme, colors } = useTheme();
  const translateY = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, GLOW_HEIGHT],
        outputRange: [0, -GLOW_HEIGHT],
        extrapolate: 'clamp',
      }),
    [scrollY],
  );
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glow, { transform: [{ translateY }] }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="headerGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={colors.glow}
              stopOpacity={scheme === 'light' ? 0.6 : 0.5}
            />
            <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#headerGlow)" />
      </Svg>
    </Animated.View>
  );
}

const useStyles = makeStyles(colors => ({
  // No background of its own: the header takes the colour of the screen it sits on.
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.chrome,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: colors.chrome,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: GLOW_HEIGHT,
  },
  leading: {
    marginRight: spacing.md,
  },
  titles: {
    flex: 1,
  },
  titlesWithBack: {
    marginLeft: spacing.md,
  },
  largeTitle: {
    ...typography.title1,
    color: colors.textPrimary,
  },
  title: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
}));
