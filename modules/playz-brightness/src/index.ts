import NativePlayzBrightness from './NativePlayzBrightness';

export const isBrightnessSupported = NativePlayzBrightness != null;

function clampLevel(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Resolves the current brightness (0–1), or null when brightness control is unavailable. */
export async function getBrightness(): Promise<number | null> {
  if (!NativePlayzBrightness) {
    return null;
  }
  return clampLevel(await NativePlayzBrightness.getBrightness());
}

export function setBrightness(level: number): void {
  NativePlayzBrightness?.setBrightness(clampLevel(level));
}

export function resetBrightness(): void {
  NativePlayzBrightness?.resetBrightness();
}
