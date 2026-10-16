import React, { memo, useMemo, type RefObject } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import Video, {
  SelectedTrackType,
  type OnAudioTracksData,
  type OnBufferData,
  type OnLoadData,
  type OnPictureInPictureStatusChangedData,
  type OnPlaybackStateChangedData,
  type OnProgressData,
  type OnTextTrackDataChangedData,
  type OnTextTracksData,
  type OnVideoErrorData,
  type SelectedTrack,
  type VideoRef,
} from 'react-native-video';

import { playerColors } from '../../../shared/theme';
import { usesOwnMediaSession } from '../hooks/useMediaSession';
import {
  resolveVideoLayout,
  type AspectMode,
  type Size,
  type Zoom,
} from '../utils/aspectRatio';

const PROGRESS_INTERVAL_MS = 250;
/**
 * Android (ExoPlayer) buffering for local files. Storage reads are fast, so playback can
 * start, and resume after a seek, on a short buffer instead of the 2.5 s / 5 s defaults
 * meant for streaming; capping read-ahead keeps memory low on large files.
 */
const LOCAL_FILE_BUFFER = {
  minBufferMs: 15000,
  maxBufferMs: 30000,
  bufferForPlaybackMs: 500,
  bufferForPlaybackAfterRebufferMs: 1000,
};

export interface VideoEvents {
  onLoad: (data: OnLoadData) => void;
  onProgress: (data: OnProgressData) => void;
  onBuffer: (data: OnBufferData) => void;
  onEnd: () => void;
  onError: (event: OnVideoErrorData) => void;
  onAudioTracks: (data: OnAudioTracksData) => void;
  onTextTracks: (data: OnTextTracksData) => void;
  onTextTrackDataChanged: (data: OnTextTrackDataChangedData) => void;
  onPictureInPictureStatusChanged: (
    data: OnPictureInPictureStatusChangedData,
  ) => void;
  onPlaybackStateChanged: (data: OnPlaybackStateChangedData) => void;
  onReadyForDisplay: () => void;
}

const EVENT_NAMES: ReadonlyArray<keyof VideoEvents> = [
  'onLoad',
  'onProgress',
  'onBuffer',
  'onEnd',
  'onError',
  'onAudioTracks',
  'onTextTracks',
  'onTextTrackDataChanged',
  'onPictureInPictureStatusChanged',
  'onPlaybackStateChanged',
  'onReadyForDisplay',
];

/**
 * Stable handlers that pass each event on to whichever item's handlers are bound in
 * `target` at the time, so one native player can serve the whole queue.
 */
export function forwardVideoEvents(
  target: RefObject<VideoEvents | null>,
): VideoEvents {
  const forwarded: Partial<Record<keyof VideoEvents, unknown>> = {};
  for (const name of EVENT_NAMES) {
    forwarded[name] = (data: never) =>
      (target.current?.[name] as ((value: never) => void) | undefined)?.(data);
  }
  return forwarded as VideoEvents;
}

/** Which subtitle the player itself should render (external files are drawn by the app). */
export type NativeTextTrack =
  | { kind: 'off' }
  | { kind: 'embedded'; index: number };

/** What the item being played wants from the native player. */
export interface SurfaceConfig {
  /** Changing it recreates the native player (used to retry after an error). */
  sourceKey: number;
  uri: string;
  /** Where playback starts, applied natively without a separate seek. */
  startPositionSec: number;
  /** Labels the media notification during background play. */
  title: string;
  artist: string;
  artworkUri?: string;
  paused: boolean;
  rate: number;
  repeat: boolean;
  aspectMode: AspectMode;
  zoom: Zoom;
  naturalSize: Size | null;
  audioTrackIndex: number | null;
  textTrack: NativeTextTrack;
  subtitleFontSize: number;
  backgroundPlay: boolean;
}

interface VideoSurfaceProps extends SurfaceConfig {
  videoRef: RefObject<VideoRef | null>;
  container: Size;
  events: VideoEvents;
}

/**
 * The native video view. It stays mounted from one queue item to the next (only its
 * source changes), and is memoised so progress ticks don't re-render it.
 */
export const VideoSurface = memo(function VideoSurfaceView({
  videoRef,
  sourceKey,
  uri,
  startPositionSec,
  title,
  artist,
  artworkUri,
  paused,
  rate,
  repeat,
  aspectMode,
  zoom,
  container,
  naturalSize,
  audioTrackIndex,
  textTrack,
  subtitleFontSize,
  backgroundPlay,
  events,
}: VideoSurfaceProps) {
  // Metadata labels the media notification shown during background play.
  const source = useMemo(
    () => ({
      uri,
      startPosition: Math.round(startPositionSec * 1000),
      metadata: { title, artist, imageUri: artworkUri },
      bufferConfig: LOCAL_FILE_BUFFER,
    }),
    [artist, artworkUri, startPositionSec, title, uri],
  );
  const layout = resolveVideoLayout(
    aspectMode,
    container,
    naturalSize,
    PixelRatio.get(),
    zoom,
  );

  const selectedAudioTrack = useMemo<SelectedTrack | undefined>(
    () =>
      audioTrackIndex === null
        ? undefined
        : { type: SelectedTrackType.INDEX, value: audioTrackIndex },
    [audioTrackIndex],
  );
  const selectedTextTrack = useMemo<SelectedTrack>(
    () =>
      textTrack.kind === 'embedded'
        ? { type: SelectedTrackType.INDEX, value: textTrack.index }
        : { type: SelectedTrackType.DISABLED },
    [textTrack],
  );
  const subtitleStyle = useMemo(
    () => ({
      fontSize: subtitleFontSize,
      paddingBottom: 24,
      subtitlesFollowVideo: false,
    }),
    [subtitleFontSize],
  );

  return (
    <View style={styles.container} pointerEvents="none">
      <Video
        key={sourceKey}
        ref={videoRef}
        source={source}
        paused={paused}
        rate={rate}
        repeat={repeat}
        resizeMode={layout.resizeMode}
        style={[
          layout.size ?? StyleSheet.absoluteFill,
          layout.offset && { left: layout.offset.x, top: layout.offset.y },
        ]}
        selectedAudioTrack={selectedAudioTrack}
        selectedTextTrack={selectedTextTrack}
        subtitleStyle={subtitleStyle}
        progressUpdateInterval={PROGRESS_INTERVAL_MS}
        ignoreSilentSwitch="ignore"
        playInBackground={backgroundPlay}
        playWhenInactive={backgroundPlay}
        // Android uses ZX Player's own media session instead (see useMediaSession).
        showNotificationControls={backgroundPlay && !usesOwnMediaSession()}
        onLoad={events.onLoad}
        onProgress={events.onProgress}
        onBuffer={events.onBuffer}
        onEnd={events.onEnd}
        onError={events.onError}
        onAudioTracks={events.onAudioTracks}
        onTextTracks={events.onTextTracks}
        onTextTrackDataChanged={events.onTextTrackDataChanged}
        onPictureInPictureStatusChanged={events.onPictureInPictureStatusChanged}
        onPlaybackStateChanged={events.onPlaybackStateChanged}
        onReadyForDisplay={events.onReadyForDisplay}
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
    backgroundColor: playerColors.black,
  },
});
