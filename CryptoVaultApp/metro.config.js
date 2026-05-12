// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Required for ethers.js v6 in React Native / Hermes
config.resolver.unstable_enablePackageExports = false

// Ensure Buffer, process, crypto are resolved correctly
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer:  require.resolve('buffer'),
  process: require.resolve('process'),
}

module.exports = config
