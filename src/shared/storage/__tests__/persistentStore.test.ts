import AsyncStorage from '@react-native-async-storage/async-storage';

import { reportError } from '../../logger';
import { createPersistentStore, isRecord } from '../persistentStore';

const parseCounter = (raw: unknown) =>
  isRecord(raw) && typeof raw.count === 'number'
    ? { count: raw.count }
    : { count: 0 };

function makeStore() {
  return createPersistentStore({
    key: 'test.counter',
    initial: { count: 0 },
    parse: parseCounter,
    writeDelayMs: 500,
  });
}

describe('createPersistentStore', () => {
  it('hydrates from storage through the validator', async () => {
    await AsyncStorage.setItem('test.counter', JSON.stringify({ count: 7 }));
    const store = makeStore();
    await store.hydrate();
    expect(store.getState()).toEqual({ count: 7 });
  });

  it('keeps defaults when stored data is corrupt', async () => {
    await AsyncStorage.setItem('test.counter', '{not json');
    const store = makeStore();
    await store.hydrate();
    expect(store.getState()).toEqual({ count: 0 });
    expect(reportError).toHaveBeenCalledWith(
      'Loading "test.counter" failed',
      expect.any(SyntaxError),
    );
  });

  it('batches rapid changes into one debounced write', async () => {
    jest.useFakeTimers();
    try {
      const store = makeStore();
      store.setState({ count: 1 });
      store.setState({ count: 2 });
      store.setState(previous => ({ count: previous.count + 1 }));
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(500);
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'test.counter',
        '{"count":3}',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('writes immediately on flush and skips unchanged state', async () => {
    const store = makeStore();
    const state = store.getState();
    store.setState(state);
    await store.flush();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    store.setState({ count: 5 });
    await store.flush();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'test.counter',
      '{"count":5}',
    );
  });

  it('notifies subscribers of changes', () => {
    const store = makeStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    store.setState({ count: 1 });
    unsubscribe();
    store.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
