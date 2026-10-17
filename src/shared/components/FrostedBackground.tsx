import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';

import { withAlpha } from '../theme';
import { useTheme } from '../theming';

/**
 * Real blur only where it is cheap: iOS. Android's BlurView redraws the whole window into
 * a bitmap, in software, on every frame anything moves (RenderEffect only speeds up the
 * blur itself), which made screen transitions and scrolling stutter. Android gets a
 * translucent fill instead.
 */
function canBlur(): boolean {
  return Platform.OS === 'ios';
}

interface FrostedBackgroundProps {
  /** Off while the bar is covered (e.g. by the full player), so nothing blurs unseen. */
  blur?: boolean;
}

/**
 * Frosted glass for floating bars: what scrolls beneath shows through, blurred and tinted
 * to the theme. Fills its parent, which should clip it (rounded corners, overflow hidden).
 */
export function FrostedBackground({ blur = true }: FrostedBackgroundProps) {
  const { scheme, colors } = useTheme();
  const blurring = blur && canBlur();
  const tint = withAlpha(
    colors.surface,
    blurring ? (scheme === 'dark' ? 0.55 : 0.6) : 0.92,
  );
  return (
    <>
      {blurring ? (
        <BlurView
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          blurType={scheme === 'dark' ? 'dark' : 'light'}
          blurAmount={18}
          reducedTransparencyFallbackColor={colors.surface}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tint }]}
      />
    </>
  );
}
