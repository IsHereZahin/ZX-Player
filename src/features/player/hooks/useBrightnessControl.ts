import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import {
  getBrightness,
  isBrightnessSupported,
  resetBrightness,
  setBrightness,
} from 'playz-brightness';

import { reportError } from '../../../shared/logger';
import { roundLevel, type LevelControl } from './levelControl';

const FALLBACK_LEVEL = 0.5;

/**
 * Brightness for the lifetime of the player. The user's level is applied only while
 * Play-Z is in the foreground and the system level is restored when the player closes,
 * because iOS brightness is device-wide.
 */
export function useBrightnessControl(): LevelControl {
  const baselineRef = useRef(FALLBACK_LEVEL);
  // Level chosen by the user in this session; null until they first adjust it.
  const userLevelRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    getBrightness()
      .then(level => {
        if (active && level !== null) {
          baselineRef.current = level;
        }
      })
      .catch(error => reportError('Reading brightness failed', error));

    const subscription = AppState.addEventListener('change', state => {
      const userLevel = userLevelRef.current;
      if (userLevel === null) {
        return;
      }
      if (state === 'active') {
        setBrightness(userLevel);
      } else if (state === 'background') {
        resetBrightness();
      }
    });

    return () => {
      active = false;
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
