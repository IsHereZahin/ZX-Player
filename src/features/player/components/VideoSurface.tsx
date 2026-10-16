import React, { memo, useMemo, type RefObject } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import Video, {
  type OnBufferData,
  type OnLoadData,
  type OnProgressData,
  type OnVideoErrorData,
  type VideoRef,
} from 'react-native-video';

import { colors } from '../../../shared/theme';
import {
  computeVideoFrame,
  type AspectMode,
  type Size,
} from '../utils/aspectRatio';

const PROGRESS_INTERVAL_MS = 250;

export interface VideoEvents {
  onLoad: (data: OnLoadData) => void;
  onProgress: (data: OnProgressData) => void;
  onBuffer: (data: OnBufferData) => void;
  onEnd: () => void;
  onError: (event: OnVideoErrorData) => void;
}

interface VideoSurfaceProps {
  videoRef: RefObject<VideoRef | null>;
  sourceKey: number;
  uri: string;
  paused: boolean;
  aspectMode: AspectMode;
  container: Size;
  naturalSize: Size | null;
  events: VideoEvents;
}

/**
 * The native video view, sized per aspect mode and centred; the container clips overflow.
 * Memoised so progress ticks elsewhere in the player don't re-render the native view.
 */
export const VideoSurface = memo(function VideoSurfaceView({
  videoRef,
  sourceKey,
  uri,
  paused,
  aspectMode,
  container,
  naturalSize,
  events,
}: VideoSurfaceProps) {
  const source = useMemo(() => ({ uri }), [uri]);
  const frame = computeVideoFrame(
    aspectMode,
    container,
    naturalSize,
    PixelRatio.get(),
  );

  return (
    <View style={styles.container} pointerEvents="none">
      <Video
        key={sourceKey}
        ref={videoRef}
        source={source}
        paused={paused}
        // Once the frame is computed the view itself has the right shape, so the native
        // layer just fills it. Before the size is known, letterbox as a safe default.
        resizeMode={naturalSize ? 'stretch' : 'contain'}
        style={
          naturalSize
            ? { width: frame.width, height: frame.height }
            : StyleSheet.absoluteFill
        }
        progressUpdateInterval={PROGRESS_INTERVAL_MS}
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        onLoad={events.onLoad}
        onProgress={events.onProgress}
        onBuffer={events.onBuffer}
        onEnd={events.onEnd}
        onError={events.onError}
        testID="video-surface"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.black,
  },
});
