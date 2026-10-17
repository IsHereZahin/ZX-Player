import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { nowPlayingStore } from '../../features/player/nowPlaying';
import { FrostedBackground } from '../../shared/components/FrostedBackground';
import { useStore } from '../../shared/storage/store';
import { radius, spacing } from '../../shared/theme';
import { makeStyles, useColors } from '../../shared/theming';

const BUTTON_SIZE = 46;
const ICON_SIZE = 21;

/**
 * Floating, frosted capsule of round icon buttons; the current tab is filled with the
 * theme's accent.
 * Labels are read out by screen readers rather than drawn.
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const styles = useStyles();
  const colors = useColors();
  // Under the full player the bar can't be seen, so it stops blurring (and redrawing).
  const playerOpen = useStore(
    nowPlayingStore,
    playing => playing.request !== null && playing.presentation === 'full',
  );

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.capsule} accessibilityRole="tablist">
        <FrostedBackground blur={!playerOpen} />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            options.tabBarAccessibilityLabel ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            // Pressing the current tab is left to its stack (it pops to the top).
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
              style={({ pressed }) => [
                styles.button,
                focused ? styles.buttonFocused : pressed && styles.pressed,
              ]}
              testID={options.tabBarButtonTestID}
            >
              {options.tabBarIcon?.({
                focused,
                color: focused ? colors.onAccent : colors.textSecondary,
                size: ICON_SIZE,
              })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  capsule: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    padding: spacing.xs + 1,
    overflow: 'hidden',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    // A translucent view casts its elevation shadow through itself on Android.
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: colors.black,
          shadowOpacity: 0.1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        }
      : null),
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BUTTON_SIZE / 2,
  },
  buttonFocused: {
    backgroundColor: colors.accent,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
}));
