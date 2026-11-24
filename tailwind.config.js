// Tailwind for NativeWind. Colours are the PlayableCraft Android app's (PlayableCraftApp ui/theme/Color.kt and
// ScreenKit's Kit), so the student app looks like the app it replaces.
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Not the default "media": NativeWind's web runtime sets the colour scheme itself once the stylesheet loads, and
  // under "media" that call throws ("Cannot manually set color scheme") and takes the whole page down. The app is
  // dark-only (app.json) and uses no `dark:` variants, so this changes nothing it draws.
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        page: "#08090C",
        card: "#0B1530",
        edge: "#1E2B4D",
        tag: { DEFAULT: "#152243", text: "#BACAF8" },
        ink: { DEFAULT: "#FFFFFF", muted: "#8F9BD6", label: "#8C96B0", faint: "#5E6985" },
        primary: { DEFAULT: "#3875FF", soft: "#3875FF26" },
        accent: "#8FB0FF",
        success: "#2EE59D",
        warning: "#F5B942",
        danger: "#FF6B6B",
        auth: {
          base: "#050B1A",
          surface: "#0D1933",
          border: "#344563",
          primary: "#2864FF",
          link: "#3B82F6",
          muted: "#94A3B8",
        },
      },
    },
  },
  plugins: [],
};
