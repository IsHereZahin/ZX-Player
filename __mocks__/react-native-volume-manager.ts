export const getVolume = jest.fn(async () => ({ volume: 0.5 }));
export const setVolume = jest.fn(async () => undefined);
export const addVolumeListener = jest.fn(() => ({ remove: jest.fn() }));
