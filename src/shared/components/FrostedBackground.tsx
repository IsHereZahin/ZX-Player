import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';

import { withAlpha } from '../theme';
import { useTheme } from '../theming';

/**
 * Real blur only where it is cheap: iOS, and Android 12+ where it runs on the GPU
 * (RenderEffect). Older Android would redraw the screen in software on every frame, so
 * it gets a translucent fill instead.
 */
function canBlur(): boolean {
  return (
    Platform.OS === 'ios' ||
    (Platform.OS === 'android' && Number(Platform.Version) >= 31)
  );
}

/**
 * Frosted glass for floating bars: what scrolls beneath shows through, blurred and tinted
 * to the theme. Fills its parent, which should clip it (rounded corners, overflow hidden).
 */
export function FrostedBackground() {
  const { scheme, colors } = useTheme();
  if (!canBlur()) {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: withAlpha(colors.surface, 0.92) },
        ]}
      />
    );
  }
  return (
    <BlurView
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      blurType={scheme === 'dark' ? 'dark' : 'light'}
      blurAmount={18}
      overlayColor={withAlpha(colors.surface, scheme === 'dark' ? 0.55 : 0.6)}
      reducedTransparencyFallbackColor={colors.surface}
    />
  );
}
