module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    './node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/jest.setup.ts',
  ],
  // Native libraries ship untranspiled sources and must go through Babel.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-camera-roll|@react-native-documents|@react-navigation|react-native-.*|zxplayer-brightness)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/test/**'],
};
