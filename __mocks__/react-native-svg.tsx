import React, { type ReactNode } from 'react';
import { View } from 'react-native';

// SVG drawing has no meaning in Jest; render containers so trees stay inspectable.
function Container({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

function Leaf() {
  return null;
}

export const Defs = Container;
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
export default Container;
