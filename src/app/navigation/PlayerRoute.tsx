import React, { useEffect, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  leaveFullPlayer,
  nowPlayingStore,
  showFullPlayer,
} from '../../features/player/nowPlaying';
import { useStore } from '../../shared/storage/store';
import { playerColors } from '../../shared/theme';
import type { RootStackScreenProps } from './types';

type Props = RootStackScreenProps<'Player'>;

/**
 * The player is drawn by PlayerHost above the navigator; this screen stands in for it in
 * the navigation stack. It locks the screen orientation the player asks for, and leaving
 * it (back button or gesture) minimises or stops playback.
 */
export function PlayerRoute({ navigation }: Props) {
  const orientation = useStore(nowPlayingStore, state => state.orientation);

  useLayoutEffect(() => {
    navigation.setOptions({
      orientation:
        orientation === 'landscape'
          ? 'landscape'
          : orientation === 'portrait'
          ? 'portrait_up'
          : 'default',
    });
  }, [navigation, orientation]);

  useEffect(() => {
    if (!nowPlayingStore.getState().request) {
      navigation.goBack();
      return;
    }
    showFullPlayer();
    // Minimise as the screen starts to leave, not after its exit animation.
    const unsubscribe = navigation.addListener('beforeRemove', leaveFullPlayer);
    return () => {
      unsubscribe();
      leaveFullPlayer();
    };
  }, [navigation]);

  return <View style={styles.root} testID="player-route" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: playerColors.black,
  },
});
