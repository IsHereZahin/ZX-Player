import React, { useCallback, useState } from 'react';
import { Platform, ToastAndroid } from 'react-native';

import { showDialog } from '../../../shared/components/Dialog';
import { useAfterSheetClose } from '../../../shared/components/Sheet';
import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { reportError } from '../../../shared/logger';
import {
  FolderNameSheet,
  FolderPickerSheet,
  type TransferMode,
} from '../components/FolderPickerSheet';
import {
  canManageFiles,
  copyItems,
  kindOfItems,
  moveItems,
  moveToRecycleBin,
  newFolderPath,
  type FileOperationResult,
} from '../services/fileOperations';
import { formatMediaCount } from '../scopeCopy';
import type { MediaKind, VideoItem } from '../types';

interface Transfer {
  mode: TransferMode;
  items: VideoItem[];
  kind: MediaKind;
  fromPath?: string | null;
}

/** A short confirmation at the bottom of the screen (these actions are Android-only). */
function notify(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

const countOf = (items: readonly VideoItem[]) =>
  formatMediaCount(items.length, kindOfItems(items) ?? 'all');

/** "Movies/Trips/" → "Trips". */
const folderName = (relativePath: string) =>
  relativePath.split('/').filter(Boolean).pop() ?? relativePath;

function reportTransfer(
  transfer: Transfer,
  result: FileOperationResult,
  relativePath: string,
) {
  if (!result.granted) {
    return;
  }
  const verb = transfer.mode === 'move' ? 'Moved' : 'Copied';
  const total = transfer.items.length;
  if (result.failed === 0) {
    notify(`${verb} ${countOf(transfer.items)} to ${folderName(relativePath)}`);
  } else if (result.done === 0) {
    showDialog({
      title:
        transfer.mode === 'move'
          ? "Couldn't move the files"
          : "Couldn't copy the files",
      message:
        'Android did not allow it. The folder may not accept this kind of file, or there may not be enough space.',
    });
  } else {
    showDialog({
      title: `${verb} ${result.done} of ${total}`,
      message: `${result.failed} could not be ${
        transfer.mode === 'move' ? 'moved' : 'copied'
      }.`,
    });
  }
}

/**
 * Delete (to the recycle bin), Move and Copy for one item or a selection, with the folder
 * picker and "New Folder". `onComplete` runs after a change went through (e.g. to end a
 * selection). Render `sheets` once in the screen.
 */
export function useFileActions(options: { onComplete?: () => void } = {}) {
  const { schedule, onDismissed } = useAfterSheetClose();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const onComplete = useLatestRef(options.onComplete);

  const remove = useCallback(
    async (items: VideoItem[]) => {
      try {
        if (await moveToRecycleBin(items)) {
          notify(`${countOf(items)} moved to the Recycle Bin`);
          onComplete.current?.();
        }
      } catch (error) {
        reportError('Deleting files failed', error);
        showDialog({
          title: "Couldn't delete",
          message: 'Something went wrong. Try again.',
        });
      }
    },
    [onComplete],
  );

  const start = useCallback(
    (mode: TransferMode, items: VideoItem[], fromPath?: string | null) => {
      const kind = kindOfItems(items);
      if (!kind) {
        showDialog({
          title: 'Choose one kind of file',
          message:
            'Android keeps videos and audio in different folders, so move or copy them separately.',
        });
        return;
      }
      setTransfer({ mode, items, kind, fromPath });
      setPickerOpen(true);
    },
    [],
  );

  const move = useCallback(
    (items: VideoItem[], fromPath?: string | null) =>
      start('move', items, fromPath),
    [start],
  );
  const copy = useCallback(
    (items: VideoItem[]) => start('copy', items),
    [start],
  );

  const runTransfer = async (relativePath: string) => {
    if (!transfer) {
      return;
    }
    if (transfer.mode === 'copy') {
      notify(`Copying ${countOf(transfer.items)}…`);
    }
    try {
      const result =
        transfer.mode === 'move'
          ? await moveItems(transfer.items, relativePath)
          : await copyItems(transfer.items, relativePath);
      reportTransfer(transfer, result, relativePath);
      if (result.done > 0) {
        onComplete.current?.();
      }
    } catch (error) {
      reportError('Moving or copying files failed', error);
      showDialog({
        title: transfer.mode === 'move' ? "Couldn't move" : "Couldn't copy",
        message: 'Something went wrong. Try again.',
      });
    }
  };

  const sheets = transfer ? (
    <>
      <FolderPickerSheet
        visible={pickerOpen}
        mode={transfer.mode}
        kind={transfer.kind}
        subject={countOf(transfer.items)}
        excludePath={transfer.fromPath}
        onPick={relativePath => {
          runTransfer(relativePath);
        }}
        onNewFolder={() => schedule(() => setNameOpen(true))}
        onClose={() => setPickerOpen(false)}
        onDismissed={onDismissed}
      />
      <FolderNameSheet
        visible={nameOpen}
        mode={transfer.mode}
        onSubmit={name => {
          runTransfer(newFolderPath(transfer.kind, name));
        }}
        onClose={() => setNameOpen(false)}
      />
    </>
  ) : null;

  return { available: canManageFiles(), remove, move, copy, sheets };
}
