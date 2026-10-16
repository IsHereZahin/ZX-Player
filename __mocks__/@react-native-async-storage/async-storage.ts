/** In-memory AsyncStorage; `__reset` clears it between tests. */
const data = new Map<string, string>();

const AsyncStorage = {
  getItem: jest.fn(async (key: string) => data.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    data.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    data.delete(key);
  }),
  getMany: jest.fn(async (keys: string[]) =>
    Object.fromEntries(keys.map(key => [key, data.get(key) ?? null])),
  ),
  setMany: jest.fn(async (entries: Record<string, string>) => {
    Object.entries(entries).forEach(([key, value]) => data.set(key, value));
  }),
  removeMany: jest.fn(async (keys: string[]) => {
    keys.forEach(key => data.delete(key));
  }),
  getAllKeys: jest.fn(async () => [...data.keys()]),
  clear: jest.fn(async () => {
    data.clear();
  }),
  __reset: () => data.clear(),
};

export default AsyncStorage;
