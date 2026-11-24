// Sign in (POST student/login). This app is for students only: teachers and tutors use the PlayableCraft app,
// and schools the website. "Keep me signed in" (on by default) remembers the session on this device; "Forgot
// password?" emails a reset link (POST forgot-password), which can be sent again after 30 seconds.

import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, messageOf } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button, Field, InlineError, Sheet, Wordmark } from "@/components/ui";
import { GoogleButton } from "@/components/GoogleButton";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_AFTER_S = 30;

function ForgotPassword({ initial, onClose }: { initial: string; onClose: () => void }) {
  const [email, setEmail] = useState(initial);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.post("forgot-password", { role: "STUDENT", email: v }, { auth: false });
      setSentTo(v);
      setCooldown(RESEND_AFTER_S);
    } catch (err) {
      setError(messageOf(err, "Could not send the link. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <View>
      <Text className="text-lg font-semibold text-ink">Reset your password</Text>
      <Text className="mb-4 mt-1 text-sm leading-5 text-ink-muted">
        {sentTo
          ? `We sent a reset link to ${sentTo}. Open it on any device to choose a new password.`
          : "Enter your account's email and we'll send you a link to choose a new password."}
      </Text>
      {!sentTo && <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />}
      <InlineError text={error} />
      <View className="mt-3 flex-row gap-3">
        <Button title="Close" variant="ghost" onPress={onClose} className="flex-1" />
        <Button
          title={sentTo ? (cooldown > 0 ? `Send again in ${cooldown}s` : "Send again") : "Send link"}
          onPress={send}
          loading={sending}
          disabled={cooldown > 0}
          className="flex-1"
        />
      </View>
    </View>
  );
}

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password, keep);
    } catch (err) {
      setError(messageOf(err, "Sign-in failed. Please try again."));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-auth-base" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <View className="mx-auto w-full max-w-[480px]">
          <Wordmark size={24} />
          <Text className="mt-9 text-[32px] font-bold tracking-tight text-ink">Welcome back,</Text>
          <Text className="mt-1 text-base text-auth-muted">Sign in to your student account.</Text>

          <View className="mt-8">
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="Enter the email" keyboardType="email-address" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secure />
            <View className="mb-2 flex-row items-center justify-between">
              <Pressable onPress={() => setKeep((k) => !k)} className="flex-row items-center py-1" accessibilityRole="checkbox" accessibilityState={{ checked: keep }}>
                <View className={`h-5 w-5 items-center justify-center rounded border ${keep ? "border-auth-primary bg-auth-primary" : "border-auth-border"}`}>
                  {keep && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text className="ml-2 text-sm text-auth-muted">Keep me signed in</Text>
              </Pressable>
              <Pressable onPress={() => setForgot(true)} className="py-1">
                <Text className="text-sm font-medium text-auth-link">Forgot password?</Text>
              </Pressable>
            </View>
            <InlineError text={error} />
            <Button title="Sign in" onPress={submit} loading={busy} icon="arrow-forward" className="mt-4 h-12 bg-auth-primary" />

            <View className="my-6 flex-row items-center">
              <View className="h-px flex-1 bg-auth-border" />
              <Text className="mx-3 text-xs text-auth-muted">or</Text>
              <View className="h-px flex-1 bg-auth-border" />
            </View>
            <GoogleButton keep={keep} onError={setError} />

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-auth-muted">New here? </Text>
              <Pressable onPress={() => router.push("/sign-up")}>
                <Text className="text-sm font-semibold text-auth-link">Create account →</Text>
              </Pressable>
            </View>
            <Text className="mt-8 text-center text-xs leading-5 text-auth-muted">
              Teachers and tutors use the PlayableCraft app. Schools sign in on the website, playablecraft.live.
            </Text>
          </View>
        </View>
      </ScrollView>
      <Sheet visible={forgot} onClose={() => setForgot(false)}>
        <ForgotPassword initial={email.trim()} onClose={() => setForgot(false)} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}
