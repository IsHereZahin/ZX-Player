import type {
  FileOperationResult,
  NativeMediaFolder,
  NativeMediaPage,
  NativeTrashedItem,
  RemoteCommand,
} from 'zxplayer-media';

export const isNativeMediaAvailable = true;
export const getAppVersion = jest.fn(() => ({ version: '1.10', build: 11 }));
export const getFolders = jest.fn(async (): Promise<NativeMediaFolder[]> => []);
export const getMedia = jest.fn(
  async (): Promise<NativeMediaPage> => ({ items: [], hasMore: false }),
);
export const getThumbnail = jest.fn(
  async (_uri: string, cacheKey: string): Promise<string | null> =>
    `file:///data/cache/thumbnails/${cacheKey}.jpg`,
);

export const shareMedia = jest.fn(async () => {});

// File management: the user accepts every system prompt unless a test says otherwise.
export const trashMedia = jest.fn(async (): Promise<boolean> => true);
export const deleteMedia = jest.fn(async (): Promise<boolean> => true);
export const getTrashedMedia = jest.fn(
  async (): Promise<NativeTrashedItem[]> => [],
);
export const moveMedia = jest.fn(
  async (uris: readonly string[]): Promise<FileOperationResult> => ({
    granted: true,
    done: uris.length,
    failed: 0,
  }),
);
export const copyMedia = jest.fn(
  async (uris: readonly string[]): Promise<FileOperationResult> => ({
    granted: true,
    done: uris.length,
    failed: 0,
  }),
);
export const setNowPlaying = jest.fn();
export const clearNowPlaying = jest.fn();

const remoteListeners = new Set<(command: RemoteCommand) => void>();
export const addRemoteCommandListener = jest.fn(
  (listener: (command: RemoteCommand) => void) => {
    remoteListeners.add(listener);
    return { remove: () => remoteListeners.delete(listener) };
  },
);

/** Test hook: presses a notification / lock-screen button. */
export function __sendRemoteCommand(command: string, positionMs = 0): void {
  remoteListeners.forEach(listener => listener({ command, positionMs }));
}
