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
  fit: 'Fit · whole picture',
  fill: 'Fill · fills screen, edges trimmed',
  crop: 'Crop · original size (100%)',
  stretch: 'Stretch · fills screen, distorted',
};

export function nextAspectMode(mode: AspectMode): AspectMode {
  return ASPECT_MODES[(ASPECT_MODES.indexOf(mode) + 1) % ASPECT_MODES.length];
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
