import { useEffect, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { TaskCancelledError } from '../../../shared/utils/taskQueue';
import { getCachedThumbnail, requestThumbnail } from '../services/thumbnails';
import type { VideoItem } from '../types';

/** Thumbnail URI for a video, or null while it is generated / if it cannot be. */
export function useThumbnail(video: VideoItem): string | null {
  const [uri, setUri] = useState(() => getCachedThumbnail(video));

  useEffect(() => {
    const cached = getCachedThumbnail(video);
    setUri(cached);
    if (cached) {
      return;
    }

    let active = true;
    const request = requestThumbnail(video);
    request.promise.then(
      path => {
        if (active) {
          setUri(path);
        }
      },
      error => {
        if (active && !(error instanceof TaskCancelledError)) {
          reportError('Thumbnail generation failed', error);
        }
      },
    );
    return () => {
      active = false;
      request.cancel();
    };
  }, [video]);

  return uri;
}
