import React from 'react';
import { Text, View } from 'react-native';

import { OptionRow, Sheet } from '../../../shared/components/Sheet';
import {
  CircleCheckIcon,
  HeartIcon,
  InfoIcon,
  PlayIcon,
  RotateCcwIcon,
  Trash2Icon,
} from '../../../shared/icons';
import { spacing, typography } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatResolution,
} from '../../../shared/utils/format';
import {
  clearProgress,
  isFinished,
  markWatched,
  removeFromHistory,
  resumePosition,
  useWatchEntry,
} from '../../history/watchHistory';
import { toggleFavorite, useIsFavorite } from '../favorites';
import type { ExtraAction } from '../hooks/useVideoActions';
import type { SortDirection, SortKey } from '../libraryPrefs';
import { describeFileName } from '../services/mediaLibrary';
import type { VideoItem } from '../types';
import { SORT_OPTIONS } from '../utils/sortVideos';
import { describeVideo } from './videoMeta';

interface VideoActionsSheetProps {
  video: VideoItem;
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  onPlay: (video: VideoItem, fromStart: boolean) => void;
  onShowInfo: (video: VideoItem) => void;
  /** Screen-specific options, listed last. */
  extraActions?: ExtraAction[];
}

/** Per-video menu opened from the "more" button on rows and cards. */
export function VideoActionsSheet({
  video,
  visible,
  onClose,
  onDismissed,
  onPlay,
  onShowInfo,
  extraActions = [],
}: VideoActionsSheetProps) {
  const entry = useWatchEntry(video.id);
  const { title, details } = describeVideo(video, entry);
  const resumeAt = resumePosition(entry);
  const isAudio = video.kind === 'audio';
  const favorite = useIsFavorite(video.id);
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={title}
      subtitle={details}
      testID="video-actions"
    >
      <OptionRow
        icon={PlayIcon}
        label={
          resumeAt !== null ? `Resume from ${formatDuration(resumeAt)}` : 'Play'
        }
        onPress={run(() => onPlay(video, false))}
        testID="action-play"
      />
      {resumeAt !== null ? (
        <OptionRow
          icon={RotateCcwIcon}
          label="Play from beginning"
          onPress={run(() => onPlay(video, true))}
          testID="action-play-from-start"
        />
      ) : null}
      {entry && isFinished(entry) ? (
        <OptionRow
          icon={CircleCheckIcon}
          label={isAudio ? 'Mark as not played' : 'Mark as unwatched'}
          onPress={run(() => clearProgress(video.id))}
          testID="action-mark-unwatched"
        />
      ) : (
        <OptionRow
          icon={CircleCheckIcon}
          label={isAudio ? 'Mark as played' : 'Mark as watched'}
          onPress={run(() => markWatched(video))}
          testID="action-mark-watched"
        />
      )}
      <OptionRow
        icon={HeartIcon}
        label={favorite ? 'Remove from Favorites' : 'Add to Favorites'}
        onPress={run(() => toggleFavorite(video))}
        testID="action-favorite"
      />
      <OptionRow
        icon={InfoIcon}
        label={isAudio ? 'Details' : 'Video details'}
        onPress={run(() => onShowInfo(video))}
        testID="action-info"
      />
      {entry ? (
        <OptionRow
          icon={Trash2Icon}
          label="Remove from history"
          destructive
          onPress={run(() => removeFromHistory(video.id))}
          testID="action-remove-history"
        />
      ) : null}
      {extraActions.map(action => (
        <OptionRow
          key={action.label}
          icon={action.icon}
          label={action.label}
          destructive={action.destructive}
          onPress={run(action.onPress)}
          testID={action.testID}
        />
      ))}
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  const styles = useStyles();
  if (!value) {
    return null;
  }
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>
        {value}
      </Text>
    </View>
  );
}

export function VideoInfoSheet({
  video,
  visible,
  onClose,
}: {
  video: VideoItem;
  visible: boolean;
  onClose: () => void;
}) {
  const { extension } = describeFileName(video.fileName);
  const quality = formatResolution(video.width, video.height);
  const resolution =
    video.width > 0 && video.height > 0
      ? `${video.width} × ${video.height}${quality ? ` (${quality})` : ''}`
      : null;

  const isAudio = video.kind === 'audio';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isAudio ? 'Audio details' : 'Video details'}
      testID="video-info"
    >
      {isAudio ? (
        <>
          <InfoRow label="Title" value={video.title ?? null} />
          <InfoRow label="Artist" value={video.artist ?? null} />
          <InfoRow label="Album" value={video.album ?? null} />
        </>
      ) : null}
      <InfoRow label="File name" value={video.fileName} />
      <InfoRow
        label="Duration"
        value={video.durationSec > 0 ? formatDuration(video.durationSec) : null}
      />
      <InfoRow label="Resolution" value={resolution} />
      <InfoRow label="Size" value={formatBytes(video.sizeBytes)} />
      <InfoRow label="Format" value={extension} />
      <InfoRow label="Modified" value={formatDate(video.modifiedAtSec)} />
    </Sheet>
  );
}

interface SortSheetProps {
  visible: boolean;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSelect: (key: SortKey, direction: SortDirection) => void;
  onClose: () => void;
}

export function SortSheet({
  visible,
  sortKey,
  sortDirection,
  onSelect,
  onClose,
}: SortSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Sort by"
      testID="sort-sheet"
    >
      {SORT_OPTIONS.map(option => (
        <OptionRow
          key={`${option.key}-${option.direction}`}
          label={option.label}
          selected={
            option.key === sortKey && option.direction === sortDirection
          }
          onPress={() => {
            onSelect(option.key, option.direction);
            onClose();
          }}
          testID={`sort-${option.key}-${option.direction}`}
        />
      ))}
    </Sheet>
  );
}

const useStyles = makeStyles(colors => ({
  infoRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  infoLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
}));
