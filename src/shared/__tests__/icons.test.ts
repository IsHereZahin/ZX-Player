// Jest maps every icon to a mock (see jest.config.js), so this guards the real imports:
// some Lucide names ship only as type aliases and fail in the Metro bundle.
declare const __dirname: string;

const fs = jest.requireActual('fs') as {
  readFileSync: (path: string, encoding: string) => string;
  existsSync: (path: string) => boolean;
};

describe('icon imports', () => {
  it('point at icon modules that exist at runtime', () => {
    const source = fs.readFileSync(`${__dirname}/../icons.ts`, 'utf8');
    const names = [
      ...source.matchAll(/lucide-react-native\/icons\/([a-z0-9-]+)/g),
    ].map(match => match[1]);
    const iconsDir = `${__dirname}/../../../node_modules/lucide-react-native/dist/esm/icons`;

    expect(names.length).toBeGreaterThan(40);
    expect(
      names.filter(name => !fs.existsSync(`${iconsDir}/${name}.mjs`)),
    ).toEqual([]);
  });
});
