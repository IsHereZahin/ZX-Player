import React, { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewProps } from 'react-native';

/** Shared imperative handle so tests can assert on seek / picture-in-picture calls. */
export const mockVideoRef = {
  seek: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  setSource: jest.fn(),
  enterPictureInPicture: jest.fn(),
  exitPictureInPicture: jest.fn(),
};

export enum SelectedTrackType {
  SYSTEM = 'system',
  DISABLED = 'disabled',
  TITLE = 'title',
  LANGUAGE = 'language',
  INDEX = 'index',
}

// Renders a plain View that keeps every prop, so tests can read `paused`/`rate`/tracks and
// fire `onLoad`, `onProgress`, `onEnd`, `onError` through the testing library.
const Video = forwardRef<
  typeof mockVideoRef,
  ViewProps & Record<string, unknown>
>(function MockVideo(props, ref) {
  useImperativeHandle(ref, () => mockVideoRef);
  return <View {...props} />;
});

export default Video;
