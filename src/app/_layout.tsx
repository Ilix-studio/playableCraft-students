// The root: providers, then signed-in and signed-out route groups guarded by the session, so a student who is not
// signed in can never reach a screen that needs the server's data.

import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { queryClient } from "@/lib/query";
import { SessionProvider, useSession } from "@/lib/session";
import { ToastProvider } from "@/lib/toast";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** A solid strip behind the (transparent, edge-to-edge) status bar, so scrolled content never runs under its icons. */
function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: "#08090C" }} />;
}

function Routes() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === "loading") return null;
  // Each guard names where a refused visit goes. Left to the default (this stack's anchor, and it has none), a
  // signed-out visit to "/" on web went to the bare group URL "/(auth)", which matches no page: "Unmatched Route".
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#08090C" } }}>
      <Stack.Protected guard={status === "signedIn"} redirectTo="/sign-in">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedOut"} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#08090C" }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <SessionProvider>
              <StatusBar style="light" />
              <Routes />
              <StatusBarBackdrop />
            </SessionProvider>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
