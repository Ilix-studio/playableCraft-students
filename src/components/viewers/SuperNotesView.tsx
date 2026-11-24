// A lesson plan's Super Notes as students read them (the Android app's SuperNotesView): a title card, then one
// card per part the notes have. Quick Check hides each answer until tapped.

import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, colors, type IconName } from "@/components/ui";
import type { SuperNotes } from "@/lib/types";

function Part({ icon, title, subtitle, children }: { icon: IconName; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="mb-3">
      <View className="mb-3 flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-tag">
          <Ionicons name={icon} size={17} color={colors.accent} />
        </View>
        <View className="ml-2.5 flex-1">
          <Text className="text-base font-semibold text-ink">{title}</Text>
          {subtitle ? <Text className="text-xs text-ink-muted">{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} className="flex-row py-1">
          <Text className="w-4 text-accent">•</Text>
          <Text className="flex-1 text-sm leading-5 text-ink">{t}</Text>
        </View>
      ))}
    </View>
  );
}

function QuickCheckItem({ n, question, answer }: { n: number; question: string; answer: string }) {
  const [shown, setShown] = useState(false);
  return (
    <Pressable
      onPress={() => setShown((s) => !s)}
      accessibilityRole="button"
      accessibilityHint={shown ? "Hide answer" : "Show answer"}
      className="mb-2 rounded-xl border border-edge bg-page/40 p-3"
    >
      <View className="flex-row">
        <Text className="mr-2 text-sm font-bold text-[#3B82F6]">Q{n}</Text>
        <Text className="flex-1 text-sm leading-5 text-ink">{question}</Text>
      </View>
      {shown ? (
        <Text className="mt-2 text-sm leading-5 text-success">{answer}</Text>
      ) : (
        <Text className="mt-2 text-xs text-ink-muted">Tap to see the answer</Text>
      )}
    </Pressable>
  );
}

const has = <T,>(xs: T[] | undefined): xs is T[] => Array.isArray(xs) && xs.length > 0;

export function SuperNotesView({ notes }: { notes: SuperNotes }) {
  return (
    <View>
      <View className="mb-3 rounded-2xl border border-edge bg-[#0C1A3D] p-5">
        <View className="mb-2 flex-row items-center self-start rounded-full bg-[#3B82F6]/20 px-2.5 py-1">
          <Ionicons name="sparkles" size={13} color="#3B82F6" />
          <Text className="ml-1 text-xs font-medium text-[#3B82F6]">Super Notes</Text>
        </View>
        <Text className="text-xl font-bold text-ink">{notes.title}</Text>
        {notes.summary ? <Text className="mt-2 text-sm leading-5 text-ink-muted">{notes.summary}</Text> : null}
      </View>

      {has(notes.definitions) && (
        <Part icon="book-outline" title="Definitions">
          {notes.definitions.map((d, i) => (
            <View key={i} className="mb-2">
              <Text className="text-sm font-semibold text-ink">{d.term}</Text>
              <Text className="text-sm leading-5 text-ink-muted">{d.meaning}</Text>
            </View>
          ))}
        </Part>
      )}
      {has(notes.keyPoints) && (
        <Part icon="bulb-outline" title="Key Points">
          <Bullets items={notes.keyPoints} />
        </Part>
      )}
      {notes.sequence && has(notes.sequence.steps) && (
        <Part icon="list-outline" title="Sequence" subtitle={notes.sequence.title}>
          {notes.sequence.steps.map((s, i, all) => (
            <View key={i} className="flex-row">
              <View className="items-center">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Text className="text-xs font-bold text-ink">{i + 1}</Text>
                </View>
                {i < all.length - 1 && <View className="w-0.5 flex-1 bg-edge" />}
              </View>
              <Text className="ml-3 flex-1 pb-3 text-sm leading-5 text-ink">{s}</Text>
            </View>
          ))}
        </Part>
      )}
      {notes.mindMap && has(notes.mindMap.branches) && (
        <Part icon="git-network-outline" title="Mind Map">
          <View className="mb-2 self-center rounded-full bg-primary px-4 py-1.5">
            <Text className="text-sm font-semibold text-ink">{notes.mindMap.center}</Text>
          </View>
          {notes.mindMap.branches.map((b, i) => (
            <View key={i} className="mb-2 border-l-2 border-primary/60 pl-3">
              <Text className="text-sm font-semibold text-ink">{b.label}</Text>
              {has(b.points) && <Bullets items={b.points} />}
            </View>
          ))}
        </Part>
      )}
      {has(notes.formulas) && (
        <Part icon="calculator-outline" title="Formulas">
          {notes.formulas.map((f, i) => (
            <View key={i} className="mb-2 rounded-xl border border-edge bg-page/40 p-3">
              <Text className="text-xs text-ink-muted">{f.name}</Text>
              <Text className="mt-1 font-mono text-base text-[#E5E7FF]">{f.expression}</Text>
              {f.note ? <Text className="mt-1 text-xs leading-4 text-ink-muted">{f.note}</Text> : null}
            </View>
          ))}
        </Part>
      )}
      {has(notes.examples) && (
        <Part icon="create-outline" title="Worked Examples">
          {notes.examples.map((e, i) => (
            <View key={i} className="mb-3">
              <Text className="mb-1 text-sm font-semibold text-ink">{e.title}</Text>
              {has(e.steps) && <Bullets items={e.steps} />}
              {e.answer ? <Text className="mt-1 text-sm font-semibold text-success">Answer: {e.answer}</Text> : null}
            </View>
          ))}
        </Part>
      )}
      {has(notes.importantPoints) && (
        <Part icon="star-outline" title="Important Points" subtitle="Remember these for the exam">
          <Bullets items={notes.importantPoints} />
        </Part>
      )}
      {has(notes.commonMistakes) && (
        <Part icon="warning-outline" title="Common Mistakes">
          <Bullets items={notes.commonMistakes} />
        </Part>
      )}
      {has(notes.memoryTips) && (
        <Part icon="flash-outline" title="Memory Tips">
          <Bullets items={notes.memoryTips} />
        </Part>
      )}
      {has(notes.realLife) && (
        <Part icon="earth-outline" title="In Real Life">
          <Bullets items={notes.realLife} />
        </Part>
      )}
      {has(notes.quickCheck) && (
        <Part icon="help-circle-outline" title="Quick Check" subtitle="Answer first, then tap to check">
          {notes.quickCheck.map((q, i) => (
            <QuickCheckItem key={i} n={i + 1} question={q.question} answer={q.answer} />
          ))}
        </Part>
      )}
    </View>
  );
}
