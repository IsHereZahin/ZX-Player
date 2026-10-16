import React, { useCallback, useMemo } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';

import type { MainTabScreenProps } from '../../app/navigation/types';
import { EmptyState } from '../../shared/components/EmptyState';
import { IconButton } from '../../shared/components/IconButton';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
import { HistoryIcon, Trash2Icon } from '../../shared/icons';
import { colors, spacing, typography } from '../../shared/theme';
import { MEDIA_LIST_TUNING } from '../../shared/utils/listTuning';
import { VideoRow } from '../library/components/VideoRow';
import { useVideoActions } from '../library/hooks/useVideoActions';
import type { VideoItem } from '../library/types';
import { clearHistory, isInProgress, useHistoryList } from './watchHistory';

type Props = MainTabScreenProps<'Recent'>;

interface Section {
  title: string;
  data: VideoItem[];
}

export function confirmClearHistory(): void {
  Alert.alert(
    'Clear watch history?',
    'Saved playback positions and your recently played list will be removed.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearHistory },
    ],
  );
}

export function RecentScreen(_props: Props) {
  const history = useHistoryList();
  const { sections, queue } = useMemo(() => {
    const inProgress = history.filter(isInProgress).map(entry => entry.video);
    const played = history
      .filter(entry => !isInProgress(entry))
      .map(entry => entry.video);
    const result: Section[] = [];
    if (inProgress.length > 0) {
      result.push({ title: 'Continue watching', data: inProgress });
    }
    if (played.length > 0) {
      result.push({ title: 'Recently played', data: played });
    }
    return { sections: result, queue: [...inProgress, ...played] };
  }, [history]);
  const { play, openMenu, sheets } = useVideoActions(queue);

  const renderItem = useCallback(
    ({ item }: { item: VideoItem }) => (
      <VideoRow video={item} onPress={play} onMore={openMenu} />
    ),
    [openMenu, play],
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Recent"
        actions={
          history.length > 0 ? (
            <IconButton
              icon={Trash2Icon}
              accessibilityLabel="Clear watch history"
              onPress={confirmClearHistory}
              testID="clear-history"
            />
          ) : null
        }
      />
      {sections.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Nothing watched yet"
          message="Videos you play appear here, so you can pick up right where you left off."
          testID="recent-empty"
        />
      ) : (
        <SectionList
          {...MEDIA_LIST_TUNING}
          sections={sections}
          keyExtractor={video => video.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {section.title}
            </Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          testID="recent-list"
        />
      )}
      {sheets}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.headline,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    color: colors.textPrimary,
  },
});
