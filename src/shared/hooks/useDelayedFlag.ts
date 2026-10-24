import { useEffect, useState } from 'react';

/** `value`, but it only turns true once it has stayed true for `delayMs`. */
export function useDelayedFlag(value: boolean, delayMs: number): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!value) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);
  return value && settled;
}
