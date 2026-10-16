// Native modules are replaced by the manual mocks in /__mocks__.
jest.mock('react-native-video');
jest.mock('react-native-volume-manager');
jest.mock('react-native-create-thumbnail');
jest.mock('react-native-svg');
jest.mock('@react-native-camera-roll/camera-roll');
jest.mock('@react-native-documents/picker');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('zxplayer-brightness');
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Error paths are asserted through this mock instead of printing console warnings.
jest.mock('./src/shared/logger');
