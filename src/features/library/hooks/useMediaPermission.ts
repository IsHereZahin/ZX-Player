import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { reportError } from '../../../shared/logger';
import {
  checkMediaPermission,
  requestMediaPermission,
  type MediaPermissionStatus,
} from '../services/mediaPermissions';
import type { MediaScope } from '../types';

/**
 * Tracks media-library permission and re-checks whenever the app returns to the
 * foreground (e.g. after the user changes it in Settings). `status` is null while
 * the first check is in flight.
 */
export function useMediaPermission(scope: MediaScope = 'video') {
  const [status, setStatus] = useState<MediaPermissionStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const checked = await checkMediaPermission(scope);
      // A plain check cannot tell "never asked" from "denied", so keep the more
      // specific answer learned from an earlier request.
      setStatus(previous =>
        checked === 'undetermined' &&
        (previous === 'denied' || previous === 'blocked')
          ? previous
          : checked,
      );
    } catch (error) {
      reportError('Media permission check failed', error);
      setStatus('unavailable');
    }
  }, [scope]);

  const request = useCallback(async () => {
    try {
      setStatus(await requestMediaPermission(scope));
    } catch (error) {
      reportError('Media permission request failed', error);
      setStatus('unavailable');
    }
  }, [scope]);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  return { status, request };
}
