const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const packageRoot = path.resolve(projectRoot, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the parent package (for hot reloading)
config.watchFolders = [packageRoot];

// 2. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(packageRoot, 'node_modules'),
];

// 3. Custom resolver to map @hypervideo/expo-native to the local package
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@hypervideo/expo-native') {
    // Resolve to the parent package's source
    return {
      filePath: path.resolve(packageRoot, 'src', 'index.ts'),
      type: 'sourceFile',
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
