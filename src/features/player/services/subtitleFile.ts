import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';

import {
  detectSubtitleFormat,
  parseSubtitles,
  type SubtitleTrack,
} from '../subtitles';

// Subtitle files are tiny; anything larger is almost certainly the wrong file
// (e.g. a video picked by mistake) and would only waste memory.
const MAX_SUBTITLE_BYTES = 5 * 1024 * 1024;

/** Error whose message is safe to show to the user as-is. */
export class SubtitleFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubtitleFileError';
  }
}

export interface LoadedSubtitles {
  fileName: string;
  track: SubtitleTrack;
}

async function readTextFile(uri: string): Promise<string> {
  // RN's fetch reads local file:// URIs on both platforms (Android via BlobModule).
  const response = await fetch(uri);
  return response.text();
}

/**
 * Lets the user choose an .srt / .ass / .ssa file and parses it.
 * Resolves null when the user cancels the picker.
 */
export async function pickSubtitleFile(): Promise<LoadedSubtitles | null> {
  let picked;
  try {
    // MIME types for subtitle files are inconsistent across devices, so accept any file
    // and validate the content instead.
    [picked] = await pick({ type: [types.allFiles] });
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED
    ) {
      return null;
    }
    throw error;
  }

  const fileName = picked.name ?? 'subtitles';
  if (picked.size != null && picked.size > MAX_SUBTITLE_BYTES) {
    throw new SubtitleFileError(
      `“${fileName}” is too large to be a subtitle file.`,
    );
  }

  // A local copy keeps the file readable after the picker's temporary access grant ends.
  const [copy] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') {
    throw new SubtitleFileError(`Couldn't open “${fileName}”.`);
  }

  const content = await readTextFile(copy.localUri);
  const format = detectSubtitleFormat(fileName, content);
  if (!format) {
    throw new SubtitleFileError('Choose an .srt, .ass or .ssa subtitle file.');
  }

  const track = parseSubtitles(content, format);
  if (track.cues.length === 0) {
    throw new SubtitleFileError(`No subtitles were found in “${fileName}”.`);
  }
  return { fileName, track };
}
