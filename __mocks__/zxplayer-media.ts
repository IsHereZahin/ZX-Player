import type { NativeMediaFolder, NativeMediaPage } from 'zxplayer-media';

export const isNativeMediaAvailable = true;
export const getFolders = jest.fn(async (): Promise<NativeMediaFolder[]> => []);
export const getMedia = jest.fn(
  async (): Promise<NativeMediaPage> => ({ items: [], hasMore: false }),
);
export const getThumbnail = jest.fn(
  async (_uri: string, cacheKey: string): Promise<string | null> =>
    `file:///data/cache/thumbnails/${cacheKey}.jpg`,
);
