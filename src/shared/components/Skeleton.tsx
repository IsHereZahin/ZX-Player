import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface SkeletonBlockProps {
  width: DimensionValue;
  height: number;
  rounded?: number;
}

function SkeletonBlock({
  width,
  height,
  rounded = radius.sm,
}: SkeletonBlockProps) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: rounded,
        backgroundColor: colors.surfaceRaised,
      }}
    />
  );
}

/** Placeholder rows shown while a list loads, so the layout doesn't jump. */
export function ListSkeleton({
  rows = 6,
  thumbnail = true,
  testID,
}: {
  rows?: number;
  thumbnail?: boolean;
  testID?: string;
}) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.container, { opacity: pulse }]}
      accessibilityLabel="Loading"
      testID={testID}
    >
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          {thumbnail ? (
            <SkeletonBlock width={128} height={72} rounded={radius.md} />
          ) : (
            <SkeletonBlock width={48} height={48} rounded={radius.md} />
          )}
          <View style={styles.lines}>
            <SkeletonBlock width="80%" height={14} />
            <SkeletonBlock width="45%" height={12} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  lines: {
    flex: 1,
    gap: spacing.sm,
  },
});
