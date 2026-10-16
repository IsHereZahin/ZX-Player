import { Platform } from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';

import { sampleVideo } from '../../../../test/fixtures';
import {
  clearThumbnailMemoryCache,
  getCachedThumbnail,
  requestThumbnail,
} from '../thumbnails';

const createThumbnailMock = createThumbnail as jest.Mock;

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
    expect(createThumbnailMock).not.toHaveBeenCalled();
  });
});

describe('on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('extracts a frame once and serves later requests from memory', async () => {
    expect(getCachedThumbnail(sampleVideo)).toBeNull();

    const path = await requestThumbnail(sampleVideo).promise;

    expect(createThumbnailMock).toHaveBeenCalledWith({
      url: sampleVideo.uri,
      timeStamp: 1000,
      format: 'jpeg',
      cacheName: 'zxplayer_101_1700000500',
      maxWidth: 320,
      maxHeight: 320,
    });
    expect(path).toBe(
      'file:///data/cache/thumbnails/zxplayer_101_1700000500.jpeg',
    );
    expect(getCachedThumbnail(sampleVideo)).toBe(path);

    await requestThumbnail(sampleVideo).promise;
    expect(createThumbnailMock).toHaveBeenCalledTimes(1);
  });

  it('picks a frame inside very short clips', async () => {
    await requestThumbnail({ ...sampleVideo, id: 'short', durationSec: 0.8 })
      .promise;
    expect(createThumbnailMock.mock.calls[0][0].timeStamp).toBe(400);
  });

  it('surfaces native failures to the caller', async () => {
    createThumbnailMock.mockRejectedValueOnce(new Error('decoder error'));
    await expect(requestThumbnail(sampleVideo).promise).rejects.toThrow(
      'decoder error',
    );
    expect(getCachedThumbnail(sampleVideo)).toBeNull();
  });
});
