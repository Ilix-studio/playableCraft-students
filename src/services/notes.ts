// The student's own notes (/api/notes): every note is global scope, its "page context" kept in `label`.
// Title, text, tags, colour, pin and archive can all be changed later (PATCH notes/:id).

import { api } from "@/lib/api";

export const NOTE_COLORS = ["slate", "indigo", "amber", "emerald", "rose"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];
/** Server limits (constants/enums.ts). Tags are stored lower-case. */
export const NOTE_MAX_TAGS = 8;
export const NOTE_MAX_TAG_CHARS = 24;
export const NOTE_MAX_TITLE_CHARS = 120;
export const NOTE_MAX_BODY_CHARS = 4000;

export const NOTE_SWATCH: Record<NoteColor, string> = {
  slate: "#64748B",
  indigo: "#6366F1",
  amber: "#F59E0B",
  emerald: "#10B981",
  rose: "#F43F5E",
};

export interface Note {
  id: string;
  title: string;
  body: string;
  label: string;
  archived: boolean;
  createdAt: string;
  tags: string[];
  color: NoteColor;
  pinned: boolean;
}

interface NoteDto {
  _id: string;
  title?: string | null;
  body?: string;
  label?: string | null;
  isArchived?: boolean;
  createdAt?: string;
  tags?: string[];
  color?: string;
  isPinned?: boolean;
}

const toNote = (d: NoteDto): Note => ({
  id: d._id,
  title: d.title?.trim() || "",
  body: d.body ?? "",
  label: d.label?.trim() || "General",
  archived: d.isArchived === true,
  createdAt: d.createdAt ?? "",
  tags: d.tags ?? [],
  color: (NOTE_COLORS as readonly string[]).includes(d.color ?? "") ? (d.color as NoteColor) : "slate",
  pinned: d.isPinned === true,
});

export interface NoteDraft {
  title: string;
  body: string;
  label: string;
  tags: string[];
  color: NoteColor;
}

export const notesService = {
  async list(status: "active" | "archived", q?: string, tag?: string | null): Promise<Note[]> {
    const data = await api.get<{ notes?: NoteDto[] }>("notes", { query: { status, q: q?.trim(), tag, limit: 200 } });
    return (data.notes ?? []).map(toNote);
  },
  tags: async () => (await api.get<{ tags?: { tag: string; count: number }[] }>("notes/tags")).tags ?? [],
  async create(d: NoteDraft): Promise<Note> {
    const r = await api.post<{ note: NoteDto }>("notes", {
      title: d.title.trim() || null,
      body: d.body.trim(),
      scope: "global",
      label: d.label.trim() || null,
      tags: d.tags,
      color: d.color,
    });
    return toNote(r.note);
  },
  async update(id: string, patch: Partial<{ title: string | null; body: string; tags: string[]; color: NoteColor; isPinned: boolean; isArchived: boolean }>): Promise<Note> {
    return toNote((await api.patch<{ note: NoteDto }>(`notes/${id}`, patch)).note);
  },
  delete: (id: string) => api.del(`notes/${id}`),
};

/** Lower-case, trimmed, de-duplicated, within the server's limits. */
export function cleanTags(raw: string): string[] {
  const out: string[] = [];
  for (const t of raw.split(/[,\n]/)) {
    const tag = t.trim().replace(/^#/, "").toLowerCase().slice(0, NOTE_MAX_TAG_CHARS);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, NOTE_MAX_TAGS);
}
