const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure resolver for web platform
config.resolver.platforms = ['ios', 'android', 'web'];

// Handle ES modules (like Dexie) for web
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Alias for web-specific modules
config.resolver.unstable_enablePackageExports = true;

module.exports = config;