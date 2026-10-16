import { Platform } from 'react-native';

/**
 * Windowing for long media lists. Smaller batches and window than FlatList's defaults keep
 * fewer thumbnail rows mounted, so fast flings stay smooth on mid-range phones.
 */
export const MEDIA_LIST_TUNING = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 8,
  windowSize: 7,
  // Detaching off-screen rows saves draw time on Android; on iOS it can blank rows.
  removeClippedSubviews: Platform.OS === 'android',
} as const;
