import React, { useState } from 'react';
import { Animated, View } from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { useBottomInset } from '../../../app/navigation/useBottomInset';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ListRow, ListSection } from '../../../shared/components/GroupedList';
import { IconButton } from '../../../shared/components/IconButton';
import {
  HeaderGlow,
  ScreenHeader,
  useHidingHeader,
} from '../../../shared/components/ScreenHeader';
import { ListMusicIcon, PlusIcon } from '../../../shared/icons';
import { spacing } from '../../../shared/theme';
import { makeStyles } from '../../../shared/theming';
import { PlaylistNameSheet } from '../components/PlaylistSheets';
import { createPlaylist, usePlaylists } from '../playlists';
import { formatMediaCount } from '../scopeCopy';

type Props = LibraryStackScreenProps<'Playlists'>;

export function PlaylistsScreen({ navigation }: Props) {
  const styles = useStyles();
  const playlists = usePlaylists();
  const [creating, setCreating] = useState(false);
  const header = useHidingHeader();
  const bottom = useBottomInset();

  const create = (name: string) => {
    const id = createPlaylist(name);
    if (id) {
      navigation.navigate('Playlist', { id });
    }
  };

  return (
    <View style={styles.screen}>
      <HeaderGlow scrollY={header.scrollY} />
      {playlists.length === 0 ? (
        <View
          style={[
            styles.fill,
            { paddingTop: header.height, paddingBottom: bottom },
          ]}
        >
          <EmptyState
            icon={ListMusicIcon}
            title="No playlists yet"
            message="Collect videos and music in playlists to play them in your own order."
            actionLabel="New Playlist"
            onAction={() => setCreating(true)}
            testID="playlists-empty"
          />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={{
            paddingTop: header.height,
            paddingBottom: bottom,
          }}
          onScroll={header.onScroll}
          scrollEventThrottle={16}
        >
          <ListSection style={styles.list}>
            {playlists.map(playlist => (
              <ListRow
                key={playlist.id}
                icon={ListMusicIcon}
                title={playlist.name}
                subtitle={formatMediaCount(playlist.items.length, 'all')}
                accessory="chevron"
                onPress={() =>
                  navigation.navigate('Playlist', { id: playlist.id })
                }
                testID={`playlist-${playlist.id}`}
              />
            ))}
          </ListSection>
        </Animated.ScrollView>
      )}
      <ScreenHeader
        title="Playlists"
        onBack={navigation.goBack}
        actions={
          <IconButton
            icon={PlusIcon}
            variant="raised"
            accessibilityLabel="New playlist"
            onPress={() => setCreating(true)}
            testID="new-playlist"
          />
        }
        hiding={header}
      />
      <PlaylistNameSheet
        visible={creating}
        title="New Playlist"
        confirmLabel="Create"
        onSubmit={create}
        onClose={() => setCreating(false)}
      />
    </View>
  );
}

const useStyles = makeStyles(colors => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  list: {
    marginTop: spacing.sm,
  },
}));
