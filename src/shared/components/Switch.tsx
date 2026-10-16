import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { makeStyles, useColors } from '../theming';

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB = 27;
const TRAVEL = TRACK_WIDTH - THUMB - 4;

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
  /** Inside a row that handles the press itself, the switch is just a picture. */
  decorative?: boolean;
  testID?: string;
}

/** iOS-style switch: green track, white thumb that slides with a soft ease. */
export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
  decorative = false,
  testID,
}: SwitchProps) {
  const styles = useStyles();
  const colors = useColors();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, value]);

  // The green track fades in over the grey one (opacity animates natively, colour can't).
  const track = (
    <View style={[styles.track, { backgroundColor: colors.fillStrong }]}>
      <Animated.View
        style={[
          styles.trackOn,
          { backgroundColor: colors.green, opacity: progress },
        ]}
      />
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, TRAVEL],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );

  if (decorative) {
    return track;
  }
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      testID={testID}
    >
      {track}
    </Pressable>
  );
}

const useStyles = makeStyles(colors => ({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    padding: 2,
    borderRadius: TRACK_HEIGHT / 2,
  },
  trackOn: {
    ...StyleSheet.absoluteFill,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
}));
