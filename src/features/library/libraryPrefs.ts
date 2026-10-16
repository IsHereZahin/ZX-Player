import {
  createPersistentStore,
  isRecord,
} from '../../shared/storage/persistentStore';
import { useStore } from '../../shared/storage/store';

export const SORT_KEYS = ['date', 'name', 'duration', 'size'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'list' | 'grid';

export interface LibraryPrefs {
  sortKey: SortKey;
  sortDirection: SortDirection;
  viewMode: ViewMode;
}

export const DEFAULT_LIBRARY_PREFS: LibraryPrefs = {
  sortKey: 'date',
  sortDirection: 'desc',
  viewMode: 'list',
};

export function parseLibraryPrefs(raw: unknown): LibraryPrefs {
  if (!isRecord(raw)) {
    return DEFAULT_LIBRARY_PREFS;
  }
  return {
    sortKey: SORT_KEYS.includes(raw.sortKey as SortKey)
      ? (raw.sortKey as SortKey)
      : DEFAULT_LIBRARY_PREFS.sortKey,
    sortDirection:
      raw.sortDirection === 'asc' || raw.sortDirection === 'desc'
        ? raw.sortDirection
        : DEFAULT_LIBRARY_PREFS.sortDirection,
    viewMode:
      raw.viewMode === 'list' || raw.viewMode === 'grid'
        ? raw.viewMode
        : DEFAULT_LIBRARY_PREFS.viewMode,
  };
}

export const libraryPrefsStore = createPersistentStore({
  key: 'zxplayer.library-prefs.v1',
  initial: DEFAULT_LIBRARY_PREFS,
  parse: parseLibraryPrefs,
});

export function useLibraryPrefs(): LibraryPrefs {
  return useStore(libraryPrefsStore, state => state);
}

export function updateLibraryPrefs(patch: Partial<LibraryPrefs>): void {
  libraryPrefsStore.setState(previous => ({ ...previous, ...patch }));
}
