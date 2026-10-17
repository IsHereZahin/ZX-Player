import React from 'react';
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { COLOR_THEME_SPECS, type ColorTheme } from '../theme';
import { useTheme } from '../theming';

// Geometry matches the launcher icons and assets/brand/zx-player-icon.svg, on the same
// 108-unit canvas: a play button split by a Z-shaped seam.
const TRIANGLE = 'M41,31 L41,77 L80,54 Z';
const UPPER_PIECE =
  'M-200,44.4 L65.28,44.4 L53.28,59.9 L200,59.9 L200,-200 L-200,-200 Z';
const LOWER_PIECE =
  'M-200,48.6 L56.72,48.6 L44.72,64.1 L200,64.1 L200,200 L-200,200 Z';
const CORNER_ROUNDING = 7;
const MARK_TRANSFORM = 'translate(54 54) scale(1.04) translate(-54 -54)';

interface AppLogoProps {
  size: number;
  /** Draws the logo in this colour theme instead of the active one (theme previews). */
  colorTheme?: ColorTheme;
  testID?: string;
}

function Piece({ fill, clip }: { fill: string; clip: string }) {
  return (
    <Path
      d={TRIANGLE}
      fill={fill}
      stroke={fill}
      strokeWidth={CORNER_ROUNDING}
      strokeLinejoin="round"
      clipPath={`url(#${clip})`}
    />
  );
}

/**
 * The ZX Player logo, drawn as vectors so it is sharp at any size. Its gradient follows
 * the colour theme; the launcher icon keeps the default (Sky).
 */
export function AppLogo({ size, colorTheme, testID }: AppLogoProps) {
  const active = useTheme().colorTheme;
  const [start, end] = COLOR_THEME_SPECS[colorTheme ?? active].logo;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 108 108"
      accessibilityRole="image"
      accessibilityLabel="ZX Player logo"
      testID={testID}
    >
      <Defs>
        <LinearGradient
          id="logoBackground"
          x1="0"
          y1="0"
          x2="108"
          y2="108"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={start} />
          <Stop offset="1" stopColor={end} />
        </LinearGradient>
        <RadialGradient
          id="logoShine"
          cx="30"
          cy="20"
          r="70"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.25} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id="logoUpper">
          <Path d={UPPER_PIECE} />
        </ClipPath>
        <ClipPath id="logoLower">
          <Path d={LOWER_PIECE} />
        </ClipPath>
      </Defs>
      <Rect width="108" height="108" rx="24" fill="url(#logoBackground)" />
      <Rect width="108" height="108" rx="24" fill="url(#logoShine)" />
      <G transform={MARK_TRANSFORM}>
        <G transform="translate(0 2.4)" opacity={0.2}>
          <Piece fill="#000000" clip="logoUpper" />
          <Piece fill="#000000" clip="logoLower" />
        </G>
        <Piece fill="#FFFFFF" clip="logoUpper" />
        <G opacity={0.78}>
          <Piece fill="#FFFFFF" clip="logoLower" />
        </G>
      </G>
    </Svg>
  );
}
