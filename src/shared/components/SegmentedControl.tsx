import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { font, radius, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theming';

interface SegmentedControlProps<T extends string | number> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  testID?: string;
}

const PADDING = 2;

/** iOS-style segmented control: equal segments on a grey track, a sliding white thumb. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  testID,
}: SegmentedControlProps<T>) {
  const styles = useStyles();
  const { scheme } = useTheme();
  const [width, setWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex(option => option.value === value),
  );
  const segmentWidth =
    width > 0 ? (width - PADDING * 2) / Math.max(options.length, 1) : 0;
  const offset = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (segmentWidth === 0) {
      return;
    }
    const target = selectedIndex * segmentWidth;
    // Jump into place on first layout, slide afterwards.
    if (!placed.current) {
      placed.current = true;
      offset.setValue(target);
      return;
    }
    Animated.spring(offset, {
      toValue: target,
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
    }).start();
  }, [offset, segmentWidth, selectedIndex]);

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const compact = options.length > 5;

  return (
    <View
      style={styles.track}
      onLayout={onLayout}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            scheme === 'dark' && styles.thumbDark,
            { width: segmentWidth, transform: [{ translateX: offset }] },
          ]}
        />
      ) : null}
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={styles.segment}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            <Text
              style={[
                compact ? styles.labelCompact : styles.label,
                selected && styles.labelSelected,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  track: {
    minHeight: 32,
    flexDirection: 'row',
    padding: PADDING,
    borderRadius: radius.sm + 1,
    backgroundColor: colors.fill,
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: radius.sm - 1,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbDark: {
    backgroundColor: '#636366',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  label: {
    ...typography.footnote,
    color: colors.textPrimary,
  },
  labelCompact: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  // Weight only: the size stays that of the (regular or compact) label.
  labelSelected: font('semibold', 13),
}));
