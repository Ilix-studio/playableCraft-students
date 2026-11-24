// Home: everything delivered to the student's classes, by kind, newest first (the Android app's StudentHomeScreen).
// A student with no class yet is shown how to join one. Pull down or tap Refresh to load new deliveries.

import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/Shell";
import { Button, Card, colors, EmptyBox, ErrorBox, Loading, Pill, type IconName } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { DELIVERY_LABELS, FEED_TYPES, isActive, studentService, type DeliveryType, type FeedItem } from "@/services/student";

const ICON: Record<DeliveryType, IconName> = {
  simulation: "sparkles-outline",
  mcq: "checkmark-done-outline",
  storyline: "book-outline",
  mindMap: "git-network-outline",
  superNotes: "reader-outline",
  lessonPlan: "clipboard-outline",
};

function FeedCard({ item, onPress }: { item: FeedItem; onPress: () => void }) {
  return (
    <Card onPress={onPress} className="mb-3">
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-tag">
          <Ionicons name={ICON[item.type]} size={20} color={colors.accent} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-semibold text-ink" numberOfLines={2}>
            {item.title}
          </Text>
          <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
            {[item.subtitle, formatDate(item.releaseAt)].filter(Boolean).join("  ·  ")}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
      {item.note ? <Text className="mt-3 text-sm text-ink-muted">“{item.note}”</Text> : null}
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const { student } = useSession();
  const firstName = student?.name.trim().split(/\s+/)[0] || "there";
  const feed = useQuery({ queryKey: ["feed"], queryFn: studentService.feed });
  const classes = useQuery({ queryKey: ["enrollments"], queryFn: studentService.enrollments });
  const [picked, setPicked] = useState<DeliveryType | null>(null);

  const items = useMemo(() => feed.data ?? [], [feed.data]);
  // Open on the first kind that has something in it.
  const tab = picked ?? FEED_TYPES.find((t) => items.some((i) => i.type === t)) ?? "simulation";
  const visible = useMemo(() => items.filter((i) => i.type === tab), [items, tab]);
  const refreshing = feed.isFetching || classes.isFetching;
  const refresh = () => {
    void feed.refetch();
    void classes.refetch();
  };

  const header = (
    <View>
      <View className="mb-4 mt-2 flex-row items-start">
        <View className="flex-1">
          <Text className="text-[26px] font-bold tracking-tight text-ink">Hello, {firstName}</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-muted">
            Your learning space — simulations, quizzes, stories and mind maps from your school or tutor.
          </Text>
        </View>
        <Button title="Refresh" variant="ghost" icon="refresh" onPress={refresh} disabled={refreshing} className="ml-3 h-9" />
      </View>
      {classes.data && classes.data.length === 0 && (
        <Card className="mb-4">
          <View className="flex-row items-center">
            <Ionicons name="key-outline" size={22} color={colors.muted} />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-ink">Join your first class</Text>
              <Text className="text-sm text-ink-muted">Enter the batch code from your school or tutor to unlock their content.</Text>
            </View>
          </View>
          <Button title="Join a class" icon="add" onPress={() => router.push("/classes")} className="mt-3" />
        </Card>
      )}
      <View className="mb-4 flex-row flex-wrap gap-2">
        {FEED_TYPES.map((t) => (
          <Pill key={t} label={DELIVERY_LABELS[t]} selected={tab === t} note={String(items.filter((i) => i.type === t).length)} onPress={() => setPicked(t)} />
        ))}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-page">
      <TopBar />
      {feed.isLoading ? (
        <Loading />
      ) : feed.isError ? (
        <View className="px-5">
          <ErrorBox title="Unable to load your classes" message={messageOf(feed.error)} onRetry={refresh} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          contentContainerClassName="px-5 pb-6"
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing && !feed.isLoading} onRefresh={refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => <FeedCard item={item} onPress={() => router.push({ pathname: "/view/[id]", params: { id: item.id } })} />}
          ListEmptyComponent={
            <EmptyBox
              icon="file-tray-outline"
              message={
                (classes.data ?? []).some(isActive)
                  ? `Nothing delivered in ${DELIVERY_LABELS[tab]} yet.`
                  : "Content appears here once you join a class and its access is active."
              }
            />
          }
        />
      )}
    </View>
  );
}

