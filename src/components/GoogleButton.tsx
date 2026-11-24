// "Continue with Google": signs in an existing student account whose email is verified (server: google/login);
// it never creates an account. Google's sign-in page opens in the browser (expo-auth-session), and its ID token is
// exchanged with Firebase for the token the server checks. Without OAuth client IDs in the build it says so.

import { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { messageOf } from "@/lib/api";
import { firebaseTokenFromGoogle, GOOGLE_CLIENT_IDS, googleSignInAvailable } from "@/lib/firebase";
import { useSession } from "@/lib/session";

WebBrowser.maybeCompleteAuthSession();

const FAILED = "Couldn't sign in with Google. Please try again, or sign in with your password.";

function Look({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={busy} className="h-12 flex-row items-center justify-center rounded-xl border border-auth-border bg-[#0B0F1A] active:opacity-80">
      {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="logo-google" size={18} color="#fff" />}
      <Text className="ml-2.5 text-[15px] font-medium text-ink">Continue with Google</Text>
    </Pressable>
  );
}

function ConfiguredGoogleButton({ keep, onError }: { keep: boolean; onError: (message: string | null) => void }) {
  const { signInWithGoogle } = useSession();
  const [request, , prompt] = Google.useIdTokenAuthRequest(GOOGLE_CLIENT_IDS);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    onError(null);
    setBusy(true);
    try {
      const result = await prompt();
      // Closing Google's page is not an error.
      if (result.type !== "success") {
        if (result.type === "error") onError(FAILED);
        setBusy(false);
        return;
      }
      await signInWithGoogle(await firebaseTokenFromGoogle(result.params.id_token), keep);
    } catch (err) {
      onError(messageOf(err, FAILED));
      setBusy(false);
    }
  };

  return <Look busy={busy || !request} onPress={go} />;
}

export function GoogleButton(props: { keep: boolean; onError: (message: string | null) => void }) {
  if (googleSignInAvailable) return <ConfiguredGoogleButton {...props} />;
  return <Look busy={false} onPress={() => props.onError("Google sign-in isn't set up in this version of the app yet.")} />;
}
