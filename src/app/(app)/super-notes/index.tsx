// Super Notes for a student's own plan (web: learn/StudentSuperNotesPage): the notes the library already holds
// for a chapter, written with teachers' lesson plans, read free. Nothing is generated here.

import { ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChapterPicker } from "@/components/ChapterPicker";
import { Button, Card, Loading, PageHeader } from "@/components/ui";
import { learnService, livePlan } from "@/services/learn";

export default function SuperNotesLibrary() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const plans = useQuery({ queryKey: ["learn", "plans"], queryFn: learnService.plans });
  const plan = livePlan(plans.data);
  const picker = useChapterPicker({ grades: plan?.grades, single: true });
  const s = picker.scope;
  const entries = useQuery({
    queryKey: ["learn", "super-notes", s?.board, s?.grade, s?.subject, s?.language, s?.chapterNumbers[0]],
    enabled: s !== null,
    queryFn: () => learnService.superNotes({ board: s!.board, grade: s!.grade, subject: s!.subject, chapterNumber: s!.chapterNumbers[0], language: s!.language }),
  });

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <PageHeader title="Super Notes" subtitle="Revision notes for a chapter: definitions, key points, formulas, worked examples and a self-check." back />
      {plans.isLoading ? (
        <Loading className="py-8" />
      ) : !plan ? (
        <Card>
          <Text className="text-base font-semibold text-ink">Super Notes come with a plan</Text>
          <Button title="See plans" onPress={() => router.push("/plans")} className="mt-3 self-start" />
        </Card>
      ) : (
        <>
          <Card className="mb-3">{picker.view}</Card>
          {entries.isFetching && <Loading className="py-6" />}
          {s && !entries.isFetching && (entries.data ?? []).length === 0 && (
            <Text className="text-[13px] leading-5 text-ink-muted">No Super Notes for this chapter yet. They appear as soon as a teacher plans a lesson on it.</Text>
          )}
          {(entries.data ?? []).map((e) => (
            <Card key={e._id} className="mb-2" onPress={() => router.push({ pathname: "/super-notes/[id]", params: { id: e._id } })}>
              <Text className="text-[15px] font-semibold text-ink">{e.title || e.topics.join(", ")}</Text>
              <Text className="mt-0.5 text-xs text-ink-muted">{e.topics.join(" · ")}</Text>
              {e.summary ? (
                <Text className="mt-1.5 text-[13px] leading-5 text-ink-muted" numberOfLines={3}>
                  {e.summary}
                </Text>
              ) : null}
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}
