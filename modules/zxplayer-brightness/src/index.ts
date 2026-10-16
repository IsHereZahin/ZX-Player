import NativeZxplayerBrightness from './NativeZxplayerBrightness';

export const isBrightnessSupported = NativeZxplayerBrightness != null;

function clampLevel(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Resolves the current brightness (0–1), or null when brightness control is unavailable. */
export async function getBrightness(): Promise<number | null> {
  if (!NativeZxplayerBrightness) {
    return null;
  }
  return clampLevel(await NativeZxplayerBrightness.getBrightness());
}

export function setBrightness(level: number): void {
  NativeZxplayerBrightness?.setBrightness(clampLevel(level));
}

export function resetBrightness(): void {
  NativeZxplayerBrightness?.resetBrightness();
}
