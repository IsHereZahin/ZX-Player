import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/** For code outside any screen, such as the root-level player. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
