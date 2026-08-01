const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;

const ORIGINAL_TEXT = path.resolve(projectRoot, 'node_modules/react-native/Libraries/Text/Text.js');
const ORIGINAL_TEXT_INPUT = path.resolve(
  projectRoot,
  'node_modules/react-native/Libraries/Components/TextInput/TextInput.js',
);
const ORIGINAL_WEB_TEXT = path.resolve(
  projectRoot,
  'node_modules/react-native-web/dist/exports/Text/index.js',
);
const ORIGINAL_WEB_TEXT_INPUT = path.resolve(
  projectRoot,
  'node_modules/react-native-web/dist/exports/TextInput/index.js',
);

const PATCHED_TEXT = path.resolve(projectRoot, 'src/lib/PatchedText.tsx');
const PATCHED_TEXT_INPUT = path.resolve(projectRoot, 'src/lib/PatchedTextInput.tsx');

function normalize(p) {
  return String(p || '').replace(/\\/g, '/');
}

// Exclude Cursor agent skills from Metro file watcher (prevents ENOENT crashes).
config.resolver.blockList = [
  ...(config.resolver.blockList ?? []),
  new RegExp(path.resolve(__dirname, '.agents').replace(/\\/g, '\\\\') + '.*'),
];

config.watchFolders = config.watchFolders?.filter((folder) => !folder.includes('.agents'));

const defaultResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Escape hatches so patched components can import the real implementations.
  if (moduleName === '@lunchflow/original-text') {
    return {
      type: 'sourceFile',
      filePath: platform === 'web' ? ORIGINAL_WEB_TEXT : ORIGINAL_TEXT,
    };
  }
  if (moduleName === '@lunchflow/original-text-input') {
    return {
      type: 'sourceFile',
      filePath: platform === 'web' ? ORIGINAL_WEB_TEXT_INPUT : ORIGINAL_TEXT_INPUT,
    };
  }

  const resolve =
    typeof defaultResolver === 'function' ? defaultResolver : context.resolveRequest;

  const resolved = resolve(context, moduleName, platform);
  if (!resolved || resolved.type !== 'sourceFile' || !resolved.filePath) {
    return resolved;
  }

  const file = normalize(resolved.filePath);
  const origin = normalize(context.originModulePath);

  // Avoid redirecting when our patch files (or their deps) load the originals.
  if (origin.includes('/src/lib/PatchedText') || origin.includes('/src/lib/PatchedTextInput')) {
    return resolved;
  }

  if (platform === 'web') {
    if (file.endsWith('/react-native-web/dist/exports/Text/index.js')) {
      return { type: 'sourceFile', filePath: PATCHED_TEXT };
    }
    if (file.endsWith('/react-native-web/dist/exports/TextInput/index.js')) {
      return { type: 'sourceFile', filePath: PATCHED_TEXT_INPUT };
    }
  } else if (
    file.endsWith('/Libraries/Text/Text.js') ||
    file.endsWith('/Libraries/Text/Text.ts') ||
    file.endsWith('/Libraries/Text/Text.tsx')
  ) {
    return { type: 'sourceFile', filePath: PATCHED_TEXT };
  } else if (
    file.endsWith('/Libraries/Components/TextInput/TextInput.js') ||
    file.endsWith('/Libraries/Components/TextInput/TextInput.ts') ||
    file.endsWith('/Libraries/Components/TextInput/TextInput.tsx')
  ) {
    return { type: 'sourceFile', filePath: PATCHED_TEXT_INPUT };
  }

  return resolved;
};

module.exports = config;
