import React, { useCallback, useMemo } from 'react';
import { Alert, Animated, Text, View } from 'react-native';

import type { MainTabScreenProps } from '../../app/navigation/types';
import { EmptyState } from '../../shared/components/EmptyState';
import { IconButton } from '../../shared/components/IconButton';
import {
  LargeTitle,
  NavigationBar,
  useCollapsingTitle,
} from '../../shared/components/NavigationBar';
import { HistoryIcon, Trash2Icon } from '../../shared/icons';
import { spacing, typography } from '../../shared/theme';
import { makeStyles } from '../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../shared/utils/listTuning';
import { VideoRow } from '../library/components/VideoRow';
import { useVideoActions } from '../library/hooks/useVideoActions';
import { isAudioLibrarySupported } from '../library/services/mediaLibrary';
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
  const styles = useStyles();
  const history = useHistoryList();
  const { scrollY, onScroll } = useCollapsingTitle();
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
    ({
      item,
      index,
      section,
    }: {
      item: VideoItem;
      index: number;
      section: Section;
    }) => (
      <VideoRow
        video={item}
        onPress={play}
        onMore={openMenu}
        separator={index < section.data.length - 1}
      />
    ),
    [openMenu, play],
  );
  const clearButton =
    history.length > 0 ? (
      <IconButton
        icon={Trash2Icon}
        variant="plain"
        accessibilityLabel="Clear watch history"
        onPress={confirmClearHistory}
        testID="clear-history"
      />
    ) : null;

  return (
    <View style={styles.screen}>
      <NavigationBar
        title="Recent"
        scrollY={scrollY}
        tone="plain"
        right={clearButton}
      />
      {sections.length === 0 ? (
        <View style={styles.fill}>
          <LargeTitle title="Recent" />
          <EmptyState
            icon={HistoryIcon}
            title="Nothing watched yet"
            message={
              isAudioLibrarySupported()
                ? 'Videos and audio you play appear here, so you can pick up right where you left off.'
                : 'Videos you play appear here, so you can pick up right where you left off.'
            }
            testID="recent-empty"
          />
        </View>
      ) : (
        <Animated.SectionList
          {...MEDIA_LIST_TUNING}
          sections={sections}
          ListHeaderComponent={<LargeTitle title="Recent" />}
          onScroll={onScroll}
          scrollEventThrottle={16}
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

const useStyles = makeStyles(colors => ({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  fill: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.title3,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
  },
}));
