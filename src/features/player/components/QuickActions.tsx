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
import { formatDuration, formatSpeed } from '../../../shared/utils/format';
import {
  describeSleepTimer,
  useSleepSecondsLeft,
  type SleepTimer,
} from '../hooks/useSleepTimer';
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
  sleepTimer: SleepTimer;
  backgroundPlay: boolean;
  onOpenSpeed: () => void;
  onCycleRepeat: () => void;
  onOpenSleep: () => void;
  onRotate: () => void;
  onToggleBackgroundPlay: () => void;
  onOpenMore: () => void;
  /** Centred under the audio controls; the video player keeps it under the title. */
  centered?: boolean;
}

/**
 * Row of round shortcuts under the player's top bar. A shortcut takes the accent while its
 * feature is on (a speed other than 1×, repeat, a sleep timer, background play); a running
 * sleep timer also shows the time left. The chevron opens every option.
 */
export function QuickActions(props: QuickActionsProps) {
  const colors = useColors();
  const isVideo = props.mode === 'video';
  const speedChanged = props.speed !== 1;
  return (
    <View
      style={[styles.row, props.centered && styles.centered]}
      testID="quick-actions"
    >
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
      {props.sleepTimer ? (
        <SleepTimerPill timer={props.sleepTimer} onPress={props.onOpenSleep} />
      ) : (
        <IconButton
          icon={TimerIcon}
          variant="overlay"
          size="sm"
          accessibilityLabel="Sleep timer"
          onPress={props.onOpenSleep}
          testID="sleep-button"
        />
      )}
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

/** A running sleep timer counts down in place of the timer button. */
function SleepTimerPill({
  timer,
  onPress,
}: {
  timer: NonNullable<SleepTimer>;
  onPress: () => void;
}) {
  const colors = useColors();
  const secondsLeft = useSleepSecondsLeft(timer);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sleep timer, ${describeSleepTimer(timer)}`}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.speed,
        styles.sleepPill,
        { backgroundColor: colors.accent },
        pressed && styles.pressed,
      ]}
      testID="sleep-button"
    >
      <TimerIcon size={15} color={colors.onAccent} />
      <Text
        style={[styles.speedText, styles.sleepText, { color: colors.onAccent }]}
        testID="sleep-countdown"
      >
        {secondsLeft === null ? 'End' : formatDuration(secondsLeft)}
      </Text>
    </Pressable>
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
  centered: {
    alignSelf: 'center',
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
  sleepPill: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  sleepText: {
    fontVariant: ['tabular-nums'],
  },
});
