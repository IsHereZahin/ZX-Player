import { act } from '@testing-library/react-native';

import { flushPersistedStores, resetAppState } from './src/test/resetAppState';

// Stores are module singletons; start every test from defaults, an empty disk and clean
// mock call history (implementations queued with mock*Once are kept).
beforeEach(() => {
  jest.clearAllMocks();
  resetAppState();
});

// Pending debounced writes would otherwise keep Jest's process alive. Inside act, so a list
// rendering its last batch of rows meanwhile is not reported as an unwrapped update.
afterEach(async () => {
  await act(async () => {
    await flushPersistedStores();
  });
});
