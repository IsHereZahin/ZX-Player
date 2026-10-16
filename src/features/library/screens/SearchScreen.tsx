import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SearchField } from '../../../shared/components/SearchField';
import { CircleAlertIcon, SearchIcon } from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { useLastPlayedId } from '../../history/watchHistory';
import { VIDEO_ROW_HEIGHT, VideoRow } from '../components/VideoRow';
import { useVideoActions } from '../hooks/useVideoActions';
import { useVideoSearch } from '../hooks/useVideoSearch';
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
  const trimmed = query.trim();

  const lastIndex = results.length - 1;
  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) => (
      <VideoRow
        video={item}
        onPress={play}
        onMore={openMenu}
        highlighted={item.id === lastPlayedId}
        separator={index < lastIndex}
      />
    ),
    [lastIndex, lastPlayedId, openMenu, play],
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
  count: {
    ...typography.overline,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    color: colors.textSecondary,
  },
}));
