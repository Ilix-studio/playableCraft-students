// Manage: the student's access at a glance (classes unlocked, items delivered, fees due) and a card for each of
// their pages (the Android app's Manage hub for a Student).

import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LEARN_ITEMS, TopBar } from "@/components/Shell";
import { colors } from "@/components/ui";
import { needsPayment, isActive, studentService } from "@/services/student";

function Stat({ value, label, tone, onPress }: { value: number; label: string; tone: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-1 rounded-xl border border-edge bg-card p-3.5 active:opacity-80">
      <Text className="text-[22px] font-bold text-ink">{value}</Text>
      <Text className="text-xs" style={{ color: tone }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Manage() {
  const router = useRouter();
  const classes = useQuery({ queryKey: ["enrollments"], queryFn: studentService.enrollments });
  const feed = useQuery({ queryKey: ["feed"], queryFn: studentService.feed });
  const enrolled = classes.data ?? [];
  const due = enrolled.filter(needsPayment).length;

  return (
    <View className="flex-1 bg-page">
      <TopBar />
      <ScrollView contentContainerClassName="px-5 pb-6">
        <Text className="mb-4 mt-2 text-[26px] font-bold text-ink">Manage</Text>
        {enrolled.length > 0 && (
          <View className="mb-4 flex-row gap-2.5">
            <Stat value={enrolled.filter(isActive).length} label="Unlocked" tone={colors.success} />
            <Stat value={feed.data?.length ?? 0} label="Delivered" tone={colors.muted} />
            <Stat value={due} label={due > 0 ? "Payment due" : "All paid"} tone={due > 0 ? colors.warning : colors.muted} onPress={() => router.push("/classes")} />
          </View>
        )}
        {LEARN_ITEMS.filter((i) => i.href !== "/").map((item) => (
          <Pressable key={item.label} onPress={() => router.push(item.href)} className="mb-3 flex-row items-center rounded-2xl border border-edge bg-card p-4 active:opacity-80">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-tag">
              <Ionicons name={item.icon} size={21} color={colors.ink} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-ink">{item.label}</Text>
              {item.description ? <Text className="text-sm text-ink-muted">{item.description}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
