export const CameraRoll = {
  getAlbums: jest.fn(async () => []),
  getPhotos: jest.fn(async () => ({
    edges: [],
    page_info: { has_next_page: false },
  })),
};

export const iosReadGalleryPermission = jest.fn(async () => 'granted');
export const iosRequestReadWriteGalleryPermission = jest.fn(
  async () => 'granted',
);
