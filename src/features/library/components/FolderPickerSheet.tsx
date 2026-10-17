import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { NameSheet } from '../../../shared/components/NameSheet';
import { OptionRow, Sheet } from '../../../shared/components/Sheet';
import { FolderIcon, FolderPlusIcon } from '../../../shared/icons';
import { reportError } from '../../../shared/logger';
import { spacing } from '../../../shared/theme';
import { useColors } from '../../../shared/theming';
import {
  cleanFolderName,
  destinationsFor,
  MAX_FOLDER_NAME,
  type Destination,
} from '../services/fileOperations';
import { fetchFolders } from '../services/mediaLibrary';
import type { MediaKind } from '../types';

export type TransferMode = 'move' | 'copy';

interface FolderPickerSheetProps {
  visible: boolean;
  mode: TransferMode;
  kind: MediaKind;
  /** e.g. "3 videos". */
  subject: string;
  /** The items' own folder, left out when moving. */
  excludePath?: string | null;
  onPick: (relativePath: string) => void;
  onNewFolder: () => void;
  onClose: () => void;
  onDismissed?: () => void;
}

/** Where to move or copy files: an existing folder, or a new one. */
export function FolderPickerSheet({
  visible,
  mode,
  kind,
  subject,
  excludePath,
  onPick,
  onNewFolder,
  onClose,
  onDismissed,
}: FolderPickerSheetProps) {
  const colors = useColors();
  const [destinations, setDestinations] = useState<Destination[] | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setDestinations(null);
    fetchFolders(kind)
      .then(folders => {
        if (!cancelled) {
          setDestinations(
            destinationsFor(
              kind,
              folders,
              mode === 'move' ? excludePath : null,
            ),
          );
        }
      })
      .catch(error => {
        reportError('Loading destination folders failed', error);
        if (!cancelled) {
          setDestinations([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [excludePath, kind, mode, visible]);

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={mode === 'move' ? 'Move to' : 'Copy to'}
      subtitle={subject}
      testID="folder-picker"
    >
      <OptionRow
        icon={FolderPlusIcon}
        label="New Folder…"
        onPress={run(onNewFolder)}
        testID="destination-new-folder"
      />
      {destinations === null ? (
        <ActivityIndicator
          color={colors.accent}
          style={styles.loading}
          testID="destinations-loading"
        />
      ) : (
        destinations.map(destination => (
          <OptionRow
            key={destination.relativePath}
            icon={FolderIcon}
            label={destination.title}
            description={destination.relativePath}
            onPress={run(() => onPick(destination.relativePath))}
            testID={`destination-${destination.relativePath}`}
          />
        ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.lg,
  },
});

interface FolderNameSheetProps {
  visible: boolean;
  mode: TransferMode;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

/** Names the new folder the files go into. */
export function FolderNameSheet({
  visible,
  mode,
  onSubmit,
  onClose,
}: FolderNameSheetProps) {
  return (
    <NameSheet
      visible={visible}
      title="New Folder"
      confirmLabel={mode === 'move' ? 'Move Here' : 'Copy Here'}
      placeholder="Folder name"
      maxLength={MAX_FOLDER_NAME}
      clean={cleanFolderName}
      onSubmit={onSubmit}
      onClose={onClose}
      testID="folder-name"
    />
  );
}
