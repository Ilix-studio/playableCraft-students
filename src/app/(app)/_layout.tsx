// Signed-in screens: the tabs, and every page pushed over them. Also where a fresh generation that finished while
// its screen was closed is announced, and where runs are stopped on sign-out.

import { useEffect } from "react";
import { Stack, useRouter, type Href } from "expo-router";
import { ShellProvider } from "@/components/Shell";
import { cancelAllRuns, RUN_LABELS, useUnwatchedOutcomes } from "@/lib/runs";
import { useToast } from "@/lib/toast";
import { streaks } from "@/services/streak";

// A page opened with nothing beneath it (a web URL, a deep link, a reload that restored the route) still gets the
// tabs underneath, so its Back button has somewhere to go instead of an unhandled GO_BACK.
export const unstable_settings = { anchor: "(tabs)" };

export default function AppLayout() {
  const toast = useToast();
  const router = useRouter();

  useUnwatchedOutcomes((o) => {
    if (o.route) {
      toast(`${RUN_LABELS[o.kind]} ready`, "success");
      router.push(o.route as Href);
    } else {
      toast(o.error ?? `${RUN_LABELS[o.kind]} failed`, "error");
    }
  });

  // Leaving the signed-in screens is signing out: nothing of this account may keep running.
  useEffect(
    () => () => {
      cancelAllRuns();
      streaks.clear();
    },
    [],
  );

  return (
    <ShellProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#08090C" } }} />
    </ShellProvider>
  );
}
