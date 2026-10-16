import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SearchField } from '../../../shared/components/SearchField';
import { ClockIcon, CircleAlertIcon, SearchIcon } from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { useLastPlayedId } from '../../history/watchHistory';
import { VIDEO_ROW_HEIGHT, VideoRow } from '../components/VideoRow';
import { useVideoActions } from '../hooks/useVideoActions';
import { useVideoSearch } from '../hooks/useVideoSearch';
import {
  clearRecentSearches,
  rememberSearch,
  useRecentSearches,
} from '../recentSearches';
import { SCOPE_COPY } from '../scopeCopy';
import type { VideoItem } from '../types';

type Props = LibraryStackScreenProps<'Search'>;

export function SearchScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { scope } = route.params;
  const copy = SCOPE_COPY[scope];
  const { results, loading, failed, retry } = useVideoSearch(query, scope);
  const { play, openMenu, sheets } = useVideoActions(results);
  const lastPlayedId = useLastPlayedId();
  const recentSearches = useRecentSearches();
  const trimmed = query.trim();
  const queryRef = useLatestRef(query);

  // Opening a result is what makes a search worth remembering.
  const playResult = useCallback(
    (video: VideoItem, fromStart?: boolean) => {
      rememberSearch(queryRef.current);
      play(video, fromStart);
    },
    [play, queryRef],
  );

  const lastIndex = results.length - 1;
  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) => (
      <VideoRow
        video={item}
        onPress={playResult}
        onMore={openMenu}
        highlighted={item.id === lastPlayedId}
        separator={index < lastIndex}
      />
    ),
    [lastIndex, lastPlayedId, openMenu, playResult],
  );

  const renderBody = () => {
    if (failed) {
      return (
        <EmptyState
          icon={CircleAlertIcon}
          title="Couldn't search your library"
          message="Something went wrong while reading your library."
          actionLabel="Try again"
          onAction={retry}
          testID="search-error"
        />
      );
    }
    if (!trimmed && recentSearches.length > 0) {
      return (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle} accessibilityRole="header">
              Recent Searches
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
              onPress={clearRecentSearches}
              hitSlop={8}
              testID="clear-recent-searches"
            >
              <Text style={styles.recentClear}>Clear</Text>
            </Pressable>
          </View>
          {recentSearches.map(recent => (
            <Pressable
              key={recent}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${recent}`}
              onPress={() => setQuery(recent)}
              style={({ pressed }) => [
                styles.recentRow,
                pressed && styles.recentPressed,
              ]}
            >
              <ClockIcon size={18} color={styles.recentIcon.color} />
              <Text style={styles.recentText} numberOfLines={1}>
                {recent}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      );
    }
    if (!trimmed) {
      return (
        <EmptyState
          icon={SearchIcon}
          title="Search your library"
          message={
            scope === 'video'
              ? 'Find any video on this device by its name.'
              : 'Find anything by its name, title, artist or album.'
          }
          testID="search-idle"
        />
      );
    }
    if (loading) {
      return <EmptyState loading testID="search-loading" />;
    }
    if (results.length === 0) {
      return (
        <EmptyState
          icon={SearchIcon}
          title="No matches"
          message={copy.noMatches(trimmed)}
          testID="search-empty"
        />
      );
    }
    return (
      <FlatList
        {...MEDIA_LIST_TUNING}
        data={results}
        keyExtractor={video => video.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        getItemLayout={(_, index) => ({
          length: VIDEO_ROW_HEIGHT,
          offset: VIDEO_ROW_HEIGHT * index,
          index,
        })}
        ListHeaderComponent={
          <Text style={styles.count}>
            {results.length === 1 ? '1 result' : `${results.length} results`}
          </Text>
        }
        testID="search-results"
      />
    );
  };

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            paddingLeft: Math.max(insets.left, spacing.lg),
            paddingRight: Math.max(insets.right, spacing.lg),
          },
        ]}
      >
        <View style={styles.field}>
          <SearchField
            placeholder={copy.searchLabel}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => rememberSearch(query)}
            autoFocus
            testID="search-input"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={navigation.goBack}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.dimmed}
          testID="search-cancel"
        >
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      {renderBody()}
      {sheets}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  field: {
    flex: 1,
  },
  cancel: {
    ...typography.body,
    color: colors.primaryText,
  },
  dimmed: {
    opacity: 0.4,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  recentTitle: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  recentClear: {
    ...typography.body,
    color: colors.primaryText,
  },
  recentRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  recentPressed: {
    backgroundColor: colors.pressed,
  },
  recentIcon: {
    color: colors.textSecondary,
  },
  recentText: {
    ...typography.body,
    flex: 1,
    color: colors.primaryText,
  },
  count: {
    ...typography.overline,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    color: colors.textSecondary,
  },
}));
