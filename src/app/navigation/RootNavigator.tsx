import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FoldersScreen } from '../../features/library/screens/FoldersScreen';
import { VideoListScreen } from '../../features/library/screens/VideoListScreen';
import { PlayerScreen } from '../../features/player/screens/PlayerScreen';
import { colors } from '../../shared/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Folders"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Folders"
        component={FoldersScreen}
        options={{ title: 'Play-Z' }}
      />
      <Stack.Screen name="VideoList" component={VideoListScreen} />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          headerShown: false,
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
