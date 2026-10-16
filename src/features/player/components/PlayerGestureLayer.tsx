import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import {
  usePlayerGestures,
  type PlayerGestureOptions,
} from '../hooks/usePlayerGestures';
import { GestureFeedbackView } from './GestureFeedbackView';

/**
 * Full-screen touch surface under the controls. Owning the gesture feedback state here
 * keeps 60 fps drag updates from re-rendering the rest of the player, and memoising it
 * keeps playback progress ticks from re-rendering this layer.
 */
export const PlayerGestureLayer = memo(function PlayerGestureLayerView(
  props: PlayerGestureOptions,
) {
  const { gesture, feedback } = usePlayerGestures(props);

  return (
    <>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} testID="player-gesture-layer" />
      </GestureDetector>
      <GestureFeedbackView feedback={feedback} />
    </>
  );
});
