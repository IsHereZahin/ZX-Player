import {
  checkForUpdate,
  parseRelease,
  RELEASE_MANIFEST_URL,
} from '../updateCheck';

const manifest = {
  version: '1.11',
  build: 12,
  releasedAt: '2026-11-01',
  downloadUrl: 'https://zx-player.vercel.app/ZX-Player.apk',
  notes: ['Faster start', '  ', 42, 'Trimmed  '],
};

const originalFetch = globalThis.fetch;

function respondWith(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
) {
  globalThis.fetch = jest.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('parseRelease', () => {
  it('accepts a well-formed manifest and cleans its notes', () => {
    expect(parseRelease(manifest)).toEqual({
      version: '1.11',
      build: 12,
      releasedAt: '2026-11-01',
      downloadUrl: 'https://zx-player.vercel.app/ZX-Player.apk',
      notes: ['Faster start', 'Trimmed'],
    });
  });

  it('resolves a download path against the website', () => {
    expect(
      parseRelease({ ...manifest, downloadUrl: '/downloads/ZX-Player.apk' })
        ?.downloadUrl,
    ).toBe('https://zx-player.vercel.app/downloads/ZX-Player.apk');
  });

  it.each([
    ['plain http', { downloadUrl: 'http://example.com/app.apk' }],
    // eslint-disable-next-line no-script-url -- the test checks such links are refused
    ['a script link', { downloadUrl: 'javascript:alert(1)' }],
    ['a path leaving the site', { downloadUrl: '../secret.apk' }],
    ['a missing build', { build: undefined }],
    ['a fractional build', { build: 12.5 }],
    ['a build below 1', { build: 0 }],
    ['an odd version', { version: '1.x' }],
  ])('rejects %s', (_label, change) => {
    expect(parseRelease({ ...manifest, ...change })).toBeNull();
  });

  it('rejects anything that is not an object', () => {
    expect(parseRelease(null)).toBeNull();
    expect(parseRelease([manifest])).toBeNull();
    expect(parseRelease('1.11')).toBeNull();
  });
});

describe('checkForUpdate', () => {
  it('offers a release with a higher build number', async () => {
    respondWith(manifest);
    await expect(
      checkForUpdate({ version: '1.10', build: 11 }),
    ).resolves.toMatchObject({ kind: 'update', release: { version: '1.11' } });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      RELEASE_MANIFEST_URL,
      expect.anything(),
    );
  });

  it('reports the latest version when builds match', async () => {
    respondWith(manifest);
    await expect(
      checkForUpdate({ version: '1.11', build: 12 }),
    ).resolves.toMatchObject({ kind: 'latest' });
  });

  it('fails on an HTTP error or a malformed manifest', async () => {
    respondWith({}, { ok: false, status: 404 });
    await expect(
      checkForUpdate({ version: '1.10', build: 11 }),
    ).rejects.toThrow('404');

    respondWith({ version: '1.11' });
    await expect(
      checkForUpdate({ version: '1.10', build: 11 }),
    ).rejects.toThrow('malformed');
  });
});
