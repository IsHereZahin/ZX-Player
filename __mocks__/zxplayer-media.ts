import type { NativeVideoFolder, NativeVideoPage } from 'zxplayer-media';

export const isNativeMediaAvailable = true;
export const getVideoFolders = jest.fn(
  async (): Promise<NativeVideoFolder[]> => [],
);
export const getVideos = jest.fn(
  async (): Promise<NativeVideoPage> => ({ videos: [], hasMore: false }),
);
export const getThumbnail = jest.fn(
  async (_videoId: string, cacheKey: string) =>
    `file:///data/cache/thumbnails/${cacheKey}.jpg`,
);
