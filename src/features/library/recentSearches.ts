import { createPersistentStore } from '../../shared/storage/persistentStore';
import { useStore } from '../../shared/storage/store';

export const MAX_RECENT_SEARCHES = 8;
const MAX_QUERY_LENGTH = 100;

const clean = (query: string) => query.trim().slice(0, MAX_QUERY_LENGTH);

/** Keeps only non-empty strings from storage. */
export function parseRecentSearches(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((value): value is string => typeof value === 'string')
    .map(clean)
    .filter(Boolean)
    .slice(0, MAX_RECENT_SEARCHES);
}

export const recentSearchesStore = createPersistentStore<string[]>({
  key: 'zxplayer.recentSearches.v1',
  initial: [],
  parse: parseRecentSearches,
});

/** Puts a query first in the recent searches (once, regardless of case). */
export function rememberSearch(query: string): void {
  const cleaned = clean(query);
  if (!cleaned) {
    return;
  }
  recentSearchesStore.setState(previous =>
    [
      cleaned,
      ...previous.filter(
        item => item.toLocaleLowerCase() !== cleaned.toLocaleLowerCase(),
      ),
    ].slice(0, MAX_RECENT_SEARCHES),
  );
}

export function clearRecentSearches(): void {
  recentSearchesStore.setState([]);
}

export function useRecentSearches(): string[] {
  return useStore(recentSearchesStore, state => state);
}
