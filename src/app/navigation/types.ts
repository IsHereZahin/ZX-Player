import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { LibraryTab } from '../../features/library/scopeCopy';
import type { MediaScope, VideoFolder } from '../../features/library/types';

/** Screens inside a library tab; the tab bar stays visible on all of them. */
export type LibraryStackParamList = {
  LibraryHome: { tab: LibraryTab };
  FolderVideos: { folder: VideoFolder };
  Search: { scope: MediaScope };
  Favorites: { scope: MediaScope };
  RecentlyAdded: { scope: MediaScope };
  Playlists: { scope: MediaScope };
  Playlist: { id: string };
  RecycleBin: { scope: MediaScope };
};

export type MainTabParamList = {
  /** Videos, or videos and audio together (Settings → Audio and video). */
  Library: NavigatorScreenParams<LibraryStackParamList> | undefined;
  /** Only shown while audio has its own tab. */
  Audio: NavigatorScreenParams<LibraryStackParamList> | undefined;
  Recent: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  /** What plays is held in nowPlayingStore (see useOpenPlayer). */
  Player: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type LibraryStackScreenProps<T extends keyof LibraryStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<LibraryStackParamList, T>,
    MainTabScreenProps<keyof MainTabParamList>
  >;
