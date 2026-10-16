import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RecentScreen } from '../../features/history/RecentScreen';
import { FolderVideosScreen } from '../../features/library/screens/FolderVideosScreen';
import { LibraryScreen } from '../../features/library/screens/LibraryScreen';
import { SearchScreen } from '../../features/library/screens/SearchScreen';
import { PlayerScreen } from '../../features/player/screens/PlayerScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import {
  FolderIcon,
  HistoryIcon,
  SettingsIcon,
  type IconComponent,
} from '../../shared/icons';
import { typography } from '../../shared/theme';
import { useColors } from '../../shared/theming';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Defined once at module level so tab icons keep a stable component identity.
const tabIcon =
  (Icon: IconComponent) =>
  ({ color, size }: { color: string; size: number }) =>
    <Icon color={color} size={size} />;
const LibraryTabIcon = tabIcon(FolderIcon);
const RecentTabIcon = tabIcon(HistoryIcon);
const SettingsTabIcon = tabIcon(SettingsIcon);

function MainTabs() {
  const colors = useColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: typography.label,
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: LibraryTabIcon,
          tabBarButtonTestID: 'tab-library',
        }}
      />
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
      <Stack.Screen name="FolderVideos" component={FolderVideosScreen} />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
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
