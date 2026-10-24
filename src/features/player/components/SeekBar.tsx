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
import {
  createStore,
  useStore,
  type Store,
} from '../../../shared/storage/store';
import { useColors } from '../../../shared/theming';
import {
  playerColors,
  radius,
  spacing,
  typography,
} from '../../../shared/theme';
import { formatDuration } from '../../../shared/utils/format';
import { clamp } from '../../../shared/utils/math';
import { usePlaybackClock, type PlaybackClock } from '../playbackClock';

/** Tall enough to grab easily; the track and handle sit in its middle. */
const TOUCH_AREA_HEIGHT = 40;
const TRACK_HEIGHT = 6;
const TRACK_HEIGHT_ACTIVE = 8;
/** The handle on the current position, a little bigger while dragged. */
const THUMB_SIZE = 16;
const THUMB_SIZE_ACTIVE = 22;

const NO_PREVIEW = createStore<number | null>(null);

interface SeekBarProps {
  clock: PlaybackClock;
  duration: number;
  /** Step used by screen-reader increment / decrement actions. */
  skipSeconds: number;
  /** A position being picked elsewhere (a swipe on the video), shown as if dragged here. */
  preview?: Store<number | null>;
  onSeek: (time: number) => void;
  onScrubbingChange: (scrubbing: boolean) => void;
}

/** Scrub bar: tap to jump, drag to preview a position, release to seek. */
export function SeekBar({
  clock,
  duration,
  skipSeconds,
  preview = NO_PREVIEW,
  onSeek,
  onScrubbingChange,
}: SeekBarProps) {
  const colors = useColors();
  const { currentTime, bufferedTime } = usePlaybackClock(clock);
  const previewTime = useStore(preview, time => time);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const scrubTime = dragTime ?? previewTime;
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
      setDragTime(time);
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
          setDragTime(null);
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
      onSeek(clock.getState().currentTime + step);
    },
    [clock, onSeek, skipSeconds],
  );

  const scrubbing = scrubTime !== null;
  const displayTime = scrubTime ?? currentTime;
  const progress = duration > 0 ? clamp(displayTime / duration, 0, 1) : 0;
  const buffered = duration > 0 ? clamp(bufferedTime / duration, 0, 1) : 0;
  const remaining = Math.max(0, duration - displayTime);
  const thumbSize = scrubbing ? THUMB_SIZE_ACTIVE : THUMB_SIZE;

  return (
    <View style={styles.column}>
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
          <View style={[styles.track, scrubbing && styles.trackActive]}>
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
                { backgroundColor: colors.accent },
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
          {trackWidth > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.thumb,
                {
                  width: thumbSize,
                  height: thumbSize,
                  borderRadius: thumbSize / 2,
                  left: progress * trackWidth - thumbSize / 2,
                  top: (TOUCH_AREA_HEIGHT - thumbSize) / 2,
                },
              ]}
              testID="seek-thumb"
            />
          ) : null}
        </View>
      </GestureDetector>
      <View style={styles.times}>
        <Text style={[styles.time, scrubbing && styles.timeActive]}>
          {formatDuration(displayTime)}
        </Text>
        <Text style={[styles.time, scrubbing && styles.timeActive]}>
          −{formatDuration(remaining)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: spacing.xxs,
  },
  touchArea: {
    height: TOUCH_AREA_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: playerColors.trackInactive,
  },
  trackActive: {
    height: TRACK_HEIGHT_ACTIVE,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  buffered: {
    backgroundColor: playerColors.trackBuffered,
  },
  thumb: {
    position: 'absolute',
    backgroundColor: playerColors.white,
    shadowColor: playerColors.black,
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    ...typography.caption2,
    color: playerColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  timeActive: {
    color: playerColors.white,
  },
});
