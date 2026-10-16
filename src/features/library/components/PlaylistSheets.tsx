import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { OptionRow, Sheet } from '../../../shared/components/Sheet';
import { ListMusicIcon, PlusIcon } from '../../../shared/icons';
import { radius, spacing, typography } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
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
export function PlaylistNameSheet({
  visible,
  title,
  confirmLabel,
  initialName = '',
  onSubmit,
  onClose,
}: PlaylistNameSheetProps) {
  const styles = useStyles();
  const colors = useColors();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setName(initialName);
    }
  }, [initialName, visible]);

  const valid = cleanPlaylistName(name).length > 0;
  const submit = () => {
    if (valid) {
      onSubmit(cleanPlaylistName(name));
      onClose();
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      testID="playlist-name"
    >
      <View style={styles.form}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Playlist name"
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxLength={MAX_PLAYLIST_NAME}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          style={styles.input}
          accessibilityLabel="Playlist name"
          testID="playlist-name-input"
        />
        <Button
          label={confirmLabel}
          onPress={submit}
          style={!valid && styles.disabled}
          testID="playlist-name-confirm"
        />
      </View>
    </Sheet>
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

const useStyles = makeStyles(colors => ({
  form: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.sheetCell,
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
}));
