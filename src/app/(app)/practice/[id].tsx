// One practice set (web: learn/PracticeSetPage; Android: PracticeSetRoute). Every question is timed from when it
// is shown until it is answered, because solving speed matters as much as accuracy in board and entrance exams;
// the finished run is graded by the server, which keeps the record adaptive sets read. A library set that came
// up short can have its missing questions written fresh.

import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, colors, ErrorBox, InlineError, Loading, PageHeader, SectionLabel } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatSeconds, percent } from "@/lib/format";
import { cancelRun, isRunning, startRun, useRunOutcome, useRuns } from "@/lib/runs";
import { learnService, missingOf, topicLabel, type AttemptResult, type PracticeQuestion } from "@/services/learn";

function ResultView({ result, onRestart }: { result: AttemptResult; onRestart: () => void }) {
  const r = result.report;
  const slow = r.averageSeconds > r.targetSeconds;
  return (
    <View>
      <Card className="mb-3">
        <SectionLabel>Result</SectionLabel>
        <Text className="text-[32px] font-bold text-ink">
          {r.correct} / {r.total}
        </Text>
        <Text className="text-[13px] text-ink-muted">
          {percent(r.accuracy)} correct · {formatSeconds(r.averageSeconds)} a question (target {formatSeconds(r.targetSeconds)})
        </Text>
        <Text className={`mt-1 text-[13px] ${slow ? "text-warning" : "text-success"}`}>{slow ? "Slower than exam pace" : "Within exam pace"}</Text>
      </Card>
      <Card className="mb-3">
        <SectionLabel className="mb-1">What next</SectionLabel>
        <Text className="text-sm leading-5 text-ink">{r.advice.message}</Text>
        {result.overall.weakTopics.length > 0 && (
          <Text className="mt-1.5 text-[13px] text-ink-muted">Topics to work on: {result.overall.weakTopics.map(topicLabel).join(", ")}</Text>
        )}
      </Card>
      {r.byTopic.length > 1 && (
        <Card className="mb-3">
          {r.byTopic.map((t, i) => (
            <View key={i} className="flex-row py-0.5">
              <Text className="flex-1 text-[13px] text-ink-muted">{topicLabel(t)}</Text>
              <Text className="text-[13px] text-ink">
                {percent(t.accuracy)} · {formatSeconds(t.averageSeconds)}
              </Text>
            </View>
          ))}
        </Card>
      )}
      <Button title="Try again" icon="reload" onPress={onRestart} />
    </View>
  );
}

function Player({ setId, questions }: { setId: string; questions: PracticeQuestion[] }) {
  const qc = useQueryClient();
  const total = questions.length;
  const [run, setRun] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [seconds, setSeconds] = useState<number[]>(() => questions.map(() => 0));
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const answered = answers[index] !== null;

  useEffect(() => {
    if (finished || answered) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - shownAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [finished, answered, shownAt, run]);

  const restart = () => {
    setRun((r) => r + 1);
    setIndex(0);
    setAnswers(questions.map(() => null));
    setSeconds(questions.map(() => 0));
    setShownAt(Date.now());
    setElapsed(0);
    setFinished(false);
    setResult(null);
    setSaveError(null);
  };

  const finish = async () => {
    setFinished(true);
    setSubmitting(true);
    try {
      setResult(await learnService.submitAttempt(setId, answers.map((a, i) => ({ chosenIndex: a, seconds: seconds[i] }))));
      void qc.invalidateQueries({ queryKey: ["learn", "progress"] });
    } catch {
      setSaveError("Your result could not be saved to your progress.");
    } finally {
      setSubmitting(false);
    }
  };

  if (finished) {
    if (submitting) return <Loading />;
    if (result) return <ResultView result={result} onRestart={restart} />;
    // Grading failed: the local score still shows.
    const score = questions.filter((q, i) => answers[i] === q.correctIndex).length;
    return (
      <Card>
        <Text className="text-[32px] font-bold text-ink">
          {score} / {total}
        </Text>
        <Text className="text-[13px] text-ink-muted">{formatSeconds(seconds.reduce((a, b) => a + b, 0))} in all</Text>
        <InlineError text={saveError} />
        <Button title="Try again" icon="reload" onPress={restart} className="mt-3 self-start" />
      </Card>
    );
  }

  const q = questions[index];
  return (
    <View>
      <View className="mb-2 flex-row items-center">
        <SectionLabel className="flex-1">
          Question {index + 1} / {total}
        </SectionLabel>
        <Ionicons name="timer-outline" size={15} color={colors.muted} />
        <Text className="ml-1 text-[13px] text-ink-muted">{formatSeconds(elapsed)}</Text>
      </View>
      <View className="mb-3 h-1 rounded-full bg-tag">
        <View className="h-1 rounded-full bg-primary" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </View>
      <Text className="mb-3 text-base leading-[22px] text-ink">{q.question}</Text>
      {q.options.map((opt, oi) => {
        const chosen = answers[index] === oi;
        const correct = oi === q.correctIndex;
        const look = !answered ? "border-edge bg-card" : correct ? "border-success bg-success/10" : chosen ? "border-danger bg-danger/10" : "border-edge bg-card";
        const tint = !answered ? "text-ink" : correct ? "text-success" : chosen ? "text-danger" : "text-ink-muted";
        return (
          <Pressable
            key={oi}
            disabled={answered}
            onPress={() => {
              const took = Math.max(1, Math.round((Date.now() - shownAt) / 1000));
              setAnswers((a) => a.map((x, j) => (j === index ? oi : x)));
              setSeconds((s) => s.map((x, j) => (j === index ? took : x)));
              setElapsed(took);
            }}
            className={`mb-2 flex-row items-center rounded-xl border px-3.5 py-3 ${look}`}
          >
            {answered && correct && <Ionicons name="checkmark" size={16} color={colors.success} style={{ marginRight: 8 }} />}
            {answered && chosen && !correct && <Ionicons name="close" size={16} color={colors.danger} style={{ marginRight: 8 }} />}
            <Text className={`flex-1 text-sm ${tint}`}>{opt}</Text>
          </Pressable>
        );
      })}
      {answered && q.explanation ? <Text className="mt-1 text-[13px] leading-[18px] text-ink-muted">Why: {q.explanation}</Text> : null}
      <Button
        title={index + 1 >= total ? "Finish" : "Next"}
        disabled={!answered}
        onPress={() => {
          if (index + 1 >= total) void finish();
          else {
            setIndex(index + 1);
            setShownAt(Date.now());
            setElapsed(0);
          }
        }}
        className="mt-3"
      />
    </View>
  );
}

export default function PracticeSetPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  useRuns();
  const running = isRunning("practice");
  const set = useQuery({ queryKey: ["learn", "practice", id], queryFn: () => learnService.practiceSet(id) });
  const [runError, setRunError] = useState<string | null>(null);
  const s = set.data;

  useRunOutcome("practice", (o) => {
    if (!o.route) setRunError(o.error);
    void set.refetch();
  });

  const writeMissing = () => {
    setRunError(null);
    startRun("practice", async (signal) => {
      const r = await learnService.topUpPractice(id, signal);
      return `/practice/${r.set?._id ?? id}`;
    });
  };

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <PageHeader title={s?.title ?? "Practice set"} subtitle={s ? [s.subject, s.grade, s.chapterNames.join(", ")].filter(Boolean).join(" · ") : null} back />
      {set.isLoading ? (
        <Loading />
      ) : !s ? (
        <ErrorBox title="Couldn't load the set" message={messageOf(set.error)} onRetry={() => void set.refetch()} />
      ) : (
        <View>
          {missingOf(s) > 0 && (
            <Card className="mb-4">
              <Text className="text-[13px] leading-5 text-ink-muted">
                The library had {s.questions.length} of the {s.requestedCount} questions you asked for. Practise these now, or have the other {missingOf(s)} written fresh
                (uses one fresh set).
              </Text>
              {running ? (
                <Button title="Stop writing" variant="ghost" icon="stop" onPress={() => cancelRun("practice")} className="mt-3 self-start" />
              ) : (
                <Button title={`Write ${missingOf(s)} more`} variant="ghost" icon="sparkles-outline" onPress={writeMissing} className="mt-3 self-start" />
              )}
              <InlineError text={runError} />
            </Card>
          )}
          {s.questions.length > 0 ? <Player key={`${s._id}-${s.questions.length}`} setId={s._id} questions={s.questions} /> : <Text className="text-sm text-ink-muted">This set has no questions yet.</Text>}
        </View>
      )}
    </ScrollView>
  );
}
