import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface Store<T> {
  getState: () => T;
  setState: (next: T | ((previous: T) => T)) => void;
  subscribe: (listener: Listener) => () => void;
}

/** Minimal observable state container shared by hooks via `useStore`. */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    setState(next) {
      const resolved =
        typeof next === 'function' ? (next as (previous: T) => T)(state) : next;
      if (Object.is(resolved, state)) {
        return;
      }
      state = resolved;
      listeners.forEach(listener => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Subscribes to a slice of a store. The selector must return a stable value for an
 * unchanged state (a primitive or an object already held in the state).
 */
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(store.subscribe, () =>
    selector(store.getState()),
  );
}
