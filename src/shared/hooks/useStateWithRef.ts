import { useCallback, useRef, useState } from 'react';

/**
 * State mirrored into a ref, for values that both drive rendering and are read
 * synchronously inside callbacks (where the state variable could be stale).
 */
export function useStateWithRef<T>(initial: T) {
  const [state, setState] = useState(initial);
  const ref = useRef(initial);
  const set = useCallback((value: T) => {
    ref.current = value;
    setState(value);
  }, []);
  return [state, set, ref] as const;
}
