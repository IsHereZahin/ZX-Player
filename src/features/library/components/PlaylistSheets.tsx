import React from 'react';

import { NameSheet } from '../../../shared/components/NameSheet';
import { OptionRow, Sheet } from '../../../shared/components/Sheet';
import { ListMusicIcon, PlusIcon } from '../../../shared/icons';
import {
  cleanPlaylistName,
  MAX_PLAYLIST_NAME,
  usePlaylists,
} from '../playlists';
import { formatMediaCount } from '../scopeCopy';

interface PlaylistNameSheetProps {
  visible: boolean;
  /** "New Playlist" or "Rename Playlist". */
  title: string;
  confirmLabel: string;
  initialName?: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

/** Asks for a playlist name (create or rename). */
export function PlaylistNameSheet(props: PlaylistNameSheetProps) {
  return (
    <NameSheet
      {...props}
      placeholder="Playlist name"
      maxLength={MAX_PLAYLIST_NAME}
      clean={cleanPlaylistName}
      testID="playlist-name"
    />
  );
}

interface AddToPlaylistSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  onPick: (playlistId: string) => void;
  onNewPlaylist: () => void;
}

/** Picks the playlist to add an item to, or starts a new one. */
export function AddToPlaylistSheet({
  visible,
  onClose,
  onDismissed,
  onPick,
  onNewPlaylist,
}: AddToPlaylistSheetProps) {
  const playlists = usePlaylists();
  const run = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title="Add to Playlist"
      testID="add-to-playlist"
    >
      <OptionRow
        icon={PlusIcon}
        label="New Playlist…"
        onPress={run(onNewPlaylist)}
        testID="add-to-new-playlist"
      />
      {playlists.map(playlist => (
        <OptionRow
          key={playlist.id}
          icon={ListMusicIcon}
          label={playlist.name}
          description={formatMediaCount(playlist.items.length, 'all')}
          onPress={run(() => onPick(playlist.id))}
          testID={`add-to-playlist-${playlist.id}`}
        />
      ))}
    </Sheet>
  );
}
