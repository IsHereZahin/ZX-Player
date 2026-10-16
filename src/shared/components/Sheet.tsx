import React, { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
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
import { colors, radius, spacing, typography } from '../theme';

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

/**
 * Action sheet that slides up from the bottom in portrait and docks to the right edge in
 * landscape, so menus never cover the whole video.
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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, visible]);

  const offset = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
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
          maxHeight: height * 0.82,
          paddingBottom: insets.bottom + spacing.md,
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
        <Animated.View
          style={[panelStyle, { opacity: entrance }]}
          testID={testID}
        >
          {landscape ? null : <View style={styles.handle} />}
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
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
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
  const tint = destructive
    ? colors.danger
    : selected
    ? colors.primaryText
    : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      testID={testID}
    >
      {Icon ? (
        <Icon
          size={20}
          color={
            destructive
              ? colors.danger
              : selected
              ? colors.primaryText
              : colors.textSecondary
          }
        />
      ) : null}
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, { color: tint }]} numberOfLines={1}>
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
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
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
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
  },
  sidePanel: {
    height: '100%',
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: spacing.sm,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xxs,
    color: colors.textSecondary,
  },
  content: {
    paddingBottom: spacing.sm,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  optionPressed: {
    backgroundColor: colors.pressed,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body,
  },
  optionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.overline,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    color: colors.textMuted,
  },
});
