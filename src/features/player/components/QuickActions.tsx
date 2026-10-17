import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../../shared/components/IconButton';
import {
  ChevronRightIcon,
  HeadphonesIcon,
  Repeat1Icon,
  RepeatIcon,
  ScreenRotationIcon,
  TimerIcon,
} from '../../../shared/icons';
import {
  playerColors,
  radius,
  spacing,
  typography,
} from '../../../shared/theme';
import { useColors } from '../../../shared/theming';
import { formatSpeed } from '../../../shared/utils/format';
import type { RepeatMode } from './PlayerSheets';

const REPEAT_NAMES: Record<RepeatMode, string> = {
  off: 'Repeat off',
  all: 'Repeat all',
  one: 'Repeat one',
};

export interface QuickActionsProps {
  /** Audio has no picture to rotate and always plays in the background. */
  mode: 'video' | 'audio';
  speed: number;
  repeatMode: RepeatMode;
  sleepActive: boolean;
  backgroundPlay: boolean;
  onOpenSpeed: () => void;
  onCycleRepeat: () => void;
  onOpenSleep: () => void;
  onRotate: () => void;
  onToggleBackgroundPlay: () => void;
  onOpenMore: () => void;
}

/**
 * Row of round shortcuts under the player's top bar. A shortcut takes the accent while its
 * feature is on (a speed other than 1×, repeat, a sleep timer, background play); the
 * chevron opens every option.
 */
export function QuickActions(props: QuickActionsProps) {
  const colors = useColors();
  const isVideo = props.mode === 'video';
  const speedChanged = props.speed !== 1;
  return (
    <View style={styles.row} testID="quick-actions">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Playback speed ${formatSpeed(props.speed)}`}
        accessibilityState={{ selected: speedChanged }}
        onPress={props.onOpenSpeed}
        hitSlop={8}
        style={({ pressed }) => [
          styles.speed,
          speedChanged && { backgroundColor: colors.accent },
          pressed && styles.pressed,
        ]}
        testID="speed-button"
      >
        <Text
          style={[styles.speedText, speedChanged && { color: colors.onAccent }]}
        >
          {formatSpeed(props.speed)}
        </Text>
      </Pressable>
      <IconButton
        icon={props.repeatMode === 'one' ? Repeat1Icon : RepeatIcon}
        variant="overlay"
        size="sm"
        active={props.repeatMode !== 'off'}
        accessibilityLabel={REPEAT_NAMES[props.repeatMode]}
        onPress={props.onCycleRepeat}
        testID="repeat-button"
      />
      <IconButton
        icon={TimerIcon}
        variant="overlay"
        size="sm"
        active={props.sleepActive}
        accessibilityLabel="Sleep timer"
        onPress={props.onOpenSleep}
        testID="sleep-button"
      />
      {isVideo ? (
        <>
          <IconButton
            icon={ScreenRotationIcon}
            variant="overlay"
            size="sm"
            accessibilityLabel="Rotate screen"
            onPress={props.onRotate}
            testID="rotate-button"
          />
          <IconButton
            icon={HeadphonesIcon}
            variant="overlay"
            size="sm"
            active={props.backgroundPlay}
            accessibilityLabel="Background play"
            onPress={props.onToggleBackgroundPlay}
            testID="background-play-button"
          />
        </>
      ) : null}
      <IconButton
        icon={ChevronRightIcon}
        variant="overlay"
        size="sm"
        accessibilityLabel="More options"
        onPress={props.onOpenMore}
        testID="more-button"
      />
    </View>
  );
}

const SIZE = 36;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm + 2,
  },
  speed: {
    minWidth: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: playerColors.playerButton,
  },
  pressed: {
    opacity: 0.7,
  },
  speedText: {
    ...typography.captionStrong,
    fontSize: 13,
    color: playerColors.white,
  },
});
