import AsyncStorage from '@react-native-async-storage/async-storage';

import { historyStore } from '../features/history/watchHistory';
import { favoritesStore } from '../features/library/favorites';
import {
  DEFAULT_LIBRARY_PREFS,
  libraryPrefsStore,
} from '../features/library/libraryPrefs';
import { playlistsStore } from '../features/library/playlists';
import { recentSearchesStore } from '../features/library/recentSearches';
import { resetVideoIndex } from '../features/library/services/videoIndex';
import { clearThumbnailMemoryCache } from '../features/library/services/thumbnails';
import {
  activePlaybackStore,
  stopPlayback,
} from '../features/player/nowPlaying';
import {
  DEFAULT_SETTINGS,
  settingsStore,
} from '../features/settings/settingsStore';

/** Writes pending store changes now, which also cancels their debounce timers. */
export async function flushPersistedStores(): Promise<void> {
  await Promise.all(
    [
      settingsStore,
      historyStore,
      libraryPrefsStore,
      favoritesStore,
      playlistsStore,
      recentSearchesStore,
    ].map(store => store.flush()),
  );
}

/** Restores every app-wide store and cache to its first-launch state. */
export function resetAppState(): void {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  settingsStore.setState(DEFAULT_SETTINGS);
  historyStore.setState({});
  libraryPrefsStore.setState(DEFAULT_LIBRARY_PREFS);
  favoritesStore.setState({});
  playlistsStore.setState([]);
  recentSearchesStore.setState([]);
  resetVideoIndex();
  clearThumbnailMemoryCache();
  stopPlayback();
  activePlaybackStore.setState(null);
}
