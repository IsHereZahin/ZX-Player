import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useCompetingGestures,
  useExclusiveGestures,
  useLongPressGesture,
  usePanGesture,
  usePinchGesture,
  useTapGesture,
  type LongPressGestureConfig,
  type PanGestureConfig,
  type PinchGestureConfig,
  type TapGestureConfig,
} from 'react-native-gesture-handler';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { clamp } from '../../../shared/utils/math';
import {
  MAX_ZOOM,
  NO_ZOOM,
  ZOOM_SNAP,
  type Size,
  type Zoom,
} from '../utils/aspectRatio';
import {
  computeLevel,
  computeSeekTarget,
  resolveDoubleTapZone,
  resolvePanIntent,
  type PanIntent,
} from '../utils/gestureMath';
import type { LevelControl } from './levelControl';

/** Movement before a touch counts as a drag; below this it can still be a tap. */
const PAN_ACTIVATION_DISTANCE = 12;
const DOUBLE_TAP_MAX_DELAY_MS = 250;
const HOLD_FOR_SPEED_MS = 400;
/** Double taps on the same side within this window add up (+10, +20, …). */
const SKIP_CHAIN_MS = 1200;
/** How long the indicator stays up after a gesture ends. */
const FEEDBACK_LINGER_MS = 650;

export type GestureFeedback =
  | { kind: 'brightness' | 'volume'; level: number }
  | { kind: 'seek'; target: number; delta: number; duration: number }
  | { kind: 'skip'; seconds: number }
  | { kind: 'zoom'; scale: number }
  | { kind: 'boost' };

export interface GestureToggles {
  brightness: boolean;
  volume: boolean;
  seek: boolean;
  doubleTap: boolean;
  holdForSpeed: boolean;
  zoom: boolean;
}

export interface PlayerGestureOptions {
  layout: Size;
  duration: number;
  skipSeconds: number;
  toggles: GestureToggles;
  /** Locked screens only react to a tap (which reveals the unlock button). */
  locked: boolean;
  getCurrentTime: () => number;
  seekTo: (time: number) => void;
  togglePlayback: () => void;
  toggleControls: () => void;
  onBoostChange: (active: boolean) => void;
  getZoom: () => Zoom;
  onZoomChange: (zoom: Zoom) => void;
  brightness: LevelControl;
  volume: LevelControl;
}

interface PanSession {
  /** `move` pans a zoomed-in picture. */
  intent: PanIntent | 'move' | null;
  startX: number;
  startZoom: Zoom;
  startTime: number;
  startLevel: number;
  target: number;
}

/**
 * Gesture map for the video surface:
 * - vertical drag, left half → brightness; right half → volume
 * - horizontal drag → seek, committed on release
 * - double tap: left / right zone → skip back / forward, centre → play/pause
 * - press and hold → 2× speed while held
 * - pinch → zoom (1–4×); while zoomed, a drag moves the picture instead
 * - single tap → toggle the controls
 */
export function usePlayerGestures(options: PlayerGestureOptions) {
  const latest = useLatestRef(options);
  const [feedback, setFeedback] = useState<GestureFeedback | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipChain = useRef<{
    direction: 1 | -1;
    total: number;
    at: number;
  } | null>(null);
  const boosting = useRef(false);
  const session = useRef<PanSession>({
    intent: null,
    startX: 0,
    startZoom: NO_ZOOM,
    startTime: 0,
    startLevel: 0,
    target: 0,
  });
  const pinchStart = useRef<Zoom>(NO_ZOOM);

  const { locked, toggles } = options;
  const zoomEnabled = !locked && toggles.zoom;
  const panEnabled =
    !locked &&
    (toggles.brightness || toggles.volume || toggles.seek || toggles.zoom);
  const doubleTapEnabled = !locked && toggles.doubleTap;
  const holdEnabled = !locked && toggles.holdForSpeed;

  const cancelHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const showFeedback = useCallback(
    (next: GestureFeedback) => {
      cancelHide();
      setFeedback(next);
    },
    [cancelHide],
  );

  const hideFeedbackSoon = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => setFeedback(null), FEEDBACK_LINGER_MS);
  }, [cancelHide]);

  useEffect(() => cancelHide, [cancelHide]);

  const applyPan = useCallback(
    (translationX: number, translationY: number) => {
      const current = session.current;
      const { layout, duration, brightness, volume } = latest.current;
      if (current.intent === 'move') {
        latest.current.onZoomChange({
          scale: current.startZoom.scale,
          offsetX: current.startZoom.offsetX + translationX,
          offsetY: current.startZoom.offsetY + translationY,
        });
      } else if (current.intent === 'seek') {
        current.target = computeSeekTarget(
          current.startTime,
          translationX,
          layout.width,
          duration,
        );
        showFeedback({
          kind: 'seek',
          target: current.target,
          delta: current.target - current.startTime,
          duration,
        });
      } else if (
        current.intent === 'brightness' ||
        current.intent === 'volume'
      ) {
        const control = current.intent === 'brightness' ? brightness : volume;
        const level = computeLevel(
          current.startLevel,
          translationY,
          layout.height,
        );
        control.setLevel(level);
        showFeedback({ kind: current.intent, level });
      }
    },
    [latest, showFeedback],
  );

  const panConfig = useMemo<PanGestureConfig>(
    () => ({
      runOnJS: true,
      testID: 'player-pan',
      enabled: panEnabled,
      minDistance: PAN_ACTIVATION_DISTANCE,
      maxPointers: 1,
      onBegin: event => {
        session.current.startX = event.x;
      },
      onActivate: event => {
        const {
          layout,
          getCurrentTime,
          brightness,
          volume,
          toggles: enabled,
        } = latest.current;
        const current = session.current;
        const zoom = latest.current.getZoom();
        if (zoom.scale > 1) {
          current.intent = 'move';
          current.startZoom = zoom;
          applyPan(event.translationX, event.translationY);
          return;
        }
        const intent = resolvePanIntent(
          current.startX,
          layout.width,
          event.translationX,
          event.translationY,
        );
        const control =
          intent === 'brightness'
            ? brightness
            : intent === 'volume'
            ? volume
            : null;
        const allowed =
          intent === 'seek'
            ? enabled.seek
            : intent === 'brightness'
            ? enabled.brightness && brightness.available
            : enabled.volume && volume.available;
        current.intent = allowed ? intent : null;
        current.startTime = getCurrentTime();
        current.target = current.startTime;
        current.startLevel = control ? control.getLevel() : 0;
        applyPan(event.translationX, event.translationY);
      },
      onUpdate: event => applyPan(event.translationX, event.translationY),
      onDeactivate: event => {
        const current = session.current;
        if (current.intent === 'seek' && !event.canceled) {
          latest.current.seekTo(current.target);
        }
      },
      onFinalize: () => {
        if (session.current.intent && session.current.intent !== 'move') {
          hideFeedbackSoon();
        }
        session.current.intent = null;
      },
    }),
    [applyPan, hideFeedbackSoon, latest, panEnabled],
  );

  const pinchConfig = useMemo<PinchGestureConfig>(
    () => ({
      runOnJS: true,
      testID: 'player-pinch',
      enabled: zoomEnabled,
      onActivate: () => {
        pinchStart.current = latest.current.getZoom();
      },
      onUpdate: event => {
        const start = pinchStart.current;
        const scale = clamp(start.scale * event.scale, 1, MAX_ZOOM);
        latest.current.onZoomChange({ ...start, scale });
        showFeedback({ kind: 'zoom', scale });
      },
      onDeactivate: () => {
        if (latest.current.getZoom().scale < ZOOM_SNAP) {
          latest.current.onZoomChange(NO_ZOOM);
        }
        hideFeedbackSoon();
      },
    }),
    [hideFeedbackSoon, latest, showFeedback, zoomEnabled],
  );

  const doubleTapConfig = useMemo<TapGestureConfig>(
    () => ({
      runOnJS: true,
      testID: 'player-double-tap',
      enabled: doubleTapEnabled,
      numberOfTaps: 2,
      maxDelay: DOUBLE_TAP_MAX_DELAY_MS,
      onActivate: event => {
        const { layout, getCurrentTime, seekTo, togglePlayback, skipSeconds } =
          latest.current;
        const zone = resolveDoubleTapZone(event.x, layout.width);
        if (zone === 'toggle') {
          togglePlayback();
          return;
        }
        const direction = zone === 'forward' ? 1 : -1;
        const now = Date.now();
        const chain = skipChain.current;
        const total =
          chain &&
          chain.direction === direction &&
          now - chain.at < SKIP_CHAIN_MS
            ? chain.total + skipSeconds
            : skipSeconds;
        skipChain.current = { direction, total, at: now };
        seekTo(getCurrentTime() + direction * skipSeconds);
        showFeedback({ kind: 'skip', seconds: direction * total });
        hideFeedbackSoon();
      },
    }),
    [doubleTapEnabled, hideFeedbackSoon, latest, showFeedback],
  );

  const singleTapConfig = useMemo<TapGestureConfig>(
    () => ({
      runOnJS: true,
      testID: 'player-single-tap',
      onActivate: () => latest.current.toggleControls(),
    }),
    [latest],
  );

  const holdConfig = useMemo<LongPressGestureConfig>(
    () => ({
      runOnJS: true,
      testID: 'player-hold',
      enabled: holdEnabled,
      minDuration: HOLD_FOR_SPEED_MS,
      onActivate: () => {
        boosting.current = true;
        latest.current.onBoostChange(true);
        showFeedback({ kind: 'boost' });
      },
      onFinalize: () => {
        if (boosting.current) {
          boosting.current = false;
          latest.current.onBoostChange(false);
          cancelHide();
          setFeedback(null);
        }
      },
    }),
    [cancelHide, holdEnabled, latest, showFeedback],
  );

  const pinch = usePinchGesture(pinchConfig);
  const pan = usePanGesture(panConfig);
  const hold = useLongPressGesture(holdConfig);
  const doubleTap = useTapGesture(doubleTapConfig);
  const singleTap = useTapGesture(singleTapConfig);
  // Single tap waits for the double tap to fail; a pinch, drag or hold beats both.
  const taps = useExclusiveGestures(doubleTap, singleTap);
  const gesture = useCompetingGestures(pinch, pan, hold, taps);

  return { gesture, feedback };
}
