import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { historyStore } from '../features/history/watchHistory';
import { libraryPrefsStore } from '../features/library/libraryPrefs';
import { settingsStore } from '../features/settings/settingsStore';

const PERSISTED_STORES = [settingsStore, historyStore, libraryPrefsStore];

/**
 * Loads saved state before the first screen renders, and writes pending changes as soon
 * as the app leaves the foreground (it may be killed without further notice).
 */
export function usePersistedStores(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all(PERSISTED_STORES.map(store => store.hydrate())).finally(() => {
      if (active) {
        setReady(true);
      }
    });

    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        PERSISTED_STORES.forEach(store => store.flush());
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return ready;
}
