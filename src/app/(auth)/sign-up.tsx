// Create a student account (POST student/register; the Android app's sign-up for a Student). Both contacts are
// proven first, as the server requires in production: the email by a 6-digit code the server sends
// (email-otp/send, email-otp/verify), the mobile number by an SMS from Firebase.

import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Recaptcha } from "@/components/auth/Recaptcha";
import { Button, colors, Field, InlineError, Wordmark } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { WEBSITE_URL } from "@/lib/config";
import { confirmPhoneCode, phoneVerificationAvailable, recaptchaSiteKey, sendPhoneCode } from "@/lib/firebase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const RESEND_AFTER_S = 30;

/** A contact proven by a code: send, type the code, verified. */
function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(RESEND_AFTER_S)] as const;
}

function VerifyRow({
  sent,
  verified,
  busy,
  cooldown,
  code,
  setCode,
  onSend,
  onVerify,
  noun,
}: {
  sent: boolean;
  verified: boolean;
  busy: boolean;
  cooldown: number;
  code: string;
  setCode: (s: string) => void;
  onSend: () => void;
  onVerify: () => void;
  noun: string;
}) {
  if (verified) {
    return (
      <View className="-mt-1 mb-3 flex-row items-center">
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text className="ml-1.5 text-xs text-success">Verified</Text>
      </View>
    );
  }
  return (
    <View className="-mt-1 mb-3">
      {sent && <Text className="mb-1.5 text-xs text-auth-muted">Code sent to your {noun}</Text>}
      <View className="flex-row items-start gap-2">
        {sent && (
          <View className="flex-1">
            <Field value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" keyboardType="number-pad" />
          </View>
        )}
        {sent && <Button title="Verify" loading={busy} disabled={code.length !== 6} onPress={onVerify} className="h-[46px]" />}
        <Button
          title={cooldown > 0 ? `Resend in ${cooldown}s` : sent ? "Resend code" : "Send code"}
          variant="ghost"
          disabled={busy || cooldown > 0}
          onPress={onSend}
          className={`h-[46px] ${sent ? "" : "self-start"}`}
        />
      </View>
    </View>
  );
}

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Email proof
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [emailToken, setEmailToken] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailCooldown, startEmailCooldown] = useCountdown();
  const emailVerified = emailToken !== null && emailSentTo === email.trim().toLowerCase();

  // Phone proof
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState(false);
  const [phoneSession, setPhoneSession] = useState<{ phone: string; sessionInfo: string } | null>(null);
  const [phoneCode, setPhoneCode] = useState("");
  const [firebaseToken, setFirebaseToken] = useState<{ phone: string; token: string } | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneCooldown, startPhoneCooldown] = useCountdown();
  const phoneVerified = firebaseToken !== null && firebaseToken.phone === phone;

  const sendEmail = async () => {
    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) return setError("Enter a valid email address.");
    setEmailBusy(true);
    setError(null);
    try {
      await api.post("email-otp/send", { email: v }, { auth: false });
      setEmailSentTo(v);
      setEmailToken(null);
      setEmailCode("");
      startEmailCooldown();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setEmailBusy(false);
    }
  };

  const verifyEmail = async () => {
    if (!emailSentTo) return;
    setEmailBusy(true);
    setError(null);
    try {
      const r = await api.post<{ verificationToken: string }>("email-otp/verify", { email: emailSentTo, code: emailCode }, { auth: false });
      setEmailToken(r.verificationToken);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setEmailBusy(false);
    }
  };

  const sendPhone = async () => {
    if (!PHONE_RE.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    if (!phoneVerificationAvailable) return setError("Phone verification isn't set up in this version of the app. Create your account on the website.");
    setPhoneBusy(true);
    setError(null);
    try {
      setSiteKey(siteKey ?? (await recaptchaSiteKey()));
      setCaptcha(true);
    } catch (err) {
      setError(messageOf(err));
      setPhoneBusy(false);
    }
  };

  const onCaptcha = async (r: { token?: string; error?: string }) => {
    setCaptcha(false);
    if (!r.token) {
      setError(r.error ?? "The security check failed. Please try again.");
      setPhoneBusy(false);
      return;
    }
    try {
      const sessionInfo = await sendPhoneCode(phone, r.token);
      setPhoneSession({ phone, sessionInfo });
      setFirebaseToken(null);
      setPhoneCode("");
      startPhoneCooldown();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPhoneBusy(false);
    }
  };

  const verifyPhone = async () => {
    if (!phoneSession) return;
    setPhoneBusy(true);
    setError(null);
    try {
      setFirebaseToken({ phone: phoneSession.phone, token: await confirmPhoneCode(phoneSession.sessionInfo, phoneCode) });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPhoneBusy(false);
    }
  };

  const submit = async () => {
    const problem = !name.trim()
      ? "Enter your full name."
      : !EMAIL_RE.test(email.trim())
        ? "Enter a valid email address."
        : !emailVerified
          ? "Please verify your email to continue."
          : !PHONE_RE.test(phone)
            ? "Enter a valid 10-digit mobile number."
            : !phoneVerified
              ? "Please verify your phone number to continue."
              : password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)
                ? "Password needs 8 or more characters, with an uppercase letter, a lowercase letter and a digit."
                : !accepted
                  ? "Please accept the Terms and Privacy Policy."
                  : null;
    if (problem) return setError(problem);
    setSubmitting(true);
    setError(null);
    try {
      await api.post(
        "student/register",
        {
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phoneNumber: phone,
          emailVerificationToken: emailToken,
          firebaseIdToken: firebaseToken?.token,
        },
        { auth: false },
      );
      setDone(true);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View className="flex-1 items-center justify-center bg-auth-base px-6">
        <Ionicons name="checkmark-circle" size={56} color={colors.success} />
        <Text className="mt-4 text-2xl font-bold text-ink">Account created</Text>
        <Text className="mt-2 text-center text-[15px] text-auth-muted">Your account is ready. Sign in to continue.</Text>
        <Button title="Back to sign in" onPress={() => router.back()} className="mt-6 h-12 w-full max-w-[480px] bg-auth-primary" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-auth-base" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-6" contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <View className="mx-auto w-full max-w-[480px]">
          <Wordmark size={24} />
          <Text className="mt-8 text-[30px] font-bold tracking-tight text-ink">Create account</Text>
          <Text className="mb-6 mt-1 text-base text-auth-muted">A student account: join your classes, practise and track your progress.</Text>

          <Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <VerifyRow
            noun="email"
            sent={emailSentTo !== null && emailSentTo === email.trim().toLowerCase()}
            verified={emailVerified}
            busy={emailBusy}
            cooldown={emailCooldown}
            code={emailCode}
            setCode={setEmailCode}
            onSend={sendEmail}
            onVerify={verifyEmail}
          />
          <Field label="Mobile number" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" keyboardType="phone-pad" />
          {captcha && siteKey && <Recaptcha siteKey={siteKey} onResult={onCaptcha} />}
          <VerifyRow
            noun="phone"
            sent={phoneSession !== null && phoneSession.phone === phone}
            verified={phoneVerified}
            busy={phoneBusy}
            cooldown={phoneCooldown}
            code={phoneCode}
            setCode={setPhoneCode}
            onSend={sendPhone}
            onVerify={verifyPhone}
          />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secure />
          <Text className="-mt-1 mb-3 text-xs text-auth-muted">8 or more characters, with an uppercase letter, a lowercase letter and a digit.</Text>

          <Pressable onPress={() => setAccepted((a) => !a)} className="mb-2 flex-row items-center py-1" accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
            <View className={`h-5 w-5 items-center justify-center rounded border ${accepted ? "border-auth-primary bg-auth-primary" : "border-auth-border"}`}>
              {accepted && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text className="ml-2 text-sm text-ink">
              I agree to the{" "}
              <Text className="font-medium text-auth-link" onPress={() => void Linking.openURL(`${WEBSITE_URL}/terms`)}>
                Terms and Privacy Policy.
              </Text>
            </Text>
          </Pressable>
          <InlineError text={error} />
          <Button title="Create account" loading={submitting} onPress={submit} className="mt-4 h-12 bg-auth-primary" />
          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-auth-muted">Already have an account? </Text>
            <Pressable onPress={() => router.back()}>
              <Text className="text-sm font-semibold text-auth-link">Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
