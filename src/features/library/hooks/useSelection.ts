import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';

import type { VideoItem } from '../types';

const NONE: ReadonlySet<string> = new Set();

/**
 * Multi-select for a list: a long press starts it, presses then toggle items, and the
 * Android back button ends it first. Items that leave the list leave the selection.
 */
export function useSelection(items: readonly VideoItem[]) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(NONE);
  const selecting = selectedIds.size > 0;

  const toggle = useCallback((item: VideoItem) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(NONE), []);

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(item.id)),
    [items, selectedIds],
  );
  const allSelected = selecting && selectedItems.length === items.length;

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? NONE : new Set(items.map(item => item.id)));
  }, [allSelected, items]);

  // Deleted or moved items drop out of the selection.
  useEffect(() => {
    setSelectedIds(previous => {
      if (previous.size === 0) {
        return previous;
      }
      const present = new Set(items.map(item => item.id));
      const kept = [...previous].filter(id => present.has(id));
      return kept.length === previous.size ? previous : new Set(kept);
    });
  }, [items]);

  useEffect(() => {
    if (!selecting) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        clear();
        return true;
      },
    );
    return () => subscription.remove();
  }, [clear, selecting]);

  return {
    selecting,
    selectedIds,
    selectedItems,
    allSelected,
    toggle,
    toggleAll,
    clear,
  };
}
