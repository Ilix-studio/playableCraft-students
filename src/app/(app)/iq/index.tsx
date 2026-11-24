// The IQ test (web: IqTestPage + IqTestRunner; Android: IqTestScreen): the start page for this cycle, the test
// itself, and the scored result. Progress is checkpointed every 20 seconds, after 5 events, and when the app goes
// to the background, so a dropped connection or a closed app never costs the attempt.

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, colors, ConfirmDialog, ErrorBox, Field, Loading, PageHeader, SectionLabel, Sheet } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatMs, formatScore, iqService, IqSession, type IqCycleInfo, type IqQuestion, type IqResult } from "@/services/iq";

const FLUSH_EVENT_THRESHOLD = 5;
const FLUSH_INTERVAL_MS = 20_000;
const POLL_MS = 5_000;
const preparing = (info: IqCycleInfo | null) => ["PENDING", "GENERATING"].includes(info?.cycle?.status ?? "");
const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(1)}%`;
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

type Phase = "loading" | "error" | "gate" | "running" | "result";

function Gate({ info, starting, notice, onStart }: { info: IqCycleInfo; starting: boolean; notice: string | null; onStart: () => void }) {
  const router = useRouter();
  const cycle = info.cycle;
  const attempt = info.attempt.status;
  if (!cycle) {
    return (
      <Card>
        <Text className="text-sm text-ink-muted">{info.message ?? "No IQ cycle is running yet."}</Text>
      </Card>
    );
  }
  if (attempt === "SUBMITTED" || attempt === "VOIDED") {
    return (
      <Card>
        <Ionicons name="checkmark-circle" size={26} color={colors.success} />
        <Text className="mt-2 text-[15px] font-semibold text-ink">You’ve already taken this cycle’s test.</Text>
        <Text className="mt-1 text-sm text-ink-muted">
          The next set of {cycle.questionCount} questions opens in {cycle.daysRemaining} day{cycle.daysRemaining === 1 ? "" : "s"}.
        </Text>
        <Button title="View your ranking" icon="trophy-outline" onPress={() => router.push("/iq/leaderboard")} className="mt-4" />
      </Card>
    );
  }
  if (cycle.status === "FAILED") {
    return (
      <Card>
        <Text className="text-sm text-ink-muted">This cycle’s test could not be prepared. Our team has been notified.</Text>
      </Card>
    );
  }
  if (preparing(info)) {
    return (
      <Card className="items-center py-8">
        <Loading className="py-2" />
        <Text className="mt-2 text-[15px] font-semibold text-ink">Preparing this cycle’s questions…</Text>
        <Text className="mt-1 text-center text-sm text-ink-muted">This takes a minute the first time. The page updates itself.</Text>
      </Card>
    );
  }
  return (
    <Card>
      <Text className="text-base font-semibold text-ink">{cycle.questionCount} questions · one attempt</Text>
      <View className="mt-3">
        {[
          "You can move back and forth and change answers freely.",
          "Your ranking uses accuracy first, then how you worked — pace, revisions, and how much you jumped around.",
          "Answering unrealistically fast does not help your score.",
          "One attempt per cycle. Progress saves automatically, so a dropped connection will not cost you the test.",
        ].map((t) => (
          <Text key={t} className="mb-1.5 text-[13.5px] leading-5 text-ink-muted">
            •  {t}
          </Text>
        ))}
      </View>
      {!info.grade && (
        <Text className="mt-2 text-[13px] leading-5 text-warning">
          You’re not in a class yet, so you’ll rank on the Unassigned board. Join your class to compete with your classmates.
        </Text>
      )}
      {notice ? <Text className="mt-2 text-[13px] text-warning">{notice}</Text> : null}
      <Button title={attempt === "IN_PROGRESS" ? "Resume test" : "Start test"} icon="play" loading={starting} onPress={onStart} className="mt-4" />
    </Card>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-sm text-ink-muted">{label}</Text>
      <Text className="text-sm text-ink">{value}</Text>
    </View>
  );
}

function Result({ result, cycleIndex }: { result: IqResult; cycleIndex?: number }) {
  const router = useRouter();
  const s = result.scoring;
  return (
    <View>
      <PageHeader title="IQ Test" subtitle={cycleIndex !== undefined ? `Cycle ${cycleIndex} · submitted` : "Submitted"} back />
      <Card className="mb-3">
        <Text className="text-[40px] font-bold text-ink">{formatScore(s.score)}</Text>
        <Text className="text-[13.5px] text-ink-muted">
          {s.correctCount} of {s.scoredQuestionCount} correct · behaviour multiplier ×{s.multiplier.toFixed(3)}
        </Text>
        <Text className="mt-2 text-[15px] font-semibold text-ink">
          Rank {result.rank.rank} of {result.rank.total}
          {result.grade ? ` in ${result.grade}` : " (Unassigned)"}
        </Text>
        <Button title="See the leaderboard" icon="trophy-outline" onPress={() => router.push("/iq/leaderboard")} className="mt-4" />
      </Card>
      <Card className="mb-3">
        <SectionLabel className="mb-2">How the score was built</SectionLabel>
        <ScoreRow label="Accuracy" value={`${s.correctCount} / ${s.scoredQuestionCount} → ${Math.trunc(s.base)} pts`} />
        <ScoreRow label="Answering speed" value={pct(s.speedFactor)} />
        <ScoreRow label="Answer changes" value={`${result.changeTotal} → ${pct(-s.changePenalty)}`} />
        <ScoreRow label="Back-navigation" value={`${result.navCounts.backward} → ${pct(-s.thrashPenalty)}`} />
        <Text className="mt-2 text-xs leading-4 text-ink-muted">
          Speed is scored on how plausible your pace was, not on how fast you were — answering far too quickly counts the same as not engaging.
          Median answer time: {secs(s.medianAnswerMs)}.
        </Text>
        {s.suspicious && <Text className="mt-2 text-xs text-warning">This attempt was flagged for unusual timing and may be reviewed.</Text>}
      </Card>
      <SectionLabel className="mb-2 mt-2">Review</SectionLabel>
      {result.review.map((item) => (
        <Card key={item.index} className="mb-2 flex-row">
          <Ionicons name={item.isCorrect ? "checkmark-circle" : "close-circle"} size={18} color={item.isCorrect ? colors.success : colors.danger} />
          <View className="ml-2.5 flex-1">
            <Text className="text-sm leading-5 text-ink">
              {item.index + 1}. {item.prompt}
            </Text>
            <Text className="text-xs text-success">Correct: {item.options[item.correctIndex] ?? ""}</Text>
            {!item.isCorrect && <Text className="text-xs text-danger">You chose: {item.selectedIndex !== null ? item.options[item.selectedIndex] : "nothing"}</Text>}
            {item.explanation ? <Text className="mt-1 text-xs leading-4 text-ink-muted">{item.explanation}</Text> : null}
            <Text className="mt-1 text-[11px] text-ink-label">
              {secs(item.timeToFirstAnswerMs)}
              {item.changeCount > 0 ? ` · changed ${item.changeCount}×` : ""}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

export default function IqTest() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<IqCycleInfo | null>(null);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [questions, setQuestions] = useState<IqQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [flushFailed, setFlushFailed] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<IqResult | null>(null);
  const session = useRef<IqSession | null>(null);
  const attemptId = useRef<string | null>(null);
  const flushing = useRef(false);

  /** Reads the cycle; the page moves to the gate, or to an error. */
  const settleCycle = useCallback((read: Promise<IqCycleInfo>) => {
    read.then(
      (i) => {
        setInfo(i);
        setPhase("gate");
      },
      (err: unknown) => {
        setError(messageOf(err));
        setPhase("error");
      },
    );
  }, []);

  const loadCycle = () => {
    setPhase("loading");
    setError(null);
    settleCycle(iqService.cycle());
  };

  useEffect(() => {
    settleCycle(iqService.cycle());
  }, [settleCycle]);

  // Re-read the cycle while its questions are being written.
  useEffect(() => {
    if (phase !== "gate" || !preparing(info)) return;
    const t = setInterval(() => {
      iqService.cycle().then(setInfo).catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [phase, info]);

  const flush = useCallback(() => {
    const s = session.current;
    const id = attemptId.current;
    if (!s || !id || flushing.current) return;
    const batch = s.takeBatch();
    if (!batch) return;
    flushing.current = true;
    iqService
      .flush(id, batch)
      .then(() => setFlushFailed(false))
      .catch(() => {
        s.restore(batch);
        setFlushFailed(true);
      })
      .finally(() => {
        flushing.current = false;
      });
  }, []);

  // While the test runs: the clock, a checkpoint every 20 s, and background time kept out of thinking time.
  useEffect(() => {
    if (phase !== "running") return;
    const tick = setInterval(() => session.current && setElapsed(session.current.elapsedMs()), 1000);
    const checkpoint = setInterval(flush, FLUSH_INTERVAL_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") session.current?.show();
      else {
        session.current?.hide();
        flush();
      }
    });
    return () => {
      clearInterval(tick);
      clearInterval(checkpoint);
      sub.remove();
      // Leaving the page mid-test: send what is pending.
      session.current?.hide();
      flush();
    };
  }, [phase, flush]);

  const sync = () => {
    const s = session.current;
    if (!s) return;
    setIndex(s.currentIndex);
    setAnswers([...s.answers]);
    if (s.pendingCount >= FLUSH_EVENT_THRESHOLD) flush();
  };

  const start = async () => {
    setStarting(true);
    setNotice(null);
    try {
      const res = await iqService.start();
      if (!res.ready || !res.questions?.length || !res.attemptId) {
        setNotice("This cycle's test is still being prepared. Hold on a moment.");
        setInfo((i) => (i?.cycle ? { ...i, cycle: { ...i.cycle, status: "GENERATING" } } : i));
        return;
      }
      const qs = res.questions;
      // A resume comes from the server: start returns the attempt's saved answers.
      const initial = qs.map((_, i) => res.answers?.find((a) => a.questionIndex === i)?.selectedIndex ?? null);
      session.current = new IqSession(qs.length, initial, res.lastSeq ?? 0);
      attemptId.current = res.attemptId;
      setQuestions(qs);
      setIndex(0);
      setAnswers(initial);
      setElapsed(0);
      setNotice(res.resumed ? "Resumed where you left off" : null);
      setPhase("running");
    } catch (err) {
      setNotice(messageOf(err));
    } finally {
      setStarting(false);
    }
  };

  const move = (kind: "NEXT" | "PREV" | "JUMP", target: number) => {
    if (session.current?.move(kind, target)) sync();
  };

  const submit = async () => {
    const s = session.current;
    const id = attemptId.current;
    if (!s || !id) return;
    const payload = s.finalize();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await iqService.submit(id, payload);
      session.current = null;
      setResult(r);
      setConfirmSubmit(false);
      setPhase("result");
    } catch (err) {
      // Keep the final events for the retry, sent under the next seq.
      s.restore(payload);
      setSubmitError(messageOf(err, "Could not submit. Your answers are saved; try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const leave = () => {
    setConfirmLeave(false);
    session.current?.hide();
    flush();
    session.current = null;
    attemptId.current = null;
    void loadCycle();
  };

  const sendReport = async () => {
    const id = attemptId.current;
    const qi = reporting;
    setReporting(null);
    if (!id || qi === null) return;
    try {
      await iqService.report(id, qi, reason);
      setNotice("Reported. Thanks, we'll review it.");
    } catch (err) {
      setNotice(messageOf(err, "Could not send the report."));
    }
    setReason("");
  };

  const total = questions.length;
  const q = questions[index];
  const answered = answers.filter((a) => a !== null).length;
  const unanswered = answers.map((a, i) => (a === null ? i + 1 : 0)).filter(Boolean);

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      {phase === "loading" && (
        <>
          <PageHeader title="IQ Test" back />
          <Loading />
        </>
      )}
      {phase === "error" && (
        <>
          <PageHeader title="IQ Test" back />
          <ErrorBox title="Unable to load the IQ test" message={error ?? undefined} onRetry={loadCycle} />
        </>
      )}
      {phase === "gate" && info && (
        <>
          <PageHeader title="IQ Test" subtitle={info.cycle ? `Cycle ${info.cycle.cycleIndex}` : null} back />
          <Gate info={info} starting={starting} notice={notice} onStart={start} />
        </>
      )}
      {phase === "result" && result && <Result result={result} cycleIndex={info?.cycle?.cycleIndex} />}
      {phase === "running" && q && (
        <View>
          <PageHeader title="IQ Test" subtitle={info?.cycle ? `Cycle ${info.cycle.cycleIndex}` : null} back={() => setConfirmLeave(true)} />
          <View className="mb-2 flex-row items-center">
            <Text className="flex-1 text-[15px] font-semibold text-ink">
              Question {index + 1} / {total}
            </Text>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text className="ml-1 mr-3 text-[13px] text-ink-muted">{formatMs(elapsed)}</Text>
            <Text className="text-[13px] text-ink-muted">
              {answered}/{total} answered
            </Text>
          </View>
          {flushFailed && <Text className="mb-1 text-xs text-warning">Reconnecting — your answers are kept</Text>}
          {notice ? (
            <Text onPress={() => setNotice(null)} className="mb-1 text-xs text-success">
              {notice}
            </Text>
          ) : null}
          <Card className="mb-3 mt-2">
            <View className="flex-row">
              <Text className="flex-1 text-[17px] font-medium leading-6 text-ink">{q.prompt}</Text>
              <Pressable onPress={() => setReporting(index)} accessibilityLabel="Report a problem with this question" className="ml-2 p-1">
                <Ionicons name="flag-outline" size={16} color={colors.muted} />
              </Pressable>
            </View>
          </Card>
          {q.options.map((opt, i) => {
            const picked = answers[index] === i;
            return (
              <Pressable
                key={i}
                onPress={() => session.current?.select(i) && sync()}
                className={`mb-2.5 flex-row items-center rounded-xl border px-3 py-3 ${picked ? "border-primary bg-primary/15" : "border-edge bg-card"}`}
              >
                <View className={`mr-3 h-7 w-7 items-center justify-center rounded-full ${picked ? "bg-primary" : "bg-tag"}`}>
                  <Text className="text-xs font-bold text-ink">{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text className="flex-1 text-[14.5px] leading-5 text-ink">{opt}</Text>
              </Pressable>
            );
          })}
          <View className="mt-2 flex-row gap-3">
            <Button title="Previous" variant="ghost" icon="chevron-back" disabled={index === 0} onPress={() => move("PREV", index - 1)} className="flex-1" />
            {index + 1 >= total ? (
              <Button title="Review & submit" icon="send" onPress={() => setConfirmSubmit(true)} className="flex-1" />
            ) : (
              <Button title="Next" icon="chevron-forward" onPress={() => move("NEXT", index + 1)} className="flex-1" />
            )}
          </View>
          <SectionLabel className="mb-2 mt-6">Questions</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {questions.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => move("JUMP", i)}
                className={`h-9 w-9 items-center justify-center rounded-lg border ${i === index ? "border-ink" : "border-edge"} ${answers[i] !== null ? "bg-primary/40" : "bg-card"}`}
              >
                <Text className="text-[12.5px] text-ink">{i + 1}</Text>
              </Pressable>
            ))}
          </View>
          <Button title="Submit the test" variant="ghost" onPress={() => setConfirmSubmit(true)} className="mt-5" />
        </View>
      )}

      <Sheet visible={confirmSubmit} onClose={() => !submitting && setConfirmSubmit(false)} title="Submit your test?">
        <Text className={`text-sm leading-5 ${unanswered.length ? "text-warning" : "text-ink"}`}>
          {unanswered.length === 0 ? `All ${total} questions answered.` : `${unanswered.length} unanswered: ${unanswered.slice(0, 12).join(", ")}${unanswered.length > 12 ? "…" : ""}`}
        </Text>
        <Text className="mt-2 text-sm leading-5 text-ink-muted">
          You get one attempt per cycle. Once you submit you cannot retake this test until the next cycle opens.
        </Text>
        {submitError ? <Text className="mt-2 text-sm text-danger">{submitError}</Text> : null}
        <View className="mt-4 flex-row gap-3">
          <Button title="Keep working" variant="ghost" disabled={submitting} onPress={() => setConfirmSubmit(false)} className="flex-1" />
          <Button title="Submit" loading={submitting} onPress={submit} className="flex-1" />
        </View>
      </Sheet>
      <Sheet visible={reporting !== null} onClose={() => setReporting(null)} title={`Report question ${(reporting ?? 0) + 1}`}>
        <Field label="What's wrong with it?" value={reason} onChangeText={setReason} multiline autoCapitalize="sentences" />
        <View className="flex-row gap-3">
          <Button title="Cancel" variant="ghost" onPress={() => setReporting(null)} className="flex-1" />
          <Button title="Send" disabled={reason.trim().length < 3} onPress={sendReport} className="flex-1" />
        </View>
      </Sheet>
      <ConfirmDialog
        visible={confirmLeave}
        title="Leave the test?"
        message="Your answers are saved. You can resume this attempt from IQ Test until the cycle ends."
        confirmLabel="Leave"
        onConfirm={leave}
        onCancel={() => setConfirmLeave(false)}
      />
    </ScrollView>
  );
}
