import { useCallback, useState } from 'react';

import { reportError } from '../../../shared/logger';
import {
  pickSubtitleFile,
  SubtitleFileError,
  type LoadedSubtitles,
} from '../services/subtitleFile';

export type SubtitleLoadResult =
  | { status: 'loaded'; fileName: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export function useSubtitles() {
  const [subtitles, setSubtitles] = useState<LoadedSubtitles | null>(null);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadFromFile = useCallback(async (): Promise<SubtitleLoadResult> => {
    setLoading(true);
    try {
      const loaded = await pickSubtitleFile();
      if (!loaded) {
        return { status: 'cancelled' };
      }
      setSubtitles(loaded);
      setVisible(true);
      return { status: 'loaded', fileName: loaded.fileName };
    } catch (error) {
      reportError('Loading subtitles failed', error);
      return {
        status: 'error',
        message:
          error instanceof SubtitleFileError
            ? error.message
            : "Couldn't load that subtitle file.",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleVisible = useCallback(() => setVisible(current => !current), []);
  const clear = useCallback(() => setSubtitles(null), []);

  return {
    track: subtitles?.track ?? null,
    fileName: subtitles?.fileName ?? null,
    visible,
    loading,
    loadFromFile,
    toggleVisible,
    clear,
  };
}
