import React, { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

// SVG drawing has no meaning in Jest; render containers so trees stay inspectable.
function Container({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

function Leaf() {
  return null;
}

/** The root keeps the props queries rely on (labels, roles, test IDs). */
function SvgRoot({
  children,
  testID,
  accessibilityLabel,
  accessibilityRole,
}: ViewProps & { children?: ReactNode }) {
  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </View>
  );
}

export const Defs = Container;
export const ClipPath = Container;
export const RadialGradient = Container;
export const LinearGradient = Container;
export const Stop = Leaf;
export const Rect = Leaf;
export const Path = Leaf;
export const Circle = Leaf;
export const Line = Leaf;
export const Polyline = Leaf;
export const Polygon = Leaf;
export const Ellipse = Leaf;
export const G = Container;
export default SvgRoot;
