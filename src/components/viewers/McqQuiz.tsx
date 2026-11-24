// One question at a time (the Android app's McqQuiz): the right answer and its explanation once an option is
// picked, an optional per-question timer that moves on by itself, and the score at the end with Retry.

import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, colors, EmptyBox, SectionLabel } from "@/components/ui";
import type { QuizQuestion } from "@/lib/types";

export function McqQuiz({ questions, secondsPerQuestion, onDone }: { questions: QuizQuestion[]; secondsPerQuestion: number | null; onDone?: () => void }) {
  const total = questions.length;
  const perQuestion = secondsPerQuestion && secondsPerQuestion > 0 ? secondsPerQuestion : null;
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remaining, setRemaining] = useState(perQuestion ?? 0);
  /** The clock ran out on this question; it moves on after a moment. */
  const [timedOut, setTimedOut] = useState(false);

  const next = () => {
    setLocked(false);
    if (index + 1 >= total) setFinished(true);
    else {
      setIndex(index + 1);
      setRemaining(perQuestion ?? 0);
    }
  };

  // Per-question countdown; running out locks the question.
  useEffect(() => {
    if (!perQuestion || locked || finished) return;
    const t = setTimeout(() => {
      if (remaining <= 1) {
        setRemaining(0);
        setLocked(true);
        setTimedOut(true);
      } else setRemaining(remaining - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [perQuestion, locked, finished, remaining, attempt, index]);

  const moveOn = useEffectEvent(() => next());
  useEffect(() => {
    if (!timedOut) return;
    const t = setTimeout(() => {
      setTimedOut(false);
      moveOn();
    }, 800);
    return () => clearTimeout(t);
  }, [timedOut]);

  if (total === 0) return <EmptyBox icon="file-tray-outline" message="This quiz has no questions." />;

  const retry = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setAnswers(questions.map(() => null));
    setLocked(false);
    setFinished(false);
    setTimedOut(false);
    setRemaining(perQuestion ?? 0);
  };

  if (finished) {
    const score = questions.filter((q, i) => answers[i] === q.correctIndex).length;
    return (
      <Card className="items-center py-8">
        <Text className="text-[34px] font-bold text-ink">
          {score} / {total}
        </Text>
        <Text className="text-sm text-ink-muted">{Math.round((score * 100) / total)}% correct</Text>
        <View className="mt-5 flex-row gap-3">
          <Button title="Retry" icon="refresh" onPress={retry} />
          {onDone && <Button title="Done" variant="ghost" onPress={onDone} />}
        </View>
      </Card>
    );
  }

  const q = questions[index];
  const chosen = answers[index];
  return (
    <View>
      <View className="mb-2 flex-row items-center">
        <Text className="flex-1 text-[13px] text-ink-muted">
          Question {index + 1} / {total}
        </Text>
        {perQuestion && (
          <View className="flex-row items-center">
            <Ionicons name="timer-outline" size={15} color={remaining <= 5 ? colors.danger : colors.muted} />
            <Text className={`ml-1 text-[13px] ${remaining <= 5 ? "text-danger" : "text-ink-muted"}`}>{remaining}s</Text>
          </View>
        )}
      </View>
      <View className="mb-4 h-1 rounded-full bg-tag">
        <View className="h-1 rounded-full bg-primary" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </View>
      <Text className="mb-4 text-[17px] font-semibold leading-6 text-ink">{q.question}</Text>
      {q.options.map((opt, i) => {
        const state = !locked ? "idle" : i === q.correctIndex ? "correct" : i === chosen ? "wrong" : "idle";
        return (
          <Pressable
            key={i}
            disabled={locked}
            onPress={() => {
              setAnswers((a) => a.map((x, j) => (j === index ? i : x)));
              setLocked(true);
            }}
            className={`mb-2.5 flex-row items-center rounded-xl border px-4 py-3.5 ${
              state === "correct" ? "border-success bg-success/10" : state === "wrong" ? "border-danger bg-danger/10" : "border-edge bg-card"
            }`}
          >
            <Text className="flex-1 text-[14.5px] leading-5 text-ink">{opt}</Text>
            {state === "correct" && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
            {state === "wrong" && <Ionicons name="close-circle" size={18} color={colors.danger} />}
          </Pressable>
        );
      })}
      {locked && q.explanation ? (
        <Card className="mt-2">
          <SectionLabel className="mb-1">Explanation</SectionLabel>
          <Text className="text-[13.5px] leading-5 text-ink">{q.explanation}</Text>
        </Card>
      ) : null}
      <Button title={index + 1 >= total ? "Finish" : "Next"} onPress={next} disabled={!locked} className="mt-4" />
    </View>
  );
}
