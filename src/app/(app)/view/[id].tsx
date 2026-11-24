// A delivered item, opened from Home: the viewer for its kind. The feed is read again if the app was reopened
// on this page and the list it came from is gone.

import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyBox, ErrorBox, Loading, Page, PageHeader } from "@/components/ui";
import { McqQuiz } from "@/components/viewers/McqQuiz";
import { MindMapCanvas, MindMapToolbar, useMindMapControls } from "@/components/viewers/MindMapCanvas";
import { SimulationView } from "@/components/viewers/SimulationView";
import { StoryReader } from "@/components/viewers/StoryReader";
import { SuperNotesView } from "@/components/viewers/SuperNotesView";
import { messageOf } from "@/lib/api";
import { classLabel } from "@/lib/format";
import { DELIVERY_LABELS, studentService, type DeliveredContent, type FeedItem } from "@/services/student";

function MindMapPage({ item, c }: { item: FeedItem; c: Extract<DeliveredContent, { type: "mindMap" }> }) {
  const insets = useSafeAreaInsets();
  const controls = useMindMapControls(c.root);
  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}>
      <View className="px-5">
        <PageHeader title={item.title} subtitle={[c.subject, classLabel(c.grade), c.nodeCount ? `${c.nodeCount} ideas` : ""].filter(Boolean).join(" · ")} back />
        <MindMapToolbar c={controls} />
      </View>
      <View className="mt-3 flex-1 border-t border-edge">
        <MindMapCanvas root={c.root} zoom={controls.zoom} folded={controls.folded} onToggle={controls.toggle} />
      </View>
    </View>
  );
}

export default function DeliveredItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cached = studentService.cachedFeedItem(id);
  const feed = useQuery({ queryKey: ["feed"], queryFn: studentService.feed, enabled: !cached });
  const item = cached ?? feed.data?.find((i) => i.id === id) ?? null;

  if (!item) {
    return (
      <Page>
        <PageHeader title="Delivered content" back />
        {feed.isLoading ? (
          <Loading />
        ) : feed.isError ? (
          <ErrorBox title="Couldn't load this" message={messageOf(feed.error)} onRetry={() => void feed.refetch()} />
        ) : (
          <EmptyBox icon="file-tray-outline" message="This item is no longer in your classes." />
        )}
      </Page>
    );
  }

  const c = item.content;
  if (!c) {
    return (
      <Page>
        <PageHeader title={item.title} subtitle={DELIVERY_LABELS[item.type]} back />
        <EmptyBox
          icon="alert-circle-outline"
          message={item.type === "lessonPlan" ? "Lesson plans are no longer sent to students. Ask your teacher for its Super Notes." : "This content was removed or can't be shown."}
        />
      </Page>
    );
  }

  switch (c.type) {
    case "simulation":
      return <SimulationView sim={{ ...c.simulation, title: item.title }} />;
    case "storyline":
      return <StoryReader title={item.title} subtitle={[c.subject, classLabel(c.grade)].filter(Boolean).join(" · ")} acts={c.acts} />;
    case "mindMap":
      return <MindMapPage item={item} c={c} />;
    case "mcq":
    case "superNotes":
      return (
        <ScrollView className="flex-1 bg-page" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
          <PageHeader title={item.title} subtitle={item.subtitle || DELIVERY_LABELS[item.type]} back />
          {item.note ? <Text className="mb-4 text-sm text-ink-muted">“{item.note}”</Text> : null}
          {c.type === "mcq" ? <McqQuiz questions={c.questions} secondsPerQuestion={c.secondsPerQuestion} onDone={() => router.back()} /> : <SuperNotesView notes={c.notes} />}
        </ScrollView>
      );
  }
}
