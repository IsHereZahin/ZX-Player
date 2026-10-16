import React, { useState } from 'react';
import { Animated, View } from 'react-native';

import type { LibraryStackScreenProps } from '../../../app/navigation/types';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ListRow, ListSection } from '../../../shared/components/GroupedList';
import { IconButton } from '../../../shared/components/IconButton';
import {
  LargeTitle,
  NavigationBar,
  useCollapsingTitle,
} from '../../../shared/components/NavigationBar';
import { ListMusicIcon, PlusIcon } from '../../../shared/icons';
import { spacing } from '../../../shared/theme';
import { makeStyles, useColors } from '../../../shared/theming';
import { PlaylistNameSheet } from '../components/PlaylistSheets';
import { createPlaylist, usePlaylists } from '../playlists';
import { formatMediaCount, libraryTitle } from '../scopeCopy';

type Props = LibraryStackScreenProps<'Playlists'>;

export function PlaylistsScreen({ navigation, route }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { scope } = route.params;
  const playlists = usePlaylists();
  const [creating, setCreating] = useState(false);
  const { scrollY, onScroll } = useCollapsingTitle();

  const create = (name: string) => {
    const id = createPlaylist(name);
    if (id) {
      navigation.navigate('Playlist', { id });
    }
  };

  return (
    <View style={styles.screen}>
      <NavigationBar
        title="Playlists"
        scrollY={scrollY}
        onBack={navigation.goBack}
        backLabel={libraryTitle(scope)}
        right={
          <IconButton
            icon={PlusIcon}
            variant="plain"
            accessibilityLabel="New playlist"
            onPress={() => setCreating(true)}
            testID="new-playlist"
          />
        }
      />
      {playlists.length === 0 ? (
        <View style={styles.fill}>
          <LargeTitle title="Playlists" />
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
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
          <LargeTitle title="Playlists" />
          <ListSection style={styles.list}>
            {playlists.map(playlist => (
              <ListRow
                key={playlist.id}
                icon={ListMusicIcon}
                iconBackground={colors.orange}
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
