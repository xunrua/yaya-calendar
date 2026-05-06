const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure resolver for web platform
config.resolver.platforms = ['ios', 'android', 'web'];

// Handle ES modules (like Dexie) for web
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Enable package exports for proper ESM resolution
config.resolver.unstable_enablePackageExports = true;

// Add a global polyfill for import.meta.env
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => {
    return [];
  },
};

// Override the transform to replace import.meta.env
const originalTransform = config.transformer?.babelTransformerPath;
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('./metro-transformer.js'),
};

module.exports = config;