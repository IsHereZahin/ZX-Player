import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { VideoItem } from '../../features/library/types';
import type { RootStackParamList } from './types';

/** Opens the player on `queue[startIndex]`, with the rest of the list as up next. */
export function useOpenPlayer() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return useCallback(
    (queue: VideoItem[], startIndex: number, startFromBeginning = false) => {
      if (queue.length === 0) {
        return;
      }
      navigation.navigate('Player', { queue, startIndex, startFromBeginning });
    },
    [navigation],
  );
}
