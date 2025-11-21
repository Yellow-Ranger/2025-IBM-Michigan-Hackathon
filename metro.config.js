// Metro configuration for Expo with custom asset support
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow bundling .stl assets so we can ship sample meshes
config.resolver.assetExts.push("stl");

module.exports = config;
