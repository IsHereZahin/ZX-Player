import { clamp } from '../../../shared/utils/math';

export type AspectMode = 'fit' | 'fill' | 'crop' | 'stretch';

export interface Size {
  width: number;
  height: number;
}

export const ASPECT_MODES: readonly AspectMode[] = [
  'fit',
  'fill',
  'crop',
  'stretch',
];

export const ASPECT_MODE_LABELS: Record<AspectMode, string> = {
  fit: 'Fit',
  fill: 'Fill',
  crop: 'Crop',
  stretch: 'Stretch',
};

export const ASPECT_MODE_DESCRIPTIONS: Record<AspectMode, string> = {
  fit: 'Whole picture, may show black bars',
  fill: 'Fills the screen, trims the edges',
  crop: 'Original size (100%), centred',
  stretch: 'Fills the screen, may distort',
};

export function nextAspectMode(mode: AspectMode): AspectMode {
  return ASPECT_MODES[(ASPECT_MODES.indexOf(mode) + 1) % ASPECT_MODES.length];
}

export interface VideoLayout {
  resizeMode: 'contain' | 'cover' | 'stretch';
  /** Explicit view size, or null to fill the container. */
  size: Size | null;
  /** Shift from the centre while zoomed in, in points. */
  offset?: { x: number; y: number };
}

/** Pinch zoom on top of the aspect mode: a scale and a pan from the centre. */
export interface Zoom {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const NO_ZOOM: Zoom = { scale: 1, offsetX: 0, offsetY: 0 };
export const MAX_ZOOM = 4;
/** A pinch that ends below this snaps back to the unzoomed picture. */
export const ZOOM_SNAP = 1.05;

/**
 * Limits a zoom to 1–4× and its pan so the picture never slides away from a screen edge
 * it is wider (or taller) than; a side that still fits stays centred.
 */
export function clampZoom(zoom: Zoom, frame: Size, container: Size): Zoom {
  const scale = clamp(zoom.scale, 1, MAX_ZOOM);
  const maxX = Math.max(0, (frame.width * scale - container.width) / 2);
  const maxY = Math.max(0, (frame.height * scale - container.height) / 2);
  return {
    scale,
    offsetX: clamp(zoom.offsetX, -maxX, maxX),
    offsetY: clamp(zoom.offsetY, -maxY, maxY),
  };
}

/**
 * Fit / Fill / Stretch use the player's native resize modes on a full-screen view, which
 * keeps natively rendered (embedded) subtitles inside the screen. Crop needs the view
 * sized to the video's native pixels. Zooming enlarges the view itself (Android's video
 * surface doesn't take scale transforms) and pans it by moving its position.
 */
export function resolveVideoLayout(
  mode: AspectMode,
  container: Size,
  video: Size | null,
  pixelRatio: number,
  zoom: Zoom = NO_ZOOM,
): VideoLayout {
  if (zoom.scale > 1 && video) {
    const frame = computeVideoFrame(mode, container, video, pixelRatio);
    const { scale, offsetX, offsetY } = clampZoom(zoom, frame, container);
    return {
      resizeMode: 'stretch',
      size: { width: frame.width * scale, height: frame.height * scale },
      offset: { x: offsetX, y: offsetY },
    };
  }
  switch (mode) {
    case 'fill':
      return { resizeMode: 'cover', size: null };
    case 'stretch':
      return { resizeMode: 'stretch', size: null };
    case 'crop':
      return video
        ? {
            resizeMode: 'stretch',
            size: computeVideoFrame('crop', container, video, pixelRatio),
          }
        : { resizeMode: 'contain', size: null };
    case 'fit':
      return { resizeMode: 'contain', size: null };
  }
}

/**
 * Size of the video view for a mode. The caller centres the view in the container and
 * clips overflow, so every mode renders the same way on Android and iOS.
 *
 * - fit:     largest size that shows the whole frame (letter/pillar-boxed)
 * - fill:    smallest size that covers the container, aspect kept, overflow cropped
 * - crop:    native pixel size (100%), centred and cropped by the container
 * - stretch: exactly the container, aspect ratio ignored
 */
export function computeVideoFrame(
  mode: AspectMode,
  container: Size,
  video: Size | null,
  pixelRatio: number,
): Size {
  if (mode === 'stretch' || !video || video.width <= 0 || video.height <= 0) {
    return container;
  }
  if (mode === 'crop') {
    return {
      width: video.width / pixelRatio,
      height: video.height / pixelRatio,
    };
  }
  const scaleX = container.width / video.width;
  const scaleY = container.height / video.height;
  const scale =
    mode === 'fit' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
  return { width: video.width * scale, height: video.height * scale };
}

/**
 * Some platforms report the encoded (pre-rotation) size of portrait recordings together
 * with `orientation: 'portrait'`; swap so the size matches what is displayed.
 */
export function normalizeNaturalSize(size: {
  width: number;
  height: number;
  orientation?: string;
}): Size | null {
  const { width, height, orientation } = size;
  if (!(width > 0) || !(height > 0)) {
    return null;
  }
  const isPortraitMismatch = orientation === 'portrait' && width > height;
  return isPortraitMismatch
    ? { width: height, height: width }
    : { width, height };
}
