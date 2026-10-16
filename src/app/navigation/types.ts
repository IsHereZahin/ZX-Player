import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { VideoFolder, VideoItem } from '../../features/library/types';

export type RootStackParamList = {
  Folders: undefined;
  VideoList: { folder: VideoFolder };
  Player: { video: VideoItem };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
