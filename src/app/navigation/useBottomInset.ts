import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Room to leave below a screen's content. The floating tab bar (with the mini player above
 * it) covers the bottom of every tab, so lists scroll on beneath it and stop just above.
 * Outside the tabs it is the safe area.
 */
export function useBottomInset(): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const { bottom } = useSafeAreaInsets();
  return tabBarHeight ?? bottom;
}
