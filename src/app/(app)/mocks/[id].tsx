// A mock paper (web: learn/MockExamPage; Android: MockExamRoute). Before submission: the exam-hall runner — a
// clock that submits by itself at zero, the section's marking, Clear, Mark for review, and a palette of every
// question (green answered, amber marked, red seen but not answered). Time on each question is banked as the
// student moves. After submission: the score, each section, and every question with its answer.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, colors, ConfirmDialog, ErrorBox, InlineError, Loading, Page, PageHeader, SectionLabel } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatClock } from "@/lib/format";
import { learnService, type MockPaper, type MockResponse } from "@/services/learn";

/** Where each section's questions start in the paper's one list of responses. */
function sectionStarts(paper: MockPaper): number[] {
  return paper.sections.map((_, i) => paper.sections.slice(0, i).reduce((n, s) => n + s.questions.length, 0));
}

function Runner({ paper, onSubmitted }: { paper: MockPaper; onSubmitted: (p: MockPaper) => void }) {
  const flat = paper.sections.flatMap((s, si) => s.questions.map((q, qi) => ({ si, qi, q })));
  const [responses, setResponses] = useState<MockResponse[]>(() => flat.map(() => ({ chosenIndex: null, seconds: 0, markedForReview: false })));
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [index, setIndex] = useState(0);
  const [endsAt] = useState(() => new Date(paper.endsAt).getTime() || Date.now());
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(0);
  const latest = useRef(responses);
  const submittingRef = useRef(false);

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);
  useEffect(() => {
    latest.current = responses;
  }, [responses]);

  /** Adds the time on the current question to its response. */
  const banked = useCallback((rs: MockResponse[], at: number): MockResponse[] => {
    const now = Date.now();
    const add = Math.floor((now - shownAt.current) / 1000);
    shownAt.current = now;
    return add > 0 ? rs.map((r, i) => (i === at ? { ...r, seconds: r.seconds + add } : r)) : rs;
  }, []);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    const final = banked(latest.current, index);
    setResponses(final);
    try {
      onSubmitted(await learnService.submitMock(paper._id, final));
    } catch (err) {
      setError(messageOf(err, "Couldn't submit. Your answers are kept; try again."));
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [banked, index, onSubmitted, paper._id]);

  // The clock; at zero the paper submits itself.
  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) void submit();
    }, 1000);
    return () => clearInterval(t);
  }, [endsAt, submit]);

  if (flat.length === 0) return <Text className="text-sm text-ink-muted">This paper has no questions.</Text>;

  const goTo = (i: number) => {
    if (i < 0 || i >= flat.length) return;
    setResponses((rs) => banked(rs, index));
    setIndex(i);
    setVisited((v) => new Set(v).add(i));
  };
  const update = (patch: Partial<MockResponse>) => setResponses((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const { si, qi, q } = flat[index];
  const section = paper.sections[si];
  const response = responses[index];
  const answered = responses.filter((r) => r.chosenIndex !== null).length;
  const low = remaining <= 300;
  const starts = sectionStarts(paper);

  return (
    <View>
      <View className="flex-row items-center">
        <SectionLabel className="flex-1">
          {section.subject} · Q{qi + 1}
        </SectionLabel>
        <Ionicons name="timer-outline" size={16} color={low ? colors.danger : colors.muted} />
        <Text className={`ml-1 text-[15px] ${low ? "text-danger" : "text-ink"}`}>{formatClock(remaining)}</Text>
      </View>
      <Text className="mb-3 text-xs text-ink-muted">
        +{section.marksCorrect}
        {section.marksWrong > 0 ? ` / −${section.marksWrong}` : ""}
      </Text>
      <Text className="mb-3 text-base leading-[22px] text-ink">{q.question}</Text>
      {q.options.map((opt, oi) => {
        const chosen = response.chosenIndex === oi;
        return (
          <Pressable
            key={oi}
            onPress={() => update({ chosenIndex: oi })}
            className={`mb-2 flex-row items-center rounded-xl border px-3.5 py-3 ${chosen ? "border-primary bg-primary/15" : "border-edge bg-card"}`}
          >
            <Text className="mr-2.5 text-[13px] text-ink-muted">{String.fromCharCode(65 + oi)}</Text>
            <Text className="flex-1 text-sm text-ink">{opt}</Text>
          </Pressable>
        );
      })}
      <View className="mt-1 flex-row flex-wrap gap-2">
        <Button title="Previous" variant="ghost" disabled={index === 0} onPress={() => goTo(index - 1)} className="h-10" />
        <Button title="Clear" variant="ghost" disabled={response.chosenIndex === null} onPress={() => update({ chosenIndex: null })} className="h-10" />
        <Button
          title={response.markedForReview ? "Unmark & next" : "Mark & next"}
          variant="ghost"
          icon="bookmark-outline"
          onPress={() => {
            update({ markedForReview: !response.markedForReview });
            goTo(index + 1);
          }}
          className="h-10"
        />
        <Button title="Save & next" disabled={index + 1 >= flat.length} onPress={() => goTo(index + 1)} className="h-10" />
      </View>

      <Card className="mt-4">
        <SectionLabel className="mb-2">Questions</SectionLabel>
        {paper.sections.map((s, sIndex) => {
          const start = starts[sIndex];
          if (s.questions.length === 0) return null;
          return (
            <View key={`${s.subject}-${start}`} className="mb-2">
              <Text className="mb-1 text-xs text-ink-muted">{s.subject}</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {s.questions.map((_, k) => {
                  const i = start + k;
                  const r = responses[i];
                  const look = r.markedForReview
                    ? "bg-warning/20 text-warning"
                    : r.chosenIndex !== null
                      ? "bg-success/20 text-success"
                      : visited.has(i)
                        ? "bg-danger/15 text-danger"
                        : "bg-tag text-ink-muted";
                  return (
                    <Pressable key={i} onPress={() => goTo(i)} className={`h-[34px] w-[34px] items-center justify-center rounded-lg ${i === index ? "border-2 border-primary" : ""}`}>
                      <Text className={`h-full w-full overflow-hidden rounded-lg text-center text-xs leading-[34px] ${look}`}>{k + 1}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
        <Text className="text-[11px] text-ink-muted">Green answered · amber marked · red seen, not answered</Text>
        <Text className="mt-2 text-[13px] text-ink">
          {answered} of {flat.length} answered
        </Text>
        <InlineError text={error} />
        <Button title="Submit paper" loading={submitting} onPress={() => setConfirming(true)} className="mt-3" />
      </Card>
      <ConfirmDialog
        visible={confirming}
        title="Submit the paper?"
        message={`${flat.length - answered} unanswered. You cannot change answers after this.`}
        confirmLabel="Submit"
        cancelLabel="Keep going"
        onConfirm={() => {
          setConfirming(false);
          void submit();
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

function Report({ paper }: { paper: MockPaper }) {
  const r = paper.result;
  if (!r) return null;
  const starts = sectionStarts(paper);
  const rows = paper.sections.flatMap((s, sIndex) => s.questions.map((q, qi) => ({ subject: s.subject, qi, q, resp: paper.responses[starts[sIndex] + qi] })));
  return (
    <View>
      <Card className="mb-3">
        <SectionLabel>Result</SectionLabel>
        <Text className="text-[30px] font-bold text-ink">
          {r.score} / {r.maxScore}
        </Text>
        <Text className="text-[13px] text-ink-muted">
          {r.correct} right · {r.wrong} wrong · {r.skipped} left · {formatClock(r.secondsUsed)} of {formatClock(paper.durationSeconds)}
        </Text>
        {r.late && <Text className="mt-1 text-[13px] text-warning">Submitted after the time ran out.</Text>}
        {r.sections.length > 1 && (
          <View className="mt-2">
            {r.sections.map((s) => (
              <View key={s.subject} className="flex-row py-0.5">
                <Text className="flex-1 text-[13px] text-ink-muted">{s.subject}</Text>
                <Text className="text-[13px] text-ink">
                  {s.score} / {s.maxScore}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
      {rows.map(({ subject, qi, q, resp }, k) => (
        <Card key={k} className="mb-2">
          <Text className="text-xs text-ink-muted">
            {[`${subject} · Q${qi + 1}`, q.origin === "official" && q.year ? `past paper ${q.year}` : null, q.chapterTitle].filter(Boolean).join(" · ")}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-ink">{q.question}</Text>
          <View className="mt-1.5">
            {q.options.map((opt, oi) => {
              const correct = oi === q.correctIndex;
              const mine = oi === resp?.chosenIndex;
              return (
                <View key={oi} className="flex-row items-center py-0.5">
                  <View className="w-5">
                    {correct ? <Ionicons name="checkmark" size={16} color={colors.success} /> : mine ? <Ionicons name="close" size={16} color={colors.danger} /> : null}
                  </View>
                  <Text className={`ml-1 flex-1 text-[13px] ${correct ? "text-success" : mine ? "text-danger" : "text-ink-muted"}`}>{opt}</Text>
                </View>
              );
            })}
          </View>
          {resp?.chosenIndex == null && <Text className="text-xs text-ink-muted">Not answered.</Text>}
          {q.explanation ? <Text className="mt-1 text-[13px] leading-[18px] text-ink-muted">{q.explanation}</Text> : null}
        </Card>
      ))}
    </View>
  );
}

export default function MockExam() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["learn", "mocks", id], queryFn: () => learnService.mock(id), staleTime: Infinity });
  const paper = query.data;
  const onSubmitted = useCallback(
    (p: MockPaper) => {
      qc.setQueryData(["learn", "mocks", id], p);
      void qc.invalidateQueries({ queryKey: ["learn", "mocks"], exact: true });
    },
    [qc, id],
  );

  if (!paper) {
    return (
      <Page>
        <PageHeader title="Mock paper" back />
        {query.isLoading ? <Loading /> : <ErrorBox title="Couldn't load the paper" message={messageOf(query.error)} onRetry={() => void query.refetch()} />}
      </Page>
    );
  }
  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <PageHeader title={paper.title || "Mock paper"} subtitle={paper.label ?? paper.note} back />
      {paper.submittedAt ? <Report paper={paper} /> : <Runner paper={paper} onSubmitted={onSubmitted} />}
    </ScrollView>
  );
}
