// The student's notes (the Android app's NotesScreen): Active / Archived, search, tag filter, pinned first.
// Each note can be pinned, archived, edited or deleted; "Take a note" writes a new one with tags and a colour.

import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, colors, ConfirmDialog, EmptyBox, ErrorBox, Field, InlineError, Loading, PageHeader, Pill, SectionLabel, Sheet } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { cleanTags, NOTE_COLORS, NOTE_MAX_TAGS, NOTE_SWATCH, notesService, type Note, type NoteColor } from "@/services/notes";

function NoteEditor({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tags, setTags] = useState((note?.tags ?? []).join(", "));
  const [color, setColor] = useState<NoteColor>(note?.color ?? "slate");
  const save = useMutation({
    mutationFn: () =>
      note
        ? notesService.update(note.id, { title: title.trim() || null, body: body.trim(), tags: cleanTags(tags), color })
        : notesService.create({ title, body, label: "General", tags: cleanTags(tags), color }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notes"] });
      onClose();
    },
  });
  return (
    <View>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="Title or topic" autoCapitalize="sentences" />
      <Field label="Note" value={body} onChangeText={setBody} placeholder="Thoughts, explanations or a reminder…" multiline autoCapitalize="sentences" />
      <Field label={`Tags (up to ${NOTE_MAX_TAGS}, comma separated)`} value={tags} onChangeText={setTags} placeholder="physics, revision" />
      <SectionLabel className="mb-2">Colour</SectionLabel>
      <View className="mb-4 flex-row gap-3">
        {NOTE_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            accessibilityLabel={c}
            accessibilityState={{ selected: color === c }}
            className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-ink" : "border-transparent"}`}
            style={{ backgroundColor: NOTE_SWATCH[c] }}
          />
        ))}
      </View>
      <InlineError text={save.error ? messageOf(save.error) : null} />
      <View className="mt-2 flex-row gap-3">
        <Button title="Cancel" variant="ghost" onPress={onClose} className="flex-1" />
        <Button title={note ? "Save changes" : "Save note"} loading={save.isPending} disabled={!body.trim()} onPress={() => save.mutate()} className="flex-1" />
      </View>
    </View>
  );
}

function IconButton({ name, label, onPress, tint }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} className="p-1.5">
      <Ionicons name={name} size={17} color={tint ?? colors.muted} />
    </Pressable>
  );
}

function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit: () => void; onDelete: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const update = useMutation({
    mutationFn: (patch: { isPinned?: boolean; isArchived?: boolean }) => notesService.update(note.id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notes"] }),
    onError: (err) => toast(messageOf(err), "error"),
  });
  return (
    <Pressable onPress={onEdit} className="mb-3 overflow-hidden rounded-2xl border border-edge bg-card active:opacity-90">
      <View className="h-1" style={{ backgroundColor: NOTE_SWATCH[note.color] }} />
      <View className="p-4">
        <View className="flex-row items-start">
          <Text className="flex-1 text-[15px] font-semibold text-ink" numberOfLines={2}>
            {note.title || "Untitled Note"}
          </Text>
          <IconButton name={note.pinned ? "pin" : "pin-outline"} label={note.pinned ? "Unpin" : "Pin to top"} tint={note.pinned ? colors.accent : undefined} onPress={() => update.mutate({ isPinned: !note.pinned })} />
          <IconButton name={note.archived ? "arrow-undo-outline" : "archive-outline"} label={note.archived ? "Restore" : "Archive"} onPress={() => update.mutate({ isArchived: !note.archived })} />
          <IconButton name="trash-outline" label="Delete note" onPress={onDelete} />
        </View>
        <Text className="mt-1 text-sm leading-5 text-ink-muted" numberOfLines={6}>
          {note.body}
        </Text>
        <View className="mt-3 flex-row flex-wrap items-center gap-1.5">
          {note.tags.map((t) => (
            <Text key={t} className="overflow-hidden rounded-full bg-tag px-2 py-0.5 text-[11px] text-tag-text">
              #{t}
            </Text>
          ))}
          <Text className="ml-auto text-[11px] text-ink-label">{formatDate(note.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function Notes() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | "new" | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  // Search as the student types, a moment after they stop.
  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const notes = useQuery({ queryKey: ["notes", status, q, tag], queryFn: () => notesService.list(status, q, tag) });
  const tags = useQuery({ queryKey: ["notes", "tags"], queryFn: notesService.tags });
  const remove = useMutation({
    mutationFn: (id: string) => notesService.delete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notes"] }),
    onError: (err) => toast(messageOf(err), "error"),
  });
  const sorted = [...(notes.data ?? [])].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-5">
        <PageHeader title="Notes" back right={<Button title="Take a note" icon="add" onPress={() => setEditing("new")} className="h-9" />} />
        <View className="mb-3 flex-row gap-2">
          <Pill label="Active" selected={status === "active"} onPress={() => setStatus("active")} />
          <Pill label="Archived" selected={status === "archived"} onPress={() => setStatus("archived")} />
        </View>
        <View className="mb-3 flex-row items-center rounded-xl border border-edge bg-[#0E1730] px-3">
          <Ionicons name="search" size={17} color={colors.label} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search notes" placeholderTextColor="#5E6985" className="ml-2 flex-1 py-2.5 text-[15px] text-ink" />
          {search ? (
            <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear" className="p-1">
              <Ionicons name="close-circle" size={17} color={colors.label} />
            </Pressable>
          ) : null}
        </View>
        {(tags.data ?? []).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 flex-grow-0" contentContainerClassName="gap-2">
            <Pill label="All tags" selected={tag === null} onPress={() => setTag(null)} />
            {tags.data!.map((t) => (
              <Pill key={t.tag} label={`#${t.tag}`} note={String(t.count)} selected={tag === t.tag} onPress={() => setTag(tag === t.tag ? null : t.tag)} />
            ))}
          </ScrollView>
        )}
      </View>
      {notes.isLoading ? (
        <Loading />
      ) : notes.isError ? (
        <View className="px-5">
          <ErrorBox title="Unable to load notes" message={messageOf(notes.error)} onRetry={() => void notes.refetch()} />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(n) => n.id}
          contentContainerClassName="px-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={notes.isRefetching} onRefresh={() => void notes.refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyBox icon="create-outline" message={q || tag ? "No notes match your search." : status === "archived" ? "No archived notes." : "No notes yet."}>
              {!q && !tag && status === "active" && <Button title="Take a note" icon="add" onPress={() => setEditing("new")} className="mt-4" />}
            </EmptyBox>
          }
          renderItem={({ item }) => <NoteCard note={item} onEdit={() => setEditing(item)} onDelete={() => setDeleting(item)} />}
        />
      )}
      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Jot down a note" : "Edit note"}>
        {editing !== null && <NoteEditor note={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </Sheet>
      <ConfirmDialog
        visible={deleting !== null}
        title="Delete this note?"
        message="It is removed for good."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}
