// Book -> language edition -> chapters, from the textbooks the server has ingested (GET corpus/scope and
// corpus/chapters; the Android app's ChapterPicker for a student). The books offered are narrowed to the classes
// the student's plan covers. Chapters are multi-select unless `single`, where a tap replaces the choice (the
// server takes one chapter per mind map); with `bookOnly` no chapter is asked for (a board mock paper).

import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, ErrorBox, InlineError, Loading, Pill, SectionLabel, Select } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { learnService, type ChapterScope } from "@/services/learn";

const LANGUAGE_LABEL: Record<string, string> = { en: "English", as: "Assamese" };

export interface ChapterPickerState {
  scope: ChapterScope | null;
  chapterNames: string[];
  view: React.ReactNode;
}

export function useChapterPicker({
  grades,
  single = false,
  bookOnly = false,
  disabled = false,
}: {
  grades?: string[] | null;
  single?: boolean;
  bookOnly?: boolean;
  disabled?: boolean;
}): ChapterPickerState {
  const books = useQuery({ queryKey: ["corpus", "scope"], queryFn: learnService.corpusScope, staleTime: 10 * 60_000 });
  const [bookKey, setBookKey] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [picked, setPicked] = useState<number[]>([]);

  // One row per book: corpus/scope lists each language edition separately.
  const curricula = useMemo(() => {
    const seen = new Map<string, { board: string; grade: string; subject: string }>();
    for (const e of books.data ?? []) {
      if (grades && !grades.includes(e.grade)) continue;
      seen.set(`${e.board}|${e.grade}|${e.subject}`, { board: e.board, grade: e.grade, subject: e.subject });
    }
    return [...seen.entries()].map(([key, c]) => ({ key, ...c })).sort((a, b) => a.key.localeCompare(b.key));
  }, [books.data, grades]);
  const book = curricula.find((c) => c.key === bookKey) ?? null;
  const languages = useMemo(
    () => [...new Set((books.data ?? []).filter((e) => book && e.board === book.board && e.grade === book.grade && e.subject === book.subject).map((e) => e.language))],
    [books.data, book],
  );
  const lang = languages.includes(language) ? language : (languages[0] ?? "en");

  const chapters = useQuery({
    queryKey: ["corpus", "chapters", book?.key, lang],
    enabled: book !== null && !bookOnly,
    staleTime: 10 * 60_000,
    queryFn: () => learnService.corpusChapters({ board: book!.board, grade: book!.grade, subject: book!.subject, language: lang }),
  });
  const list = chapters.data ?? [];
  const chosen = picked.filter((n) => list.some((c) => c.chapterNumber === n)).sort((a, b) => a - b);

  const toggle = (n: number) => setPicked((p) => (single ? [n] : p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const view = books.isLoading ? (
    <Loading className="py-6" />
  ) : books.isError ? (
    <ErrorBox title="Couldn't load your textbooks" message={messageOf(books.error)} onRetry={() => void books.refetch()} />
  ) : curricula.length === 0 ? (
    <Text className="text-sm text-ink-muted">No textbooks for your classes are in the library yet.</Text>
  ) : (
    <View>
      <Select
        label="Book"
        value={bookKey}
        placeholder="Choose a book"
        disabled={disabled}
        options={curricula.map((c) => ({ value: c.key, label: `${c.board} · ${c.grade} · ${c.subject}` }))}
        onChange={(k) => {
          setBookKey(k);
          setPicked([]);
        }}
      />
      {languages.length > 1 && (
        <View className="mb-3">
          <SectionLabel className="mb-1.5">Language</SectionLabel>
          <View className="flex-row gap-2">
            {languages.map((l) => (
              <Pill key={l} label={LANGUAGE_LABEL[l] ?? l} selected={lang === l} disabled={disabled} onPress={() => (setLanguage(l), setPicked([]))} />
            ))}
          </View>
        </View>
      )}
      {book && !bookOnly && (
        <View>
          <View className="mb-1.5 flex-row items-center justify-between">
            <SectionLabel>{single ? "Chapter" : "Chapters"}</SectionLabel>
            {!single && list.length > 0 && (
              <Pressable disabled={disabled} onPress={() => setPicked(chosen.length === list.length ? [] : list.map((c) => c.chapterNumber))}>
                <Text className="text-xs font-medium text-accent">{chosen.length === list.length ? "Clear" : "Select all"}</Text>
              </Pressable>
            )}
          </View>
          {chapters.isLoading ? (
            <Loading className="py-4" />
          ) : chapters.isError ? (
            <InlineError text={messageOf(chapters.error, "Couldn't load the chapters.")} />
          ) : (
            list.map((c) => {
              const on = chosen.includes(c.chapterNumber);
              return (
                <Pressable
                  key={c.chapterNumber}
                  disabled={disabled}
                  onPress={() => toggle(c.chapterNumber)}
                  className={`mb-1.5 flex-row items-center rounded-xl border px-3 py-2.5 ${on ? "border-primary bg-primary/15" : "border-edge"}`}
                >
                  <Ionicons name={on ? (single ? "radio-button-on" : "checkbox") : single ? "radio-button-off" : "square-outline"} size={18} color={on ? colors.primary : colors.label} />
                  <Text className="ml-2.5 flex-1 text-sm text-ink">
                    {c.chapterNumber}. {c.chapterTitle}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}
    </View>
  );

  return {
    scope: book && (bookOnly || chosen.length > 0) ? { board: book.board, grade: book.grade, subject: book.subject, language: lang, chapterNumbers: chosen } : null,
    chapterNames: list.filter((c) => chosen.includes(c.chapterNumber)).map((c) => c.chapterTitle),
    view,
  };
}
