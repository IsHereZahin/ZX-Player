import React, { useCallback, useState } from 'react';

import { useOpenPlayer } from '../../../app/navigation/useOpenPlayer';
import { useAfterSheetClose } from '../../../shared/components/Sheet';
import { VideoActionsSheet, VideoInfoSheet } from '../components/VideoSheets';
import type { VideoItem } from '../types';

/**
 * Play / menu / details behaviour shared by every video list. `videos` is the list in
 * display order and becomes the player's queue. Render `sheets` once in the screen.
 */
export function useVideoActions(videos: VideoItem[]) {
  const openPlayer = useOpenPlayer();
  const { schedule, onDismissed } = useAfterSheetClose();
  // The selected video is kept after closing so the sheet can animate out with content.
  const [selected, setSelected] = useState<VideoItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const play = useCallback(
    (video: VideoItem, fromStart = false) => {
      const index = videos.findIndex(item => item.id === video.id);
      if (index === -1) {
        openPlayer([video], 0, fromStart);
      } else {
        openPlayer(videos, index, fromStart);
      }
    },
    [openPlayer, videos],
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
      />
      <VideoInfoSheet
        video={selected}
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </>
  ) : null;

  return { play, openMenu, sheets };
}
