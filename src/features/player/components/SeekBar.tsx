import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
  type PanGestureConfig,
  type TapGestureConfig,
} from 'react-native-gesture-handler';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { colors, radius, spacing, typography } from '../../../shared/theme';
import { formatDuration } from '../../../shared/utils/format';
import { clamp } from '../../../shared/utils/math';

const TOUCH_AREA_HEIGHT = 36;
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 14;
const THUMB_SIZE_ACTIVE = 22;
const BUBBLE_WIDTH = 64;

interface SeekBarProps {
  currentTime: number;
  duration: number;
  bufferedTime: number;
  /** Step used by screen-reader increment / decrement actions. */
  skipSeconds: number;
  onSeek: (time: number) => void;
  onScrubbingChange: (scrubbing: boolean) => void;
}

/** Scrub bar: tap to jump, drag to preview a position, release to seek. */
export function SeekBar({
  currentTime,
  duration,
  bufferedTime,
  skipSeconds,
  onSeek,
  onScrubbingChange,
}: SeekBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const scrubRef = useRef<number | null>(null);
  const latest = useLatestRef({
    trackWidth,
    duration,
    onSeek,
    onScrubbingChange,
  });

  const timeAt = useCallback(
    (x: number) => {
      const { trackWidth: width, duration: total } = latest.current;
      return width > 0 ? clamp(x / width, 0, 1) * total : 0;
    },
    [latest],
  );

  const updateScrub = useCallback(
    (x: number) => {
      const time = timeAt(x);
      scrubRef.current = time;
      setScrubTime(time);
    },
    [timeAt],
  );

  const panConfig = useMemo<PanGestureConfig>(
    () => ({
      runOnJS: true,
      testID: 'seek-bar-pan',
      minDistance: 1,
      onActivate: event => {
        latest.current.onScrubbingChange(true);
        updateScrub(event.x);
      },
      onUpdate: event => updateScrub(event.x),
      onDeactivate: event => {
        if (!event.canceled && scrubRef.current !== null) {
          latest.current.onSeek(scrubRef.current);
        }
      },
      onFinalize: () => {
        if (scrubRef.current !== null) {
          scrubRef.current = null;
          setScrubTime(null);
          latest.current.onScrubbingChange(false);
        }
      },
    }),
    [latest, updateScrub],
  );

  const tapConfig = useMemo<TapGestureConfig>(
    () => ({
      runOnJS: true,
      testID: 'seek-bar-tap',
      onActivate: event => latest.current.onSeek(timeAt(event.x)),
    }),
    [latest, timeAt],
  );

  const pan = usePanGesture(panConfig);
  const tap = useTapGesture(tapConfig);
  const gesture = useCompetingGestures(pan, tap);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width),
    [],
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const step =
        event.nativeEvent.actionName === 'increment'
          ? skipSeconds
          : -skipSeconds;
      onSeek(currentTime + step);
    },
    [currentTime, onSeek, skipSeconds],
  );

  const scrubbing = scrubTime !== null;
  const displayTime = scrubTime ?? currentTime;
  const progress = duration > 0 ? clamp(displayTime / duration, 0, 1) : 0;
  const buffered = duration > 0 ? clamp(bufferedTime / duration, 0, 1) : 0;
  const thumbSize = scrubbing ? THUMB_SIZE_ACTIVE : THUMB_SIZE;
  const thumbX = progress * trackWidth;

  return (
    <View style={styles.row}>
      <Text style={styles.time}>{formatDuration(displayTime)}</Text>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.touchArea}
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Playback position"
          accessibilityValue={{
            min: 0,
            max: Math.round(duration),
            now: Math.round(displayTime),
            text: `${formatDuration(displayTime)} of ${formatDuration(
              duration,
            )}`,
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          testID="seek-bar"
        >
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                styles.buffered,
                { width: `${buffered * 100}%` },
              ]}
            />
            <View
              style={[
                styles.fill,
                styles.played,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
          <View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                left: thumbX - thumbSize / 2,
                top: (TOUCH_AREA_HEIGHT - thumbSize) / 2,
              },
            ]}
          />
          {scrubbing ? (
            <View
              pointerEvents="none"
              style={[
                styles.bubble,
                {
                  left: clamp(
                    thumbX - BUBBLE_WIDTH / 2,
                    0,
                    trackWidth - BUBBLE_WIDTH,
                  ),
                },
              ]}
            >
              <Text style={styles.bubbleText}>
                {formatDuration(displayTime)}
              </Text>
            </View>
          ) : null}
        </View>
      </GestureDetector>
      <Text style={styles.time}>{formatDuration(duration)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  time: {
    ...typography.label,
    minWidth: 48,
    color: colors.white,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  touchArea: {
    flex: 1,
    height: TOUCH_AREA_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.trackInactive,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  buffered: {
    backgroundColor: colors.trackBuffered,
  },
  played: {
    backgroundColor: colors.primaryBright,
  },
  thumb: {
    position: 'absolute',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.primaryBright,
  },
  bubble: {
    position: 'absolute',
    bottom: TOUCH_AREA_HEIGHT,
    width: BUBBLE_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  bubbleText: {
    ...typography.label,
    color: colors.onPrimary,
    fontVariant: ['tabular-nums'],
  },
});
