import React, { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewProps } from 'react-native';

/** Shared imperative handle so tests can assert on seek/pause calls. */
export const mockVideoRef = {
  seek: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
};

// Renders a plain View that keeps every prop, so tests can read `paused`/`source` and
// fire `onLoad`, `onProgress`, `onEnd`, `onError` through the testing library.
const Video = forwardRef<
  typeof mockVideoRef,
  ViewProps & Record<string, unknown>
>(function MockVideo(props, ref) {
  useImperativeHandle(ref, () => mockVideoRef);
  return <View {...props} />;
});

export default Video;
