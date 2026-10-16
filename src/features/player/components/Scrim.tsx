import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { playerColors } from '../../../shared/theme';

interface ScrimProps {
  edge: 'top' | 'bottom';
  height: number;
}

/** Gradient behind the player bars: keeps controls legible without boxing the video. */
export function Scrim({ edge, height }: ScrimProps) {
  const id = `scrim-${edge}`;
  const dark = edge === 'top' ? 0.7 : 0.82;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrim,
        edge === 'top' ? styles.top : styles.bottom,
        { height },
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={playerColors.black}
              stopOpacity={edge === 'top' ? dark : 0}
            />
            <Stop
              offset="1"
              stopColor={playerColors.black}
              stopOpacity={edge === 'top' ? 0 : dark}
            />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
