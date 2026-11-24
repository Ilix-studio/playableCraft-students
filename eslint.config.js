// ESLint: Expo's recommended rules (React, hooks, imports) for the student app.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([expoConfig, { ignores: ["dist/*", ".expo/*", "assets/sim/*"] }]);
