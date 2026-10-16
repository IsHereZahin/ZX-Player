/**
 * Single seam for non-fatal error reporting. Wire a crash reporter in here for release
 * builds; callers never log raw errors themselves.
 */
export function reportError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[ZX Player] ${context}`, error);
  }
}
