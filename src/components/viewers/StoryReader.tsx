// A delivered StoryLine, one act at a time (the Android app's StoryLineReaderScreen): the act's illustration when
// it has one, its synopsis and script, the concept it teaches, and Previous / Next.

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, EmptyBox, PageHeader, SectionLabel } from "@/components/ui";
import type { StoryAct } from "@/lib/types";

export function StoryReader({ title, subtitle, acts }: { title: string; subtitle: string; acts: StoryAct[] }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const act = acts[index];

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <PageHeader title={title || "StoryLine"} subtitle={subtitle} back />
      {!act ? (
        <EmptyBox icon="book-outline" message="This StoryLine has no acts." />
      ) : (
        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-label">
            Act {index + 1} of {acts.length}
          </Text>
          <View className="mb-4 h-1 rounded-full bg-tag">
            <View className="h-1 rounded-full bg-primary" style={{ width: `${((index + 1) / acts.length) * 100}%` }} />
          </View>
          {act.imageUrl && (
            <Image
              source={{ uri: act.imageUrl }}
              accessibilityLabel={`Illustration for ${act.title}`}
              contentFit="cover"
              style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 16, marginBottom: 16 }}
            />
          )}
          <Text className="text-xl font-bold text-ink">{act.title}</Text>
          {act.synopsis ? <Text className="mt-2 text-sm italic leading-5 text-ink-muted">{act.synopsis}</Text> : null}
          {act.script ? <Text className="mt-4 text-[15px] leading-6 text-ink">{act.script}</Text> : null}
          {act.microExplanation ? (
            <Card className="mt-4">
              <SectionLabel className="mb-1">The science</SectionLabel>
              <Text className="text-sm leading-5 text-ink">{act.microExplanation}</Text>
            </Card>
          ) : null}
          {act.conceptFocus ? (
            <Card className="mt-3">
              <SectionLabel className="mb-1">Concept focus</SectionLabel>
              <Text className="text-sm leading-5 text-ink">{act.conceptFocus}</Text>
            </Card>
          ) : null}
          <View className="mt-6 flex-row gap-3">
            <Button title="Previous Act" variant="ghost" disabled={index === 0} onPress={() => setIndex(index - 1)} className="flex-1" />
            {index + 1 < acts.length ? (
              <Button title="Next Act" onPress={() => setIndex(index + 1)} className="flex-1" />
            ) : (
              <Button title="Complete StoryLine" icon="checkmark" onPress={() => router.back()} className="flex-1" />
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
