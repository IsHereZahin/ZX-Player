import { Platform } from 'react-native';
import * as nativeMedia from 'zxplayer-media';

import { sampleSong, sampleVideo } from '../../../../test/fixtures';
import {
  clearThumbnailMemoryCache,
  getCachedThumbnail,
  requestThumbnail,
} from '../thumbnails';

const getThumbnailMock = nativeMedia.getThumbnail as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  clearThumbnailMemoryCache();
});

describe('on iOS', () => {
  it('uses the photo-library asset URI directly', async () => {
    expect(getCachedThumbnail(sampleVideo)).toBe(sampleVideo.uri);
    await expect(requestThumbnail(sampleVideo).promise).resolves.toBe(
      sampleVideo.uri,
    );
    expect(getThumbnailMock).not.toHaveBeenCalled();
  });

  it('has no artwork for audio', async () => {
    expect(getCachedThumbnail(sampleSong)).toBeNull();
    await expect(requestThumbnail(sampleSong).promise).resolves.toBeNull();
  });
});

describe('on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('loads the system thumbnail once and serves later requests from memory', async () => {
    expect(getCachedThumbnail(sampleVideo)).toBeUndefined();

    const path = await requestThumbnail(sampleVideo).promise;

    expect(getThumbnailMock).toHaveBeenCalledWith(
      sampleVideo.uri,
      'zxplayer_101_1700000500',
      320,
    );
    expect(path).toBe(
      'file:///data/cache/thumbnails/zxplayer_101_1700000500.jpg',
    );
    expect(getCachedThumbnail(sampleVideo)).toBe(path);

    await requestThumbnail(sampleVideo).promise;
    expect(getThumbnailMock).toHaveBeenCalledTimes(1);
  });

  it('keys the disk cache by modification time so edited files refresh', async () => {
    await requestThumbnail({ ...sampleVideo, modifiedAtSec: 42 }).promise;
    expect(getThumbnailMock.mock.calls[0][1]).toBe('zxplayer_101_42');
  });

  it('loads the most recently requested rows first', async () => {
    const order: string[] = [];
    getThumbnailMock.mockImplementation(async (uri: string) => {
      order.push(uri);
      return `file:///thumb/${uri}.jpg`;
    });

    // Six rows requested in quick succession; four start at once, then the newest wins.
    const tasks = ['1', '2', '3', '4', '5', '6'].map(
      id => requestThumbnail({ ...sampleVideo, id, uri: id }).promise,
    );
    await Promise.all(tasks);

    expect(order).toEqual(['1', '2', '3', '4', '6', '5']);
  });

  it('surfaces native failures to the caller', async () => {
    getThumbnailMock.mockRejectedValueOnce(new Error('decoder error'));
    await expect(requestThumbnail(sampleVideo).promise).rejects.toThrow(
      'decoder error',
    );
    expect(getCachedThumbnail(sampleVideo)).toBeUndefined();
  });

  it('remembers album art that does not exist instead of asking again', async () => {
    getThumbnailMock.mockResolvedValueOnce(null);

    await expect(requestThumbnail(sampleSong).promise).resolves.toBeNull();
    expect(getThumbnailMock).toHaveBeenCalledWith(
      sampleSong.uri,
      'zxplayer_501_1700000900',
      320,
    );
    expect(getCachedThumbnail(sampleSong)).toBeNull();

    await requestThumbnail(sampleSong).promise;
    expect(getThumbnailMock).toHaveBeenCalledTimes(1);
  });

  it('fails cleanly when the native module is missing', async () => {
    jest.replaceProperty(nativeMedia, 'isNativeMediaAvailable', false);
    await expect(requestThumbnail(sampleVideo).promise).rejects.toThrow(
      'Thumbnails are unavailable',
    );
    expect(getThumbnailMock).not.toHaveBeenCalled();
  });
});
