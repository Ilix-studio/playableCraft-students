// Where the API is. EXPO_PUBLIC_API_URL wins (set it for staging, or when the server runs on another computer).
// Otherwise a release build talks to the production API, as the Android app does, and a development build to the
// local server (`npm run server` in the monorepo, port 8080) on the computer that served it the JS bundle.

import Constants from "expo-constants";
import { Platform } from "react-native";

const PRODUCTION_API = "https://playable-craft-be-ns45nqrc3a-el.a.run.app/api/";
const LOCAL_SERVER_PORT = 8080;

/** The address a development build reaches the computer running Metro (and the server) by. */
function devHost(): string {
  // A browser loaded the page from that computer. Expo Go or a dev build knows it as hostUri ("192.168.1.5:8081"),
  // which is how a real phone on the same Wi-Fi gets there; localhost would be the phone itself. A tunnel
  // (`expo start --tunnel`) carries only Metro, so that case needs EXPO_PUBLIC_API_URL.
  const host = Platform.OS === "web" ? window.location.hostname : Constants.expoConfig?.hostUri?.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") {
    // The Android emulator's localhost is the emulator; it reaches the computer as 10.0.2.2.
    return Platform.OS === "android" ? "10.0.2.2" : "localhost";
  }
  return host;
}

/** The API's base URL, with a trailing slash; paths are joined to it without a leading one. */
export const API_URL: string = (
  process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? `http://${devHost()}:${LOCAL_SERVER_PORT}/api/` : PRODUCTION_API)
).replace(/\/?$/, "/");

/** The student web pages (plans are bought there, as class fees are). */
export const WEBSITE_URL = "https://playablecraft.live";
