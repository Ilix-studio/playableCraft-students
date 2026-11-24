// Signed-out screens: sign in (the first), create an account, reset a password.

import { Stack } from "expo-router";

// Signing out lands on sign-in, not on whichever signed-out screen sorts first.
export const unstable_settings = { anchor: "sign-in" };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#050B1A" } }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
