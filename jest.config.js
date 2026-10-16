module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    './node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/jest.setup.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.afterEnv.ts'],
  moduleNameMapper: {
    // Icons are imported one module at a time; tests don't need their drawings.
    '^lucide-react-native/icons/.*$': '<rootDir>/__mocks__/lucideIcon.tsx',
  },
  // Native libraries ship untranspiled sources and must go through Babel.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-camera-roll|@react-native-documents|@react-native-async-storage|@react-navigation|react-native-.*|zxplayer-brightness|zxplayer-media)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/test/**'],
};
