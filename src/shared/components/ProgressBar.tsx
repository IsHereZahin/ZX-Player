import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useColors } from '../theming';
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
  trackColor,
  style,
  testID,
}: ProgressBarProps) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor ?? colors.trackInactive },
        style,
      ]}
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

const useStyles = makeStyles(colors => ({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primaryBright,
  },
}));
