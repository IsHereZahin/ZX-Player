/**
 * Lists must not clip off-screen rows: FlatList does by default on Android, and a list
 * in a tab that was hidden and shown again can then stay blank until it is scrolled.
 */
export const NO_CLIPPING = { removeClippedSubviews: false } as const;

/**
 * Windowing for long media lists. Smaller batches and window than FlatList's defaults keep
 * fewer thumbnail rows mounted, so fast flings stay smooth on mid-range phones.
 */
export const MEDIA_LIST_TUNING = {
  ...NO_CLIPPING,
  initialNumToRender: 10,
  maxToRenderPerBatch: 8,
  windowSize: 7,
} as const;
