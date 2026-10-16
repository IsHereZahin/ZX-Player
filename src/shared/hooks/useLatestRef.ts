import { useLayoutEffect, useRef } from 'react';

/**
 * Ref that always holds the latest render's value, so long-lived callbacks (gesture
 * handlers, timers) can read fresh props without being recreated.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
