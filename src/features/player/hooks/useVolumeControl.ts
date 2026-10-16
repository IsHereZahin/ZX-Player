import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  addVolumeListener,
  getVolume,
  setVolume,
} from 'react-native-volume-manager';

import { reportError } from '../../../shared/logger';
import { roundLevel, type LevelControl } from './levelControl';

/** Media volume, kept in sync with hardware volume buttons. */
export function useVolumeControl(): LevelControl {
  const levelRef = useRef(0.5);

  useEffect(() => {
    let active = true;
    getVolume()
      .then(result => {
        if (active) {
          levelRef.current = result.volume;
        }
      })
      .catch(error => reportError('Reading volume failed', error));

    const subscription = addVolumeListener(result => {
      levelRef.current = result.volume;
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const getLevel = useCallback(() => levelRef.current, []);

  const setLevel = useCallback((level: number) => {
    const next = roundLevel(level);
    if (next === roundLevel(levelRef.current)) {
      return;
    }
    levelRef.current = next;
    // The on-screen gesture indicator replaces the system volume HUD.
    setVolume(next, { type: 'music', showUI: false }).catch(error =>
      reportError('Setting volume failed', error),
    );
  }, []);

  return useMemo(
    () => ({ available: true, getLevel, setLevel }),
    [getLevel, setLevel],
  );
}
