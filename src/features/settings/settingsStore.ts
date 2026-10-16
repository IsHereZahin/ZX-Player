import {
  createPersistentStore,
  isRecord,
} from '../../shared/storage/persistentStore';
import { useStore } from '../../shared/storage/store';
import { ASPECT_MODES, type AspectMode } from '../player/utils/aspectRatio';

export const SKIP_INTERVALS = [5, 10, 15, 30] as const;
export type SkipInterval = (typeof SKIP_INTERVALS)[number];

export const SUBTITLE_SIZES = ['small', 'medium', 'large'] as const;
export type SubtitleSize = (typeof SUBTITLE_SIZES)[number];

/** `system` follows the device's light / dark setting. */
export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type Appearance = (typeof APPEARANCES)[number];

/** Audio in its own tab, or together with videos in the Library tab. */
export const LIBRARY_LAYOUTS = ['separate', 'together'] as const;
export type LibraryLayout = (typeof LIBRARY_LAYOUTS)[number];

export interface Settings {
  appearance: Appearance;
  libraryLayout: LibraryLayout;
  resumePlayback: boolean;
  autoPlayNext: boolean;
  backgroundPlay: boolean;
  skipSeconds: SkipInterval;
  defaultAspectMode: AspectMode;
  gestureBrightness: boolean;
  gestureVolume: boolean;
  gestureSeek: boolean;
  gestureDoubleTap: boolean;
  gestureHoldForSpeed: boolean;
  subtitleSize: SubtitleSize;
  subtitleBackground: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  appearance: 'system',
  libraryLayout: 'separate',
  resumePlayback: true,
  autoPlayNext: true,
  backgroundPlay: false,
  skipSeconds: 10,
  defaultAspectMode: 'fit',
  gestureBrightness: true,
  gestureVolume: true,
  gestureSeek: true,
  gestureDoubleTap: true,
  gestureHoldForSpeed: true,
  subtitleSize: 'medium',
  subtitleBackground: true,
};

type BooleanKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

/** Validates stored settings field by field, so one bad value never resets the rest. */
export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) {
    return DEFAULT_SETTINGS;
  }
  const bool = (key: BooleanKey): boolean =>
    typeof raw[key] === 'boolean'
      ? (raw[key] as boolean)
      : DEFAULT_SETTINGS[key];
  const oneOf = <K extends keyof Settings>(
    key: K,
    allowed: readonly Settings[K][],
  ): Settings[K] =>
    allowed.includes(raw[key] as Settings[K])
      ? (raw[key] as Settings[K])
      : DEFAULT_SETTINGS[key];

  return {
    appearance: oneOf('appearance', APPEARANCES),
    libraryLayout: oneOf('libraryLayout', LIBRARY_LAYOUTS),
    resumePlayback: bool('resumePlayback'),
    autoPlayNext: bool('autoPlayNext'),
    backgroundPlay: bool('backgroundPlay'),
    skipSeconds: oneOf('skipSeconds', SKIP_INTERVALS),
    defaultAspectMode: oneOf('defaultAspectMode', ASPECT_MODES),
    gestureBrightness: bool('gestureBrightness'),
    gestureVolume: bool('gestureVolume'),
    gestureSeek: bool('gestureSeek'),
    gestureDoubleTap: bool('gestureDoubleTap'),
    gestureHoldForSpeed: bool('gestureHoldForSpeed'),
    subtitleSize: oneOf('subtitleSize', SUBTITLE_SIZES),
    subtitleBackground: bool('subtitleBackground'),
  };
}

export const settingsStore = createPersistentStore({
  key: 'zxplayer.settings.v1',
  initial: DEFAULT_SETTINGS,
  parse: parseSettings,
});

export function useSettings(): Settings {
  return useStore(settingsStore, state => state);
}

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.setState(previous => ({ ...previous, ...patch }));
}

export const SUBTITLE_SCALE: Record<SubtitleSize, number> = {
  small: 0.8,
  medium: 1,
  large: 1.3,
};
