// Metro with NativeWind. `.html` is an asset type so the simulation templates in assets/sim ship inside the app
// and load offline (src/lib/simTemplate.ts).

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("html");

module.exports = withNativeWind(config, { input: "./src/global.css" });
