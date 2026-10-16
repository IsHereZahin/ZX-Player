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
}

/**
 * Fit / Fill / Stretch use the player's native resize modes on a full-screen view, which
 * keeps natively rendered (embedded) subtitles inside the screen. Crop needs the view
 * sized to the video's native pixels.
 */
export function resolveVideoLayout(
  mode: AspectMode,
  container: Size,
  video: Size | null,
  pixelRatio: number,
): VideoLayout {
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
