import React, { useCallback, useState } from 'react';

import { useAfterSheetClose } from '../../../shared/components/Sheet';
import {
  AddToPlaylistSheet,
  PlaylistNameSheet,
} from '../components/PlaylistSheets';
import { addToPlaylist, createPlaylist } from '../playlists';
import type { VideoItem } from '../types';

/** "Add to Playlist" for one item or a selection: pick a playlist or start a new one. */
export function usePlaylistAdder() {
  const { schedule, onDismissed } = useAfterSheetClose();
  const [items, setItems] = useState<VideoItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);

  const open = useCallback((list: VideoItem[]) => {
    setItems(list);
    setPickerOpen(true);
  }, []);

  const sheets = (
    <>
      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onDismissed={onDismissed}
        onPick={playlistId => addToPlaylist(playlistId, items)}
        onNewPlaylist={() => schedule(() => setNewPlaylistOpen(true))}
      />
      <PlaylistNameSheet
        visible={newPlaylistOpen}
        title="New Playlist"
        confirmLabel="Create"
        onSubmit={name => createPlaylist(name, items)}
        onClose={() => setNewPlaylistOpen(false)}
      />
    </>
  );

  return { open, sheets };
}
