module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated v4 cambió el plugin: ahora vive en react-native-worklets
    plugins: ['react-native-worklets/plugin'],
  };
};
