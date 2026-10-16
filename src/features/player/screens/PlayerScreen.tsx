import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import type { RootStackScreenProps } from '../../../app/navigation/types';
import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { colors } from '../../../shared/theme';
import { clamp } from '../../../shared/utils/math';
import { useSettings } from '../../settings/settingsStore';
import type { RepeatMode } from '../components/PlayerSheets';
import { useBrightnessControl } from '../hooks/useBrightnessControl';
import { useSleepTimer } from '../hooks/useSleepTimer';
import { useVolumeControl } from '../hooks/useVolumeControl';
import type { AspectMode, Size } from '../utils/aspectRatio';
import { PlayerSession } from './PlayerSession';

type Props = RootStackScreenProps<'Player'>;
type Orientation = 'landscape' | 'portrait';

function initialLayout(): Size {
  const { width, height } = Dimensions.get('window');
  return { width, height };
}

/**
 * Owns what carries over from one video to the next (queue position, speed, repeat,
 * aspect ratio, lock, sleep timer, orientation, brightness and volume). Per-video state
 * lives in `PlayerSession`, which is remounted for every video.
 */
export function PlayerScreen({ navigation, route }: Props) {
  const { queue, startIndex, startFromBeginning = false } = route.params;
  const settings = useSettings();
  const brightness = useBrightnessControl();
  const volume = useVolumeControl();

  const [index, setIndex] = useState(() =>
    clamp(startIndex, 0, queue.length - 1),
  );
  // "Play from beginning" applies to the first video only.
  const [ignoreSavedPosition, setIgnoreSavedPosition] =
    useState(startFromBeginning);
  const [layout, setLayout] = useState<Size>(initialLayout);
  const [speed, setSpeed] = useState(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [aspectMode, setAspectMode] = useState<AspectMode>(
    settings.defaultAspectMode,
  );
  const [locked, setLocked] = useState(false);
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [pauseSignal, setPauseSignal] = useState(0);
  const sleep = useSleepTimer(() => setPauseSignal(count => count + 1));

  const video = queue[index];
  const hasNext = index < queue.length - 1;
  const hasPrevious = index > 0;
  const latest = useLatestRef({
    index,
    hasNext,
    queue,
    repeatMode,
    settings,
    sleep,
  });

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

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout(current =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

  const goTo = useCallback((next: number) => {
    setIgnoreSavedPosition(false);
    setIndex(next);
  }, []);

  const goNext = useCallback(() => {
    if (latest.current.hasNext) {
      goTo(latest.current.index + 1);
    }
  }, [goTo, latest]);

  const goPrevious = useCallback(() => {
    if (latest.current.index > 0) {
      goTo(latest.current.index - 1);
    }
  }, [goTo, latest]);

  /** Decides what happens when a video finishes; true if another video starts. */
  const handleEnded = useCallback(() => {
    const current = latest.current;
    if (current.sleep.timer?.kind === 'end-of-video') {
      current.sleep.setTimer(null);
      return false;
    }
    if (current.repeatMode === 'all' && current.queue.length > 1) {
      goTo(current.hasNext ? current.index + 1 : 0);
      return true;
    }
    if (current.settings.autoPlayNext && current.hasNext) {
      goTo(current.index + 1);
      return true;
    }
    return false;
  }, [goTo, latest]);

  // Match the screen to the first video's shape; the rotate button overrides it.
  const onNaturalSize = useCallback((size: Size) => {
    setOrientation(
      current =>
        current ?? (size.width >= size.height ? 'landscape' : 'portrait'),
    );
  }, []);

  const rotate = useCallback(() => {
    setOrientation(current => {
      const effective =
        current ?? (layout.width >= layout.height ? 'landscape' : 'portrait');
      return effective === 'landscape' ? 'portrait' : 'landscape';
    });
  }, [layout.height, layout.width]);

  if (!video) {
    return null;
  }

  return (
    <View style={styles.root} onLayout={onLayout} testID="player-screen">
      <StatusBar hidden animated />
      <PlayerSession
        key={`${index}-${video.id}`}
        video={video}
        queueLabel={queue.length > 1 ? `${index + 1} of ${queue.length}` : null}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        layout={layout}
        ignoreSavedPosition={ignoreSavedPosition}
        speed={speed}
        repeatMode={repeatMode}
        aspectMode={aspectMode}
        locked={locked}
        sleepTimer={sleep.timer}
        pauseSignal={pauseSignal}
        brightness={brightness}
        volume={volume}
        onNext={goNext}
        onPrevious={goPrevious}
        onEnded={handleEnded}
        onSpeedChange={setSpeed}
        onRepeatModeChange={setRepeatMode}
        onAspectModeChange={setAspectMode}
        onLockChange={setLocked}
        onSleepTimerChange={sleep.setTimer}
        onRotate={rotate}
        onNaturalSize={onNaturalSize}
        onClose={navigation.goBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
