// Profile (the Android app's Profile for a Student): who is signed in, quick links, signing out, and signing out
// of every device (POST logout-all; other devices lose access once their 15-minute access token ends).

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/Shell";
import { Button, Card, colors, ConfirmDialog, SectionLabel, Tag, type IconName } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";

const QUICK: { label: string; description: string; icon: IconName; href: Href }[] = [
  { label: "Home", description: "Content from your classes", icon: "home-outline", href: "/" },
  { label: "My Classes", description: "Join a class with a code", icon: "key-outline", href: "/classes" },
  { label: "My Plan", description: "Practise on your own", icon: "diamond-outline", href: "/plans" },
  { label: "IQ Test", description: "Take this cycle's test", icon: "bulb-outline", href: "/iq" },
  { label: "Notes", description: "Your own notes", icon: "create-outline", href: "/notes" },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-ink-muted">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm text-ink" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const toast = useToast();
  const { student, signOut } = useSession();
  const [confirm, setConfirm] = useState<"out" | "all" | null>(null);
  const [busy, setBusy] = useState(false);
  if (!student) return null;
  const initials = student.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const signOutAll = async () => {
    setConfirm(null);
    setBusy(true);
    try {
      await api.post("logout-all");
      toast("Signed out on every device");
      await signOut();
    } catch (err) {
      toast(messageOf(err), "error");
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-page">
      <TopBar />
      <ScrollView contentContainerClassName="px-5 pb-6">
        <Text className="mb-4 mt-2 text-[26px] font-bold text-ink">Profile</Text>
        <Card className="mb-4 flex-row items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#0C2A78]">
            <Text className="text-xl font-semibold text-ink">{initials}</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-semibold text-ink">{student.name}</Text>
            <Text className="mb-1.5 text-sm text-ink-muted" numberOfLines={1}>
              {student.email}
            </Text>
            <Tag label="Student" />
          </View>
        </Card>

        <Card className="mb-4">
          <SectionLabel className="mb-2">Account information</SectionLabel>
          <Row label="Full name" value={student.name} />
          <Row label="Email address" value={student.email} />
          <Row label="Role" value="Student" />
        </Card>

        <Card className="mb-4">
          <SectionLabel className="mb-2">Quick actions</SectionLabel>
          {QUICK.map((q) => (
            <Pressable key={q.label} onPress={() => (q.href === "/" ? router.navigate(q.href) : router.push(q.href))} className="flex-row items-center py-2.5 active:opacity-70">
              <Ionicons name={q.icon} size={19} color={colors.muted} />
              <View className="ml-3 flex-1">
                <Text className="text-[15px] text-ink">{q.label}</Text>
                <Text className="text-xs text-ink-muted">{q.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </Card>

        <Card className="mb-4">
          <Text className="text-base font-semibold text-ink">Sign out from all devices</Text>
          <Text className="mb-3 mt-1 text-sm text-ink-muted">End every active session, on this phone and on every other device.</Text>
          <Button title="Sign out everywhere" variant="danger" onPress={() => setConfirm("all")} loading={busy} />
        </Card>
        <Button title="Sign out" variant="ghost" icon="log-out-outline" onPress={() => setConfirm("out")} />
      </ScrollView>

      <ConfirmDialog
        visible={confirm === "out"}
        title="Sign out?"
        message="You can sign in again any time."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => {
          setConfirm(null);
          void signOut();
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === "all"}
        title="Sign out everywhere?"
        message="Every device signed in to this account is signed out, this one too."
        confirmLabel="Yes, sign out"
        cancelLabel="No"
        destructive
        onConfirm={signOutAll}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}
