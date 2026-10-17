import { useEffect, useRef } from 'react';

import { useLatestRef } from '../../../shared/hooks/useLatestRef';
import { useStore } from '../../../shared/storage/store';
import { mediaIndexVersion } from '../services/videoIndex';

/**
 * Calls `onChange` after the library changes under the app: files deleted, restored,
 * moved or copied, or a rescan asked for. Lists use it to reload in place.
 */
export function useLibraryChanges(onChange: () => void): void {
  const version = useStore(mediaIndexVersion, value => value);
  const handled = useRef(version);
  const latest = useLatestRef(onChange);
  useEffect(() => {
    if (handled.current !== version) {
      handled.current = version;
      latest.current();
    }
  }, [latest, version]);
}
