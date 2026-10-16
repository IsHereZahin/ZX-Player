import { keepLocalCopy, pick } from '@react-native-documents/picker';

import { SAMPLE_ASS, SAMPLE_SRT } from '../../../../test/fixtures';
import { pickSubtitleFile, SubtitleFileError } from '../subtitleFile';

const pickMock = pick as jest.Mock;
const keepLocalCopyMock = keepLocalCopy as jest.Mock;

function givenPickedFile(
  name: string | null,
  content: string,
  size = content.length,
) {
  pickMock.mockResolvedValueOnce([
    { uri: 'content://docs/42', name, size, error: null },
  ]);
  keepLocalCopyMock.mockResolvedValueOnce([
    {
      status: 'success',
      sourceUri: 'content://docs/42',
      localUri: 'file:///cache/sub',
    },
  ]);
  jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue({ text: async () => content } as unknown as Response);
}

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('pickSubtitleFile', () => {
  it('parses a picked SRT file from its local copy', async () => {
    givenPickedFile('movie.srt', SAMPLE_SRT);

    const result = await pickSubtitleFile();

    expect(keepLocalCopyMock).toHaveBeenCalledWith({
      files: [{ uri: 'content://docs/42', fileName: 'movie.srt' }],
      destination: 'cachesDirectory',
    });
    expect(globalThis.fetch).toHaveBeenCalledWith('file:///cache/sub');
    expect(result?.fileName).toBe('movie.srt');
    expect(result?.track.cues).toHaveLength(2);
  });

  it('parses ASS files, sniffing the format when the name has no extension', async () => {
    givenPickedFile(null, SAMPLE_ASS);
    const result = await pickSubtitleFile();
    expect(result?.fileName).toBe('subtitles');
    expect(result?.track.cues[0].text).toBe('Hello, world\nSecond line');
  });

  it('returns null when the user cancels', async () => {
    pickMock.mockRejectedValueOnce(
      Object.assign(new Error('cancelled'), { code: 'OPERATION_CANCELED' }),
    );
    await expect(pickSubtitleFile()).resolves.toBeNull();
  });

  it('rethrows unexpected picker errors', async () => {
    pickMock.mockRejectedValueOnce(new Error('picker exploded'));
    await expect(pickSubtitleFile()).rejects.toThrow('picker exploded');
  });

  it('rejects files that are too large before copying them', async () => {
    pickMock.mockResolvedValueOnce([
      {
        uri: 'content://docs/1',
        name: 'movie.mp4',
        size: 700 * 1024 * 1024,
        error: null,
      },
    ]);
    await expect(pickSubtitleFile()).rejects.toBeInstanceOf(SubtitleFileError);
    expect(keepLocalCopyMock).not.toHaveBeenCalled();
  });

  it('reports a failed local copy', async () => {
    pickMock.mockResolvedValueOnce([
      { uri: 'content://docs/1', name: 'a.srt', size: 10, error: null },
    ]);
    keepLocalCopyMock.mockResolvedValueOnce([
      { status: 'error', sourceUri: 'content://docs/1', copyError: 'denied' },
    ]);
    await expect(pickSubtitleFile()).rejects.toThrow("Couldn't open “a.srt”.");
  });

  it('rejects unsupported and empty files with a user-facing message', async () => {
    givenPickedFile('notes.txt', 'shopping list');
    await expect(pickSubtitleFile()).rejects.toThrow(
      'Choose an .srt, .ass or .ssa subtitle file.',
    );

    givenPickedFile('empty.srt', '1\nno timing here');
    await expect(pickSubtitleFile()).rejects.toThrow(
      'No subtitles were found in “empty.srt”.',
    );
  });
});
