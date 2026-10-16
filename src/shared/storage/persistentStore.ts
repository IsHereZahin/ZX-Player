import AsyncStorage from '@react-native-async-storage/async-storage';

import { reportError } from '../logger';
import { createStore, type Store } from './store';

export interface PersistentStore<T> extends Store<T> {
  /** Loads the saved state; keeps the defaults if nothing valid is stored. */
  hydrate: () => Promise<void>;
  /** Writes any pending change immediately (e.g. when the app is backgrounded). */
  flush: () => Promise<void>;
}

interface PersistentStoreOptions<T> {
  key: string;
  initial: T;
  /** Validates stored JSON (which may be stale or corrupt) and fills in defaults. */
  parse: (raw: unknown) => T;
  writeDelayMs?: number;
}

/** A store whose state survives restarts. Writes are debounced to batch rapid updates. */
export function createPersistentStore<T>({
  key,
  initial,
  parse,
  writeDelayMs = 500,
}: PersistentStoreOptions<T>): PersistentStore<T> {
  const store = createStore(initial);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;

  const write = async () => {
    timer = null;
    if (!dirty) {
      return;
    }
    dirty = false;
    try {
      await AsyncStorage.setItem(key, JSON.stringify(store.getState()));
    } catch (error) {
      reportError(`Saving "${key}" failed`, error);
    }
  };

  return {
    ...store,
    setState(next) {
      const before = store.getState();
      store.setState(next);
      if (store.getState() === before) {
        return;
      }
      dirty = true;
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(write, writeDelayMs);
    },
    async hydrate() {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw !== null) {
          store.setState(parse(JSON.parse(raw)));
        }
      } catch (error) {
        reportError(`Loading "${key}" failed`, error);
      }
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
      }
      await write();
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
