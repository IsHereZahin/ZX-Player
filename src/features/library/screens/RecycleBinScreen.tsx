import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Animated, Platform, ToastAndroid, View } from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { useBottomInset } from '../../../app/navigation/useBottomInset';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import {
  HeaderGlow,
  ScreenHeader,
  useHidingHeader,
} from '../../../shared/components/ScreenHeader';
import {
  OptionRow,
  Sheet,
  useAfterSheetClose,
} from '../../../shared/components/Sheet';
import { ListSkeleton } from '../../../shared/components/Skeleton';
import {
  ArchiveRestoreIcon,
  CircleAlertIcon,
  EllipsisVerticalIcon,
  Trash2Icon,
} from '../../../shared/icons';
import { reportError } from '../../../shared/logger';
import { spacing } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import { MEDIA_LIST_TUNING } from '../../../shared/utils/listTuning';
import { VideoRow } from '../components/VideoRow';
import { useLibraryChanges } from '../hooks/useLibraryChanges';
import { formatMediaCount } from '../scopeCopy';
import {
  deleteForever,
  fetchRecycleBin,
  restoreFromRecycleBin,
  type TrashedItem,
} from '../services/fileOperations';
import { kindsOf, mediaTitle } from '../services/mediaLibrary';

type Props = LibraryStackScreenProps<'RecycleBin'>;

const DAY_SEC = 24 * 60 * 60;

/** "Deletes in 12 days", counting from now. */
export function describeExpiry(
  expiresAtSec: number,
  nowSec: number = Date.now() / 1000,
): string {
  const days = Math.ceil((expiresAtSec - nowSec) / DAY_SEC);
  if (days <= 1) {
    return days <= 0 ? 'Deletes today' : 'Deletes tomorrow';
  }
  return `Deletes in ${days} days`;
}

function notify(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

/**
 * Files deleted from ZX Player wait here (Android's own recycle bin) for 30 days, and can
 * be restored or deleted for good until then.
 */
export function RecycleBinScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const { scope } = route.params;
  const header = useHidingHeader();
  const bottom = useBottomInset();
  const [items, setItems] = useState<TrashedItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState<TrashedItem | null>(null);
  const [itemMenuOpen, setItemMenuOpen] = useState(false);
  const [binMenuOpen, setBinMenuOpen] = useState(false);
  const { schedule, onDismissed } = useAfterSheetClose();

  const load = useCallback(async () => {
    try {
      setItems(await fetchRecycleBin(kindsOf(scope)));
      setFailed(false);
    } catch (error) {
      reportError('Loading the recycle bin failed', error);
      setFailed(true);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);
  // Restoring or deleting (here or elsewhere) changes the library: read the bin again.
  useLibraryChanges(load);

  const restore = async (list: TrashedItem[]) => {
    try {
      if (await restoreFromRecycleBin(list)) {
        notify(`Restored ${formatMediaCount(list.length, scope)}`);
      }
    } catch (error) {
      reportError('Restoring files failed', error);
      Alert.alert("Couldn't restore", 'Something went wrong. Try again.');
    }
  };

  const destroy = async (list: TrashedItem[]) => {
    try {
      if (await deleteForever(list)) {
        notify(`Deleted ${formatMediaCount(list.length, scope)}`);
      }
    } catch (error) {
      reportError('Deleting files for good failed', error);
      Alert.alert("Couldn't delete", 'Something went wrong. Try again.');
    }
  };

  const openItem = useCallback((item: TrashedItem) => {
    setChosen(item);
    setItemMenuOpen(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: TrashedItem }) => (
      <VideoRow
        video={item}
        onPress={() => openItem(item)}
        onMore={() => openItem(item)}
        note={describeExpiry(item.expiresAtSec)}
      />
    ),
    [openItem],
  );

  const padded = { paddingTop: header.height, paddingBottom: bottom };
  let body: React.ReactNode;
  if (failed) {
    body = (
      <View style={[styles.fill, padded]}>
        <EmptyState
          icon={CircleAlertIcon}
          title="Couldn't open the Recycle Bin"
          message="Something went wrong while reading it."
          actionLabel="Try again"
          onAction={load}
          testID="recycle-bin-error"
        />
      </View>
    );
  } else if (items === null) {
    body = (
      <View style={[styles.fill, padded]}>
        <ListSkeleton testID="recycle-bin-loading" />
      </View>
    );
  } else if (items.length === 0) {
    body = (
      <View style={[styles.fill, padded]}>
        <EmptyState
          icon={Trash2Icon}
          title="Recycle Bin is empty"
          message="Deleted videos and audio stay here for 30 days, then Android removes them for good."
          testID="recycle-bin-empty"
        />
      </View>
    );
  } else {
    body = (
      <Animated.FlatList
        {...MEDIA_LIST_TUNING}
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={<View style={{ height: header.height }} />}
        contentContainerStyle={{ paddingBottom: bottom + spacing.lg }}
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        testID="recycle-bin-list"
      />
    );
  }

  return (
    <View style={styles.screen}>
      <HeaderGlow scrollY={header.scrollY} />
      {body}
      <ScreenHeader
        title="Recycle Bin"
        subtitle={
          items && items.length > 0
            ? formatMediaCount(items.length, scope)
            : undefined
        }
        onBack={navigation.goBack}
        actions={
          items && items.length > 0 ? (
            <IconButton
              icon={EllipsisVerticalIcon}
              variant="raised"
              accessibilityLabel="Recycle Bin options"
              onPress={() => setBinMenuOpen(true)}
              testID="recycle-bin-options"
            />
          ) : null
        }
        hiding={header}
      />
      {chosen ? (
        <Sheet
          visible={itemMenuOpen}
          onClose={() => setItemMenuOpen(false)}
          onDismissed={onDismissed}
          title={mediaTitle(chosen)}
          subtitle={describeExpiry(chosen.expiresAtSec)}
          testID="trashed-item-actions"
        >
          <OptionRow
            icon={ArchiveRestoreIcon}
            label="Restore"
            onPress={() => {
              setItemMenuOpen(false);
              schedule(() => restore([chosen]));
            }}
            testID="action-restore"
          />
          <OptionRow
            icon={Trash2Icon}
            label="Delete for Good"
            destructive
            onPress={() => {
              setItemMenuOpen(false);
              schedule(() => destroy([chosen]));
            }}
            testID="action-delete-forever"
          />
        </Sheet>
      ) : null}
      <Sheet
        visible={binMenuOpen}
        onClose={() => setBinMenuOpen(false)}
        onDismissed={onDismissed}
        title="Recycle Bin"
        testID="recycle-bin-menu"
      >
        <OptionRow
          icon={ArchiveRestoreIcon}
          label="Restore All"
          onPress={() => {
            setBinMenuOpen(false);
            schedule(() => restore(items ?? []));
          }}
          testID="restore-all"
        />
        <OptionRow
          icon={Trash2Icon}
          label="Empty Recycle Bin"
          destructive
          onPress={() => {
            setBinMenuOpen(false);
            schedule(() => destroy(items ?? []));
          }}
          testID="empty-recycle-bin"
        />
      </Sheet>
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
}));
