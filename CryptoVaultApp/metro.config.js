const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Required for ethers.js v6 in React Native
config.resolver.unstable_enablePackageExports = false

module.exports = config