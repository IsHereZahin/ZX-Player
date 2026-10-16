import { useEffect, useState } from 'react';

import { reportError } from '../../../shared/logger';
import { TaskCancelledError } from '../../../shared/utils/taskQueue';
import { getCachedThumbnail, requestThumbnail } from '../services/thumbnails';
import type { VideoItem } from '../types';

/** Thumbnail or album-art URI, or null while it loads / when the item has none. */
export function useThumbnail(item: VideoItem): string | null {
  const [uri, setUri] = useState(() => getCachedThumbnail(item) ?? null);

  useEffect(() => {
    const cached = getCachedThumbnail(item);
    setUri(cached ?? null);
    if (cached !== undefined) {
      return;
    }

    let active = true;
    const request = requestThumbnail(item);
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
  }, [item]);

  return uri;
}
