export const createThumbnail = jest.fn(
  async ({ cacheName }: { cacheName?: string }) => ({
    path: `file:///data/cache/thumbnails/${cacheName ?? 'thumb'}.jpeg`,
    size: 2048,
    mime: 'image/jpeg',
    width: 320,
    height: 180,
  }),
);

export default { createThumbnail };
