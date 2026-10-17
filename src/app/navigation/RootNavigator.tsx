import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomTabBarHeightCallbackContext,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';

import { RecentScreen } from '../../features/history/RecentScreen';
import {
  libraryTitle,
  useLibraryScope,
  type LibraryTab,
} from '../../features/library/scopeCopy';
import { FavoritesScreen } from '../../features/library/screens/FavoritesScreen';
import { FolderVideosScreen } from '../../features/library/screens/FolderVideosScreen';
import { LibraryScreen } from '../../features/library/screens/LibraryScreen';
import { PlaylistScreen } from '../../features/library/screens/PlaylistScreen';
import { PlaylistsScreen } from '../../features/library/screens/PlaylistsScreen';
import { RecentlyAddedScreen } from '../../features/library/screens/RecentlyAddedScreen';
import { RecycleBinScreen } from '../../features/library/screens/RecycleBinScreen';
import { isAudioLibrarySupported } from '../../features/library/services/mediaLibrary';
import { SearchScreen } from '../../features/library/screens/SearchScreen';
import { MiniPlayer } from '../../features/player/components/MiniPlayer';
import { showFullPlayer } from '../../features/player/nowPlaying';
import { AboutScreen } from '../../features/settings/AboutScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import {
  FilmIcon,
  FolderIcon,
  HistoryIcon,
  MusicIcon,
  SettingsIcon,
  type IconComponent,
} from '../../shared/icons';
import { useColors } from '../../shared/theming';
import { FloatingTabBar } from './FloatingTabBar';
import { PlayerRoute } from './PlayerRoute';
import type {
  LibraryStackParamList,
  MainTabParamList,
  RootStackParamList,
  SettingsStackParamList,
} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

/** Options shared by the stacks that live inside a tab. */
function useTabStackOptions(): NativeStackNavigationOptions {
  const colors = useColors();
  return {
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
    // Android 13+ pushes take 450 ms by default; this slide takes 200 ms (Android only).
    animation: 'ios_from_right',
  };
}

/**
 * Folders, search and their videos open inside the tab, so the tab bar (and the mini
 * player above it) stays in place while browsing.
 */
function libraryStack(tab: LibraryTab) {
  return function LibraryStackNavigator() {
    return (
      <LibraryStack.Navigator screenOptions={useTabStackOptions()}>
        <LibraryStack.Screen
          name="LibraryHome"
          component={LibraryScreen}
          initialParams={{ tab }}
        />
        <LibraryStack.Screen
          name="FolderVideos"
          component={FolderVideosScreen}
        />
        <LibraryStack.Screen name="Favorites" component={FavoritesScreen} />
        <LibraryStack.Screen
          name="RecentlyAdded"
          component={RecentlyAddedScreen}
        />
        <LibraryStack.Screen name="Playlists" component={PlaylistsScreen} />
        <LibraryStack.Screen name="Playlist" component={PlaylistScreen} />
        <LibraryStack.Screen name="RecycleBin" component={RecycleBinScreen} />
        <LibraryStack.Screen
          name="Search"
          component={SearchScreen}
          options={{ animation: 'fade' }}
        />
      </LibraryStack.Navigator>
    );
  };
}
const VideosStack = libraryStack('Library');
const AudioStack = libraryStack('Audio');

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={useTabStackOptions()}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
      <SettingsStack.Screen name="About" component={AboutScreen} />
    </SettingsStack.Navigator>
  );
}

/**
 * The floating tab bar, topped by the mini player while something plays in the
 * background. Both float over the screens, which read the height through
 * useBottomInset so their lists scroll on beneath and stop just above.
 */
function TabBarWithMiniPlayer(props: BottomTabBarProps) {
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const openPlayer = () => {
    showFullPlayer();
    props.navigation.navigate('Player');
  };
  return (
    <View
      style={styles.tabBarOverlay}
      pointerEvents="box-none"
      onLayout={event => reportHeight?.(event.nativeEvent.layout.height)}
    >
      <MiniPlayer onOpen={openPlayer} />
      <FloatingTabBar {...props} />
    </View>
  );
}
const renderTabBar = (props: BottomTabBarProps) => (
  <TabBarWithMiniPlayer {...props} />
);

// Defined once at module level so tab icons keep a stable component identity.
const tabIcon =
  (Icon: IconComponent) =>
  ({ color, size }: { color: string; size: number }) =>
    <Icon color={color} size={size} />;
const LibraryTabIcon = tabIcon(FolderIcon);
const VideosTabIcon = tabIcon(FilmIcon);
const AudioTabIcon = tabIcon(MusicIcon);
const RecentTabIcon = tabIcon(HistoryIcon);
const SettingsTabIcon = tabIcon(SettingsIcon);

function MainTabs() {
  const libraryScope = useLibraryScope('Library');
  // Audio gets its own tab only while the Library tab lists just videos (and audio exists).
  const separateAudio = libraryScope === 'video' && isAudioLibrarySupported();
  return (
    <Tab.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Library"
        component={VideosStack}
        options={{
          title: libraryTitle(libraryScope),
          tabBarIcon: separateAudio ? VideosTabIcon : LibraryTabIcon,
          tabBarButtonTestID: 'tab-library',
        }}
      />
      {separateAudio ? (
        <Tab.Screen
          name="Audio"
          component={AudioStack}
          options={{
            tabBarIcon: AudioTabIcon,
            tabBarButtonTestID: 'tab-audio',
          }}
        />
      ) : null}
      <Tab.Screen
        name="Recent"
        component={RecentScreen}
        options={{
          tabBarIcon: RecentTabIcon,
          tabBarButtonTestID: 'tab-recent',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarIcon: SettingsTabIcon,
          tabBarButtonTestID: 'tab-settings',
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const colors = useColors();
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Player"
        component={PlayerRoute}
        options={{
          animation: 'fade',
          // Horizontal drags seek, so the iOS swipe-back gesture would fight them.
          gestureEnabled: false,
          navigationBarHidden: true,
          contentStyle: { backgroundColor: colors.black },
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
