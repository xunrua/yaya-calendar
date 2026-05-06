const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude expo-sqlite for web platform since we use Dexie (IndexedDB) instead
config.resolver.platforms = ['ios', 'android', 'web'];

// For web, we don't need expo-sqlite - it causes WASM loading issues
// The database.ts file handles platform detection internally

module.exports = config;