import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RecentScreen } from '../../features/history/RecentScreen';
import {
  libraryTitle,
  useLibraryScope,
  type LibraryTab,
} from '../../features/library/scopeCopy';
import { FavoritesScreen } from '../../features/library/screens/FavoritesScreen';
import { FolderVideosScreen } from '../../features/library/screens/FolderVideosScreen';
import { LibraryScreen } from '../../features/library/screens/LibraryScreen';
import { RecentlyAddedScreen } from '../../features/library/screens/RecentlyAddedScreen';
import { isAudioLibrarySupported } from '../../features/library/services/mediaLibrary';
import { SearchScreen } from '../../features/library/screens/SearchScreen';
import { MiniPlayer } from '../../features/player/components/MiniPlayer';
import { showFullPlayer } from '../../features/player/nowPlaying';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import {
  FilmIcon,
  FolderIcon,
  HistoryIcon,
  MusicIcon,
  SettingsIcon,
  type IconComponent,
} from '../../shared/icons';
import { typography } from '../../shared/theme';
import { useColors } from '../../shared/theming';
import { PlayerRoute } from './PlayerRoute';
import type {
  LibraryStackParamList,
  MainTabParamList,
  RootStackParamList,
} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();

/**
 * Folders, search and their videos open inside the tab, so the tab bar (and the mini
 * player above it) stays in place while browsing.
 */
function libraryStack(tab: LibraryTab) {
  return function LibraryStackNavigator() {
    const colors = useColors();
    return (
      <LibraryStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
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

/** The tab bar, topped by the mini player while something plays in the background. */
function TabBarWithMiniPlayer(props: BottomTabBarProps) {
  const openPlayer = () => {
    showFullPlayer();
    props.navigation.navigate('Player');
  };
  return (
    <View>
      <MiniPlayer onOpen={openPlayer} />
      <BottomTabBar {...props} />
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
  const colors = useColors();
  const libraryScope = useLibraryScope('Library');
  // Audio gets its own tab only while the Library tab lists just videos (and audio exists).
  const separateAudio = libraryScope === 'video' && isAudioLibrarySupported();
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        // iOS tab bar: bar material, hairline top edge, small labels, grey when idle.
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.chrome,
          borderTopColor: colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarLabelStyle: typography.caption2,
      }}
    >
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
        component={SettingsScreen}
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
