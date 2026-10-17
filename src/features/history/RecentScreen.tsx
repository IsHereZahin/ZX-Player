import React, { useCallback, useMemo } from 'react';
import { Alert, Animated, Text, View } from 'react-native';

import type { MainTabScreenProps } from '../../app/navigation/types';
import { useBottomInset } from '../../app/navigation/useBottomInset';
import { EmptyState } from '../../shared/components/EmptyState';
import { IconButton } from '../../shared/components/IconButton';
import {
  HeaderGlow,
  ScreenHeader,
  useHidingHeader,
} from '../../shared/components/ScreenHeader';
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
  const header = useHidingHeader();
  const bottom = useBottomInset();
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
  const clearButton =
    history.length > 0 ? (
      <IconButton
        icon={Trash2Icon}
        variant="raised"
        accessibilityLabel="Clear watch history"
        onPress={confirmClearHistory}
        testID="clear-history"
      />
    ) : null;

  return (
    <View style={styles.screen}>
      <HeaderGlow scrollY={header.scrollY} />
      {sections.length === 0 ? (
        <View
          style={[
            styles.fill,
            { paddingTop: header.height, paddingBottom: bottom },
          ]}
        >
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
          ListHeaderComponent={<View style={{ height: header.height }} />}
          onScroll={header.onScroll}
          scrollEventThrottle={16}
          keyExtractor={video => video.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {section.title}
            </Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: bottom + spacing.lg }}
          testID="recent-list"
        />
      )}
      <ScreenHeader title="Recent" actions={clearButton} hiding={header} />
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
  sectionTitle: {
    ...typography.overline,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    color: colors.textSecondary,
  },
}));
