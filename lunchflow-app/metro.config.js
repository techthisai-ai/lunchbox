const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude Cursor agent skills from Metro file watcher (prevents ENOENT crashes).
config.resolver.blockList = [
  ...(config.resolver.blockList ?? []),
  new RegExp(path.resolve(__dirname, '.agents').replace(/\\/g, '\\\\') + '.*'),
];

config.watchFolders = config.watchFolders?.filter(
  (folder) => !folder.includes('.agents'),
);

module.exports = config;
