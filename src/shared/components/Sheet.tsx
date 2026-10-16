import React, {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, type IconComponent } from '../icons';
import { radius, spacing, typography } from '../theme';
import { makeStyles, useColors } from '../theming';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** iOS only: fires once the modal has fully dismissed (see `useAfterSheetClose`). */
  onDismissed?: () => void;
  testID?: string;
}

const SIDE_PANEL_WIDTH = 380;
const ICON_INSET = spacing.lg + 26 + spacing.md;

/**
 * iOS-style sheet that slides up from the bottom in portrait and docks to the right edge
 * in landscape, so menus never cover the whole video. Consecutive option rows are
 * grouped into rounded cards; section titles and other content separate the groups.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  onDismissed,
  testID,
}: SheetProps) {
  const styles = useStyles();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, visible]);

  const offset = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [landscape ? 48 : 120, 0],
  });
  const panelStyle = landscape
    ? [
        styles.sidePanel,
        {
          width: Math.min(SIDE_PANEL_WIDTH, width * 0.5),
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingRight: insets.right,
          transform: [{ translateX: offset }],
        },
      ]
    : [
        styles.bottomPanel,
        {
          maxHeight: height * 0.85,
          paddingBottom: insets.bottom + spacing.lg,
          transform: [{ translateY: offset }],
        },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismissed}
      // iOS dismisses a modal that doesn't declare the current orientation.
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        style={[styles.root, landscape ? styles.rootSide : styles.rootBottom]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View style={panelStyle} testID={testID}>
          {landscape ? null : <View style={styles.grabber} />}
          {title ? (
            <View style={styles.header}>
              <Text
                style={styles.title}
                accessibilityRole="header"
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          <ScrollView bounces={false} contentContainerStyle={styles.content}>
            <GroupedOptions>{children}</GroupedOptions>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Wraps each run of consecutive OptionRows in a card with hairline separators. */
function GroupedOptions({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const blocks: ReactNode[] = [];
  let group: ReactElement<OptionRowProps>[] = [];

  const flush = () => {
    if (group.length === 0) {
      return;
    }
    const rows = group;
    blocks.push(
      <View key={`group-${blocks.length}`} style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? (
              <View
                style={[
                  styles.separator,
                  { marginLeft: row.props.icon ? ICON_INSET : spacing.lg },
                ]}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>,
    );
    group = [];
  };

  Children.toArray(children).forEach(child => {
    if (isValidElement(child) && child.type === OptionRow) {
      group.push(child as ReactElement<OptionRowProps>);
    } else {
      flush();
      blocks.push(child);
    }
  });
  flush();
  return <>{blocks}</>;
}

/**
 * Runs an action after a sheet closes. iOS cannot present another controller (e.g. the
 * file picker) while a modal is still animating out, so there the action waits for the
 * sheet's `onDismissed`; Android runs it immediately.
 */
export function useAfterSheetClose() {
  const pending = useRef<(() => void) | null>(null);

  const schedule = useCallback((action: () => void) => {
    if (Platform.OS === 'ios') {
      pending.current = action;
    } else {
      action();
    }
  }, []);

  const onDismissed = useCallback(() => {
    const action = pending.current;
    pending.current = null;
    action?.();
  }, []);

  return { schedule, onDismissed };
}

interface OptionRowProps {
  label: string;
  onPress: () => void;
  icon?: IconComponent;
  description?: string;
  selected?: boolean;
  destructive?: boolean;
  trailing?: ReactNode;
  testID?: string;
}

/** Tappable row used inside sheets for actions and single-choice lists. */
export function OptionRow({
  label,
  onPress,
  icon: Icon,
  description,
  selected = false,
  destructive = false,
  trailing,
  testID,
}: OptionRowProps) {
  const styles = useStyles();
  const colors = useColors();
  const tint = destructive ? colors.danger : colors.primaryText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      testID={testID}
    >
      {Icon ? (
        <View style={styles.optionIcon}>
          <Icon size={22} color={tint} strokeWidth={1.75} />
        </View>
      ) : null}
      <View style={styles.optionText}>
        <Text
          style={[styles.optionLabel, destructive && { color: colors.danger }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {description ? (
          <Text style={styles.optionDescription} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing}
      {selected ? (
        <CheckIcon size={20} color={colors.primaryText} strokeWidth={2.5} />
      ) : null}
    </Pressable>
  );
}

export function SheetSectionTitle({ children }: { children: string }) {
  const styles = useStyles();
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const useStyles = makeStyles(colors => ({
  root: {
    flex: 1,
    backgroundColor: colors.backdrop,
  },
  rootBottom: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  rootSide: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bottomPanel: {
    width: '100%',
    maxWidth: 600,
    paddingTop: spacing.xs + 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.sheet,
  },
  sidePanel: {
    height: '100%',
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
    backgroundColor: colors.sheet,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    marginBottom: spacing.xs,
    borderRadius: 2.5,
    backgroundColor: colors.fillStrong,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.footnote,
    marginTop: spacing.xxs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    paddingBottom: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.sheetCell,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  option: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  optionPressed: {
    backgroundColor: colors.pressed,
  },
  optionIcon: {
    width: 26,
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionDescription: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.overline,
    paddingHorizontal: spacing.xxl + spacing.sm,
    paddingBottom: spacing.xs + 2,
    color: colors.textSecondary,
  },
}));
