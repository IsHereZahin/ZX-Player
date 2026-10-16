import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /** Current brightness in the 0–1 range (window override if set, else the system level). */
  getBrightness(): Promise<number>;
  /** Applies a brightness level in the 0–1 range while the app is in the foreground. */
  setBrightness(value: number): void;
  /** Hands brightness control back to the system / restores the level seen before the first change. */
  resetBrightness(): void;
}

// `get` rather than `getEnforcing` so the JS wrapper can degrade gracefully when the
// native side is missing (e.g. in unit tests or an out-of-date native build).
export default TurboModuleRegistry.get<Spec>('ZxplayerBrightness');
