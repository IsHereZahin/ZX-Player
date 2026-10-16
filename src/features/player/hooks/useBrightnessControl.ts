import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import {
  getBrightness,
  isBrightnessSupported,
  resetBrightness,
  setBrightness,
} from 'zxplayer-brightness';

import { reportError } from '../../../shared/logger';
import { roundLevel, type LevelControl } from './levelControl';

const FALLBACK_LEVEL = 0.5;

/**
 * Brightness for the lifetime of the player. The user's level is applied only while the
 * full player is on screen and ZX Player is in the foreground; the system level is
 * restored otherwise (minimised, backgrounded, closed), because iOS brightness is
 * device-wide.
 */
export function useBrightnessControl(active = true): LevelControl {
  const baselineRef = useRef(FALLBACK_LEVEL);
  // Level chosen by the user in this session; null until they first adjust it.
  const userLevelRef = useRef<number | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    const userLevel = userLevelRef.current;
    if (userLevel === null) {
      return;
    }
    if (active) {
      setBrightness(userLevel);
    } else {
      resetBrightness();
    }
  }, [active]);

  useEffect(() => {
    let mounted = true;
    getBrightness()
      .then(level => {
        if (mounted && level !== null) {
          baselineRef.current = level;
        }
      })
      .catch(error => reportError('Reading brightness failed', error));

    const subscription = AppState.addEventListener('change', state => {
      const userLevel = userLevelRef.current;
      if (userLevel === null || !activeRef.current) {
        return;
      }
      if (state === 'active') {
        setBrightness(userLevel);
      } else if (state === 'background') {
        resetBrightness();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
      resetBrightness();
    };
  }, []);

  const getLevel = useCallback(
    () => userLevelRef.current ?? baselineRef.current,
    [],
  );

  const setLevel = useCallback((level: number) => {
    const next = roundLevel(level);
    if (next === userLevelRef.current) {
      return;
    }
    userLevelRef.current = next;
    setBrightness(next);
  }, []);

  return useMemo(
    () => ({ available: isBrightnessSupported, getLevel, setLevel }),
    [getLevel, setLevel],
  );
}
