import React, { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as nativeMedia from 'zxplayer-media';

import { useOpenPlayer } from '../../../app/navigation/useOpenPlayer';
import { useAfterSheetClose } from '../../../shared/components/Sheet';
import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import type { IconComponent } from '../../../shared/icons';
import { reportError } from '../../../shared/logger';
import { VideoActionsSheet, VideoInfoSheet } from '../components/VideoSheets';
import { mediaTitle } from '../services/mediaLibrary';
import type { VideoItem } from '../types';
import { useFileActions } from './useFileActions';
import { usePlaylistAdder } from './usePlaylistAdder';

/** An extra option in an item's menu, e.g. "Remove from Playlist". */
export interface ExtraAction {
  label: string;
  icon: IconComponent;
  destructive?: boolean;
  onPress: () => void;
  testID?: string;
}

/** Sharing hands the library file to Android's share sheet; iOS has no equivalent here. */
const canShare = () =>
  Platform.OS === 'android' && nativeMedia.isNativeMediaAvailable;

function share(video: VideoItem) {
  nativeMedia
    .shareMedia(video.uri, mediaTitle(video))
    .catch(error => reportError('Sharing failed', error));
}

interface VideoActionsOptions {
  /** Screen-specific options added to each item's menu. */
  extraActions?: (video: VideoItem) => ExtraAction[];
  /** After files were deleted, moved or copied (e.g. to end a selection). */
  onFilesChanged?: () => void;
}

/**
 * Play / menu / details / file actions shared by every video list. `videos` is the list
 * in display order and becomes the player's queue. Render `sheets` once in the screen;
 * `files` and `addToPlaylist` also serve a multi-item selection.
 */
export function useVideoActions(
  videos: VideoItem[],
  { extraActions, onFilesChanged }: VideoActionsOptions = {},
) {
  const openPlayer = useOpenPlayer();
  const { schedule, onDismissed } = useAfterSheetClose();
  // The selected video is kept after closing so the sheet can animate out with content.
  const [selected, setSelected] = useState<VideoItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const playlists = usePlaylistAdder();
  const files = useFileActions({ onComplete: onFilesChanged });
  // Read through a ref: a list that grows page by page would otherwise hand every row a
  // new `play` callback per page and re-render all of them.
  const videosRef = useLatestRef(videos);

  const play = useCallback(
    (video: VideoItem, fromStart = false) => {
      const queue = videosRef.current;
      const index = queue.findIndex(item => item.id === video.id);
      if (index === -1) {
        openPlayer([video], 0, fromStart);
      } else {
        openPlayer(queue, index, fromStart);
      }
    },
    [openPlayer, videosRef],
  );

  const openMenu = useCallback((video: VideoItem) => {
    setSelected(video);
    setMenuOpen(true);
  }, []);

  const sheets = selected ? (
    <>
      <VideoActionsSheet
        video={selected}
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onDismissed={onDismissed}
        onPlay={play}
        onShowInfo={() => schedule(() => setInfoOpen(true))}
        onAddToPlaylist={video => schedule(() => playlists.open([video]))}
        onShare={canShare() ? share : undefined}
        onMove={
          files.available
            ? video => schedule(() => files.move([video]))
            : undefined
        }
        onCopy={
          files.available
            ? video => schedule(() => files.copy([video]))
            : undefined
        }
        onDelete={files.available ? video => files.remove([video]) : undefined}
        extraActions={extraActions?.(selected)}
      />
      <VideoInfoSheet
        video={selected}
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </>
  ) : null;

  return {
    play,
    openMenu,
    files,
    addToPlaylist: playlists.open,
    sheets: (
      <>
        {sheets}
        {playlists.sheets}
        {files.sheets}
      </>
    ),
  };
}
