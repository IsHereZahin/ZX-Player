import React from 'react';
import { View, type ViewProps } from 'react-native';

/** Native blur view; tests only need it to render. */
export function BlurView(props: ViewProps & Record<string, unknown>) {
  return <View {...props} />;
}
