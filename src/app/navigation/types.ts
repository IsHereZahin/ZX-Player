import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { VideoFolder, VideoItem } from '../../features/library/types';

export type MainTabParamList = {
  Library: undefined;
  Recent: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  FolderVideos: { folder: VideoFolder };
  Search: undefined;
  Player: {
    /** Videos in play order; next/previous move through this list. */
    queue: VideoItem[];
    startIndex: number;
    /** Ignore the saved position for the first video. */
    startFromBeginning?: boolean;
  };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
