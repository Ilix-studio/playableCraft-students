// Firebase as proof only, through its REST API (no native module, so it runs in Expo Go and on web): a phone
// number checked by SMS at sign-up, and a Google account for "Continue with Google". Each ends in a Firebase ID
// token that the server verifies; our own session always comes from the server.

import { Platform } from "react-native";

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";
export const AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
const BASE = "https://identitytoolkit.googleapis.com/v1";

export const GOOGLE_CLIENT_IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
};

export const phoneVerificationAvailable = Boolean(API_KEY && AUTH_DOMAIN);

/** Google sign-in needs Firebase and an OAuth client for this platform. */
export const googleSignInAvailable =
  Boolean(API_KEY) &&
  Boolean(Platform.OS === "android" ? GOOGLE_CLIENT_IDS.androidClientId : Platform.OS === "ios" ? GOOGLE_CLIENT_IDS.iosClientId : GOOGLE_CLIENT_IDS.webClientId);

/** Firebase's REST errors are codes ("INVALID_CODE"); these are the ones a student can act on. */
const MESSAGES: Record<string, string> = {
  INVALID_CODE: "That code isn't right. Check the SMS and try again.",
  SESSION_EXPIRED: "The code has expired. Send a new one.",
  INVALID_PHONE_NUMBER: "Enter a valid 10-digit mobile number.",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Please wait a while and try again.",
  QUOTA_EXCEEDED: "We can't send more codes right now. Please try again later.",
  CAPTCHA_CHECK_FAILED: "The security check failed. Please try again.",
};

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}${path.includes("?") ? "&" : "?"}key=${API_KEY}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the verification service. Check your connection and try again.");
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json) {
    const code = (json?.error?.message ?? "").split(" ")[0].split(":")[0];
    throw new Error(MESSAGES[code] ?? "Verification failed. Please try again.");
  }
  return json;
}

/** The project's reCAPTCHA site key, for the check that precedes an SMS. */
export async function recaptchaSiteKey(): Promise<string> {
  return (await call<{ recaptchaSiteKey: string }>("recaptchaParams")).recaptchaSiteKey;
}

/** Sends the SMS; the result identifies this verification for confirmPhoneCode. */
export async function sendPhoneCode(tenDigits: string, recaptchaToken: string): Promise<string> {
  const r = await call<{ sessionInfo: string }>("accounts:sendVerificationCode", { phoneNumber: `+91${tenDigits}`, recaptchaToken });
  return r.sessionInfo;
}

/** A Firebase ID token proving the number, for the sign-up request. */
export async function confirmPhoneCode(sessionInfo: string, code: string): Promise<string> {
  return (await call<{ idToken: string }>("accounts:signInWithPhoneNumber", { sessionInfo, code: code.trim() })).idToken;
}

/** Exchanges a Google ID token for a Firebase ID token, for POST google/login. */
export async function firebaseTokenFromGoogle(googleIdToken: string): Promise<string> {
  const r = await call<{ idToken: string }>("accounts:signInWithIdp", {
    postBody: `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`,
    requestUri: `https://${AUTH_DOMAIN || "localhost"}`,
    returnSecureToken: true,
    returnIdpCredential: true,
  });
  return r.idToken;
}
