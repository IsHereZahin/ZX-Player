import { useEffect, useState } from 'react';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';

export type SleepTimer =
  | { kind: 'minutes'; minutes: number; endsAt: number }
  | { kind: 'end-of-video' }
  | null;

/** The quick choices; anything else is set through "Custom". */
export const SLEEP_TIMER_MINUTES = [15, 30, 45] as const;
/** Longest custom timer: ten hours. */
export const MAX_SLEEP_MINUTES = 600;

/** Whole minutes typed for a custom timer, or null when not a usable number. */
export function parseSleepMinutes(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) {
    return null;
  }
  const minutes = Number(text.trim());
  return minutes >= 1 && minutes <= MAX_SLEEP_MINUTES ? minutes : null;
}

export function sleepTimerFor(
  minutes: number,
  now: number = Date.now(),
): SleepTimer {
  return { kind: 'minutes', minutes, endsAt: now + minutes * 60_000 };
}

export function describeSleepTimer(
  timer: SleepTimer,
  now: number = Date.now(),
): string {
  if (!timer) {
    return 'Off';
  }
  if (timer.kind === 'end-of-video') {
    return 'End of video';
  }
  const minutesLeft = Math.max(1, Math.ceil((timer.endsAt - now) / 60000));
  return `${minutesLeft} min left`;
}

/**
 * Pauses playback after a delay. The "end of video" variant is handled by the player when
 * a video finishes, so it only needs to be stored here.
 */
export function useSleepTimer(onExpire: () => void) {
  const [timer, setTimer] = useState<SleepTimer>(null);
  const latest = useLatestRef(onExpire);

  useEffect(() => {
    if (timer?.kind !== 'minutes') {
      return;
    }
    const id = setTimeout(() => {
      setTimer(null);
      latest.current();
    }, Math.max(0, timer.endsAt - Date.now()));
    return () => clearTimeout(id);
  }, [latest, timer]);

  return { timer, setTimer };
}
