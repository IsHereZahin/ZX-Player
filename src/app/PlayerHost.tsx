import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  leaveFullPlayer,
  nowPlayingStore,
  setPlayerOrientation,
} from '../features/player/nowPlaying';
import { PlayerScreen } from '../features/player/screens/PlayerScreen';
import { useStore } from '../shared/storage/store';
import { navigationRef } from './navigation/navigationRef';

/** Leaves the full player the same way the system back button does. */
function closeFullPlayer() {
  if (
    navigationRef.isReady() &&
    navigationRef.getCurrentRoute()?.name === 'Player'
  ) {
    navigationRef.goBack();
  } else {
    leaveFullPlayer();
  }
}

/**
 * Hosts the player above the navigator, so playback outlives the Player screen: leaving
 * the player with background play on keeps it playing behind the mini player.
 */
export function PlayerHost() {
  const request = useStore(nowPlayingStore, state => state.request);
  const minimized = useStore(
    nowPlayingStore,
    state => state.presentation === 'mini',
  );
  if (!request) {
    return null;
  }
  return (
    <View
      style={minimized ? styles.offscreen : StyleSheet.absoluteFill}
      pointerEvents={minimized ? 'none' : 'auto'}
      testID="player-host"
    >
      <PlayerScreen
        key={request.id}
        queue={request.queue}
        startIndex={request.startIndex}
        startFromBeginning={request.startFromBeginning}
        minimized={minimized}
        onClose={closeFullPlayer}
        onOrientationChange={setPlayerOrientation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The native player must stay attached to keep playing, so it is shrunk out of sight
  // instead of being unmounted or hidden.
  offscreen: {
    position: 'absolute',
    left: -10,
    top: -10,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
});
