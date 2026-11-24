// Practice (web: learn/PracticePage): pick chapters, a size and a difficulty, then draw a set from the library
// (free, never repeating a question already had), revise past mistakes, or get the next level of a fresh set for
// one of the month's fresh sets: another student's version when one is ready, else a new one written (it runs on
// after leaving the page). Below: progress and saved sets.

import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChapterPicker } from "@/components/ChapterPicker";
import { ListRow } from "@/components/ListRow";
import { PlanNotice } from "@/components/PlanNotice";
import { Button, Card, colors, InlineError, Loading, PageHeader, Pill, SectionLabel, Select, Tag } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatDate, formatSeconds, percent } from "@/lib/format";
import { cancelRun, isRunning, startRun, useRunOutcome, useRuns } from "@/lib/runs";
import {
  freshTitle,
  left,
  learnService,
  LEVELS_NOTE,
  livePlan,
  topicLabel,
  type Difficulty,
  type PracticeRequest,
} from "@/services/learn";

const COUNTS = [10, 15, 20, 25, 30, 40, 50];
const DIFFICULTIES: [Difficulty, string][] = [
  ["adaptive", "Adaptive"],
  ["mixed", "Mixed"],
  ["easy", "Easy"],
  ["medium", "Medium"],
  ["hard", "Hard"],
];

export default function Practice() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  useRuns();
  const running = isRunning("practice");
  const plans = useQuery({ queryKey: ["learn", "plans"], queryFn: learnService.plans });
  const sets = useQuery({ queryKey: ["learn", "practice"], queryFn: learnService.practiceSets });
  const progress = useQuery({ queryKey: ["learn", "progress"], queryFn: learnService.progress });
  const plan = livePlan(plans.data);
  const picker = useChapterPicker({ grades: plan?.grades, disabled: running });
  const [count, setCount] = useState(20);
  const [difficulty, setDifficulty] = useState<Difficulty>("adaptive");
  const [drawing, setDrawing] = useState(false);
  const [libraryEmpty, setLibraryEmpty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["learn"] });
  };

  useRunOutcome("practice", (o) => {
    if (o.route) router.push(o.route as never);
    else setMessage(o.error);
    refresh();
  });

  const request = (mode: "new" | "revision"): PracticeRequest | null =>
    picker.scope && plan ? { ...picker.scope, questionCount: Math.min(count, plan.questionsPerSet), difficulty, mode } : null;
  const canSubmit = picker.scope !== null && !drawing && !running;
  const nextReq = request("new");
  const next = useQuery({
    queryKey: ["learn", "practice", "next-level", nextReq],
    queryFn: () => learnService.practiceNextLevel(nextReq!),
    enabled: nextReq !== null && !running,
  });

  const fromLibrary = async (revision: boolean) => {
    const req = request(revision ? "revision" : "new");
    if (!req || !canSubmit) return;
    setDrawing(true);
    setLibraryEmpty(false);
    setMessage(null);
    try {
      const r = await learnService.libraryPractice(req);
      if (!r.set) {
        if (revision) setMessage("No mistakes to revise in these chapters yet.");
        else setLibraryEmpty(true);
      } else {
        if (r.shortfall > 0) setMessage(`${r.available} of ${r.requested} questions were in the library.`);
        void qc.invalidateQueries({ queryKey: ["learn", "practice"] });
        router.push({ pathname: "/practice/[id]", params: { id: r.set._id } });
      }
    } catch (err) {
      setMessage(messageOf(err, "Couldn't get a set from the library."));
    } finally {
      setDrawing(false);
    }
  };

  const writeFresh = () => {
    const req = request("new");
    if (!req || !canSubmit) return;
    setMessage(null);
    startRun("practice", async (signal) => {
      const r = await learnService.generatePractice(req, signal);
      if (!r.set) throw new Error("No set came back.");
      return `/practice/${r.set._id}`;
    });
  };

  const remove = useMutation({
    mutationFn: learnService.deletePracticeSet,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["learn", "practice"] }),
    onError: (err) => setMessage(messageOf(err, "Couldn't remove the set.")),
  });

  const counts = COUNTS.filter((c) => !plan || c <= plan.questionsPerSet);
  const freshLeft = left(plans.data, "mcq");

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="px-5"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <PageHeader title="Practice" subtitle="Library sets are free and never repeat questions you have already had." back />
      {plans.isLoading ? (
        <Loading className="py-8" />
      ) : !plan ? (
        <PlanNotice ended={plans.data?.plan != null} />
      ) : (
        <Card className="mb-3">
          {picker.view}
          <Select label="Questions" value={Math.min(count, plan.questionsPerSet)} disabled={running} options={counts.map((c) => ({ value: c, label: String(c) }))} onChange={setCount} />
          <SectionLabel className="mb-1.5">Difficulty</SectionLabel>
          <View className="mb-1 flex-row flex-wrap gap-2">
            {DIFFICULTIES.map(([v, l]) => (
              <Pill key={v} label={l} selected={difficulty === v} disabled={running} onPress={() => setDifficulty(v)} />
            ))}
          </View>
          {difficulty === "adaptive" && (
            <Text className="mt-1 text-xs leading-4 text-ink-muted">
              Adaptive sets follow your accuracy and speed. Until you have answered about 15 questions in a chapter, they are a balanced mix.
            </Text>
          )}
          {libraryEmpty && (
            <Text className="mt-3 text-xs leading-4 text-warning">
              The library has no new questions for these chapters yet. A fresh set is added to the library for everyone.
            </Text>
          )}
          <InlineError text={message} />
          <Button title="From the library" icon="library-outline" loading={drawing} disabled={!canSubmit} onPress={() => fromLibrary(false)} className="mt-4" />
          {running ? (
            <View className="mt-2 flex-row items-center">
              <Button title="Stop writing" variant="ghost" icon="stop" onPress={() => cancelRun("practice")} />
              <Text className="ml-3 text-xs text-ink-muted">Writing your questions…</Text>
            </View>
          ) : (
            <Button
              title={freshTitle(next.data, freshLeft, "Write")}
              variant="ghost"
              icon="sparkles-outline"
              disabled={!canSubmit || freshLeft === 0}
              onPress={writeFresh}
              className="mt-2"
            />
          )}
          <Button title="Revise my mistakes" variant="ghost" icon="refresh" disabled={!canSubmit} onPress={() => fromLibrary(true)} className="mt-2" />
          <Text className="mt-2 text-xs leading-4 text-ink-muted">{LEVELS_NOTE}</Text>
        </Card>
      )}

      {(progress.data ?? []).length > 0 && (
        <View>
          <SectionLabel className="mb-2 mt-3">Your progress</SectionLabel>
          {progress.data!.map((p) => (
            <Card key={`${p.board}-${p.grade}-${p.subject}`} className="mb-2">
              <View className="flex-row items-center">
                <Text className="flex-1 text-[15px] font-semibold text-ink">
                  {p.subject} · {p.grade}
                </Text>
                <Text className="text-xs text-ink-muted">{p.attempted} answered</Text>
              </View>
              <Text className="mt-1 text-[13px] text-ink-muted">
                {percent(p.accuracy)} correct · {formatSeconds(p.averageSeconds)} a question (target {formatSeconds(p.targetSeconds)})
              </Text>
              {p.weakTopics.length > 0 && <Text className="text-[13px] text-ink-muted">Work on: {p.weakTopics.map(topicLabel).join(", ")}</Text>}
              {p.advice.message ? <Text className="mt-1 text-[13px] text-ink">{p.advice.message}</Text> : null}
            </Card>
          ))}
        </View>
      )}

      <SectionLabel className="mb-2 mt-3">Your sets</SectionLabel>
      {(sets.data ?? []).length === 0 ? (
        <Text className="text-[13px] text-ink-muted">Sets you make appear here.</Text>
      ) : (
        sets.data!.map((s) => (
          <ListRow
            key={s._id}
            icon="help-circle-outline"
            title={s.title}
            meta={[s.subject, s.grade, `${s.questionCount}${s.questionCount < s.requestedCount ? ` of ${s.requestedCount}` : ""} questions`, formatDate(s.createdAt)].filter(Boolean).join(" · ")}
            right={s.level ? <Tag label={`Level ${s.level}`} /> : null}
            onOpen={() => router.push({ pathname: "/practice/[id]", params: { id: s._id } })}
            onDelete={() => remove.mutate(s._id)}
          />
        ))
      )}
    </ScrollView>
  );
}
