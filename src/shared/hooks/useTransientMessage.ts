import { useCallback, useEffect, useRef, useState } from 'react';

/** A short-lived message (toast) that clears itself after `durationMs`. */
export function useTransientMessage(durationMs = 1600) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setMessage(next);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  return [message, show] as const;
}
