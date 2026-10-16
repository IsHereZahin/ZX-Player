import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme';
import { clamp } from '../utils/math';

interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  height?: number;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ProgressBar({
  progress,
  height = 3,
  trackColor = colors.trackInactive,
  style,
  testID,
}: ProgressBarProps) {
  return (
    <View
      style={[styles.track, { height, backgroundColor: trackColor }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clamp(progress, 0, 1) * 100),
      }}
      testID={testID}
    >
      <View
        style={[styles.fill, { width: `${clamp(progress, 0, 1) * 100}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primaryBright,
  },
});
