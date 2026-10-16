import { flushPersistedStores, resetAppState } from './src/test/resetAppState';

// Stores are module singletons; start every test from defaults, an empty disk and clean
// mock call history (implementations queued with mock*Once are kept).
beforeEach(() => {
  jest.clearAllMocks();
  resetAppState();
});

// Pending debounced writes would otherwise keep Jest's process alive.
afterEach(async () => {
  await flushPersistedStores();
});
