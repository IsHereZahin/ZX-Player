// Android only: iOS reads the Photos library through PhotoKit (camera-roll) instead.
module.exports = {
  dependency: {
    platforms: {
      ios: null,
    },
  },
};
