import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { IconButton } from '../../../shared/components/IconButton';
import {
  OptionRow,
  Sheet,
  useAfterSheetClose,
} from '../../../shared/components/Sheet';
import {
  EllipsisVerticalIcon,
  ListMusicIcon,
  MinusIcon,
  PencilIcon,
  Trash2Icon,
} from '../../../shared/icons';
import { MediaCollection } from '../components/MediaCollection';
import { PlaylistNameSheet } from '../components/PlaylistSheets';
import type { ExtraAction } from '../hooks/useVideoActions';
import {
  deletePlaylist,
  removeFromPlaylist,
  renamePlaylist,
  usePlaylist,
} from '../playlists';
import { formatMediaCount } from '../scopeCopy';
import type { VideoItem } from '../types';

type Props = LibraryStackScreenProps<'Playlist'>;

export function PlaylistScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const playlist = usePlaylist(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const { schedule, onDismissed } = useAfterSheetClose();

  // A deleted playlist has nothing left to show.
  useEffect(() => {
    if (!playlist) {
      navigation.goBack();
    }
  }, [navigation, playlist]);

  const removeAction = useCallback(
    (item: VideoItem): ExtraAction[] => [
      {
        label: 'Remove from Playlist',
        icon: MinusIcon,
        destructive: true,
        onPress: () => removeFromPlaylist(id, item.id),
        testID: 'action-remove-from-playlist',
      },
    ],
    [id],
  );

  if (!playlist) {
    return null;
  }

  const confirmDelete = () =>
    Alert.alert(
      `Delete "${playlist.name}"?`,
      'The playlist is removed. Its videos and music stay on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePlaylist(id),
        },
      ],
    );

  return (
    <>
      <MediaCollection
        title={playlist.name}
        subtitle={
          playlist.items.length > 0
            ? formatMediaCount(playlist.items.length, 'all')
            : undefined
        }
        onBack={navigation.goBack}
        items={playlist.items}
        empty={{
          icon: ListMusicIcon,
          title: 'This playlist is empty',
          message:
            'Choose "Add to Playlist…" in the ⋮ menu of any video or song to add it here.',
        }}
        actions={
          <IconButton
            icon={EllipsisVerticalIcon}
            variant="raised"
            accessibilityLabel="Playlist options"
            onPress={() => setMenuOpen(true)}
            testID="playlist-options"
          />
        }
        extraActions={removeAction}
        testID="playlist-screen"
      />
      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onDismissed={onDismissed}
        title={playlist.name}
      >
        <OptionRow
          icon={PencilIcon}
          label="Rename"
          onPress={() => {
            setMenuOpen(false);
            schedule(() => setRenaming(true));
          }}
          testID="playlist-rename"
        />
        <OptionRow
          icon={Trash2Icon}
          label="Delete Playlist"
          destructive
          onPress={() => {
            setMenuOpen(false);
            confirmDelete();
          }}
          testID="playlist-delete"
        />
      </Sheet>
      <PlaylistNameSheet
        visible={renaming}
        title="Rename Playlist"
        confirmLabel="Save"
        initialName={playlist.name}
        onSubmit={name => renamePlaylist(id, name)}
        onClose={() => setRenaming(false)}
      />
    </>
  );
}
