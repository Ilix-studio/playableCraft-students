// Mock papers (web: learn/MocksPage; Android: MocksRoute): the exams the student's plan opens, each started as a
// timed paper in the exam's pattern and marking (one of the month's mocks), and the papers already sat.

import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChapterPicker } from "@/components/ChapterPicker";
import { ListRow } from "@/components/ListRow";
import { Button, Card, colors, InlineError, Loading, PageHeader, Pill, SectionLabel } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { learnService, left, livePlan, type ExamOption } from "@/services/learn";

const KIND_LABEL: Record<string, string> = { past: "Past papers", model: "Model paper", board: "Board paper" };
const MODEL_NOTE = "AI-generated practice paper — not an official examination paper or guaranteed prediction.";
const isBoard = (e: ExamOption) => e.id === "BOARD_MCQ";

export default function Mocks() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["learn", "plans"], queryFn: learnService.plans });
  const plan = livePlan(plans.data);
  const exams = useQuery({ queryKey: ["learn", "exams"], queryFn: learnService.exams, enabled: plan !== null });
  const mocks = useQuery({ queryKey: ["learn", "mocks"], queryFn: learnService.mocks });
  const boardPicker = useChapterPicker({ grades: plan?.grades, bookOnly: true });
  const [kinds, setKinds] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mocksLeft = left(plans.data, "mock");
  const kindOf = (e: ExamOption) => kinds[e.id] ?? e.kinds[0] ?? "past";

  const start = async (exam: ExamOption) => {
    if (starting) return;
    const book = isBoard(exam) ? boardPicker.scope : null;
    if (isBoard(exam) && !book) return;
    setStarting(exam.id);
    setMessage(null);
    try {
      const paper = await learnService.startMock({ pattern: exam.id, kind: kindOf(exam), board: book?.board, grade: book?.grade, subject: book?.subject });
      void qc.invalidateQueries({ queryKey: ["learn"] });
      router.push({ pathname: "/mocks/[id]", params: { id: paper._id } });
    } catch (err) {
      setMessage(messageOf(err, "Couldn't start the paper."));
    } finally {
      setStarting(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="px-5"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void qc.invalidateQueries({ queryKey: ["learn"] })} tintColor={colors.primary} />}
    >
      <PageHeader title="Mock Papers" subtitle="Timed papers in the exam's pattern and marking. Answers open when you submit." back />
      {plans.isLoading ? (
        <Loading className="py-8" />
      ) : !plan ? (
        <Card className="mb-3">
          <Text className="text-base font-semibold text-ink">Mock papers come with a plan</Text>
          <Text className="mt-1 text-[13px] text-ink-muted">Board and entrance-pattern papers, timed and marked as the exam is.</Text>
          <Button title="See plans" onPress={() => router.push("/plans")} className="mt-3 self-start" />
        </Card>
      ) : (
        <View>
          <Text className="mb-2 text-xs text-ink-muted">{mocksLeft} papers left this month.</Text>
          <InlineError text={message} />
          {exams.isLoading && <Loading className="py-6" />}
          {(exams.data ?? []).map((exam) => {
            const kind = kindOf(exam);
            return (
              <Card key={exam.id} className="mb-3 mt-1">
                <Text className="text-base font-semibold text-ink">{exam.label}</Text>
                <Text className="text-xs text-ink-muted">
                  {exam.durationMinutes} min · {exam.sections.reduce((n, s) => n + s.questions, 0)} questions
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-ink-muted">{exam.note}</Text>
                {!isBoard(exam) && <Text className="text-xs text-ink-muted">Covers {exam.grades.join(" and ")} chapters.</Text>}
                {exam.kinds.length > 1 && (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {exam.kinds.map((k) => (
                      <Pill key={k} label={KIND_LABEL[k] ?? k} selected={kind === k} onPress={() => setKinds((m) => ({ ...m, [exam.id]: k }))} />
                    ))}
                  </View>
                )}
                {kind === "model" && <Text className="mt-1.5 text-xs text-warning">{MODEL_NOTE}</Text>}
                {isBoard(exam) && <View className="mt-3">{boardPicker.view}</View>}
                <Button
                  title="Start paper"
                  icon="play-circle-outline"
                  loading={starting === exam.id}
                  disabled={starting !== null || mocksLeft === 0 || (isBoard(exam) && !boardPicker.scope)}
                  onPress={() => start(exam)}
                  className="mt-3"
                />
              </Card>
            );
          })}
        </View>
      )}
      <SectionLabel className="mb-2 mt-3">Your papers</SectionLabel>
      {(mocks.data ?? []).length === 0 ? (
        <Text className="text-[13px] text-ink-muted">Papers you sit appear here.</Text>
      ) : (
        mocks.data!.map((m) => (
          <ListRow
            key={m._id}
            icon="document-text-outline"
            title={m.title}
            meta={[m.label, `${m.questionCount} questions`, formatDate(m.createdAt)].filter(Boolean).join(" · ")}
            right={<Text className="ml-2 text-[13px] text-ink">{m.submittedAt ? `${m.score} / ${m.maxScore}` : "In progress"}</Text>}
            onOpen={() => router.push({ pathname: "/mocks/[id]", params: { id: m._id } })}
          />
        ))
      )}
    </ScrollView>
  );
}
