import React, { useCallback, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackScreenProps } from '../../../app/navigation/types';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  SearchIcon,
  XIcon,
} from '../../../shared/icons';
import { radius, spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { useLastPlayedId } from '../../history/watchHistory';
import { VIDEO_ROW_HEIGHT, VideoRow } from '../components/VideoRow';
import { useVideoActions } from '../hooks/useVideoActions';
import { useVideoSearch } from '../hooks/useVideoSearch';
import { SCOPE_COPY } from '../scopeCopy';
import type { VideoItem } from '../types';

type Props = RootStackScreenProps<'Search'>;

export function SearchScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const scope = route.params?.scope ?? 'video';
  const copy = SCOPE_COPY[scope];
  const { results, loading, failed, retry } = useVideoSearch(query, scope);
  const { play, openMenu, sheets } = useVideoActions(results);
  const lastPlayedId = useLastPlayedId();
  const trimmed = query.trim();

  const renderItem = useCallback(
    ({ item }: { item: VideoItem }) => (
      <VideoRow
        video={item}
        onPress={play}
        onMore={openMenu}
        highlighted={item.id === lastPlayedId}
      />
    ),
    [lastPlayedId, openMenu, play],
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
            paddingTop: insets.top + spacing.xs,
            paddingLeft: Math.max(insets.left, spacing.xs),
            paddingRight: Math.max(insets.right, spacing.lg),
          },
        ]}
      >
        <IconButton
          icon={ArrowLeftIcon}
          accessibilityLabel="Back"
          onPress={navigation.goBack}
        />
        <View style={styles.field}>
          <SearchIcon size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchLabel}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primaryBright}
            cursorColor={colors.primaryBright}
            style={styles.input}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={copy.searchLabel}
            testID="search-input"
          />
          {query ? (
            <IconButton
              icon={XIcon}
              size="sm"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
            />
          ) : null}
        </View>
      </View>
      {renderBody()}
      {sheets}
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  field: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: 0,
    color: colors.textPrimary,
  },
  count: {
    ...typography.label,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    color: colors.textSecondary,
  },
}));
