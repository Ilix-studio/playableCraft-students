// A URL that names no page opens the student's start page instead of an error: Sign in when signed out, Home when
// signed in. That includes a bare group URL such as "/(auth)", which is a folder of routes, not a page.

import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";

export default function NotFound() {
  // The root layout renders no screen while the session is loading, so the status here is already settled.
  const { status } = useSession();
  return <Redirect href={status === "signedIn" ? "/" : "/sign-in"} />;
}
