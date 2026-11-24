// A student's own plan and content (server: /api/learn; web: store/services/learnApi.ts). Library calls
// (Level 0) are free with a live plan. Generate calls climb the level ladder (levels 1 and up) and spend one of
// the month's fresh sets or maps: the next version of the request this student has not had is copied at once
// when another student already had it written, otherwise a new one is written. The plan is bought on the website: the app
// shows it but takes no payment, as for class fees.

import { api } from "@/lib/api";
import type { MindMapNode, SuperNotes } from "@/lib/types";

/** Counts per metered kind: fresh practice sets ("mcq"), fresh mind maps and mock papers. */
export interface FeatureCounts {
  mcq: number;
  mindMap: number;
  mock: number;
}

export interface StudentPlanCatalogEntry {
  tier: string;
  label: string;
  monthlyINR: number;
  grades: string[];
  /** "BOARD" / "JEE" / "NEET". */
  tracks: string[];
  quotas: FeatureCounts;
  questionsPerSet: number;
}

export interface StudentPlans {
  catalog: StudentPlanCatalogEntry[];
  /** The plan as snapshotted at purchase, live or ended. */
  plan: { tier: string; grades: string[]; quotas: FeatureCounts; questionsPerSet: number; periodEnd: string } | null;
  live: boolean;
  usage: { periodEnd: string; limits: FeatureCounts; used: FeatureCounts } | null;
}

export const livePlan = (p?: StudentPlans) => (p?.live ? p.plan : null);
export const left = (p: StudentPlans | undefined, k: keyof FeatureCounts) => (p?.usage ? Math.max(0, p.usage.limits[k] - p.usage.used[k]) : 0);
export const tierLabel = (p: StudentPlans | undefined, tier: string) => p?.catalog.find((c) => c.tier === tier)?.label ?? tier;

export interface ChapterScope {
  board: string;
  grade: string;
  subject: string;
  language: string;
  chapterNumbers: number[];
}

export type Difficulty = "adaptive" | "mixed" | "easy" | "medium" | "hard";

export interface PracticeRequest extends ChapterScope {
  questionCount: number;
  difficulty: Difficulty;
  /** "revision" re-serves questions the student got wrong. */
  mode: "new" | "revision";
}

export interface PracticeQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  difficulty: string;
  topic?: string | null;
  chapterNumber?: number | null;
  /** "library" or "generated". */
  origin: string;
}

export interface PracticeSet {
  _id: string;
  title: string;
  board: string;
  grade: string;
  subject: string;
  chapterNames: string[];
  requestedCount: number;
  questions: PracticeQuestion[];
  /** A revision set is never topped up. */
  mode: "new" | "revision";
  /** 0 from the library, 1 and up for a fresh set; absent on older sets. */
  level?: number | null;
  createdAt: string;
}

/** The fresh button's title: what it will do for this request (`verb` is "Write" or "Make"). */
export function freshTitle(next: NextLevel | undefined, freshLeft: number, verb: string): string {
  const what = next?.ready ? `Get level ${next.level}` : `${verb} ${next ? `level ${next.level}` : "a fresh one"}`;
  return `${what} (${freshLeft} left this month)`;
}

export const LEVELS_NOTE =
  "Fresh versions come in levels, and each uses one of this month's. When another student already has your next level, you get a copy straight away; otherwise it is written for you and waits for the next student.";

/** Questions a top-up would still write. */
export const missingOf = (s: PracticeSet) => (s.mode === "revision" ? 0 : Math.max(0, s.requestedCount - s.questions.length));

/** A library draw or a generation: the set (null when the library had nothing) and how far it falls short. */
export interface PracticeResult {
  set: PracticeSet | null;
  requested: number;
  available: number;
  shortfall: number;
  /** A fresh set's level, and whether it was another student's version (copied at once). */
  level?: number | null;
  copied?: boolean;
}

/** What the fresh button will do: copy `level` at once when `ready`, else write it. Either uses one of the month's. */
export interface NextLevel {
  level: number;
  ready: boolean;
}

export interface TopicSummary {
  chapterNumber?: number | null;
  topic?: string | null;
  chapterTitle?: string | null;
  attempted: number;
  accuracy: number;
  averageSeconds: number;
  targetSeconds: number;
}
export const topicLabel = (t: TopicSummary) => t.topic || t.chapterTitle || `Chapter ${t.chapterNumber ?? ""}`.trim();

export interface Advice {
  band: string;
  message: string;
}

export interface AttemptResult {
  report: {
    total: number;
    correct: number;
    accuracy: number;
    totalSeconds: number;
    averageSeconds: number;
    targetSeconds: number;
    byTopic: TopicSummary[];
    advice: Advice;
  };
  overall: { advice: Advice; weakTopics: TopicSummary[] };
}

export interface SubjectProgress {
  board: string;
  grade: string;
  subject: string;
  attempted: number;
  accuracy: number;
  averageSeconds: number;
  targetSeconds: number;
  weakTopics: TopicSummary[];
  advice: Advice;
}

export interface PracticeSetSummary {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  requestedCount: number;
  questionCount: number;
  level?: number | null;
  createdAt: string;
}

export interface MindMapRequest extends ChapterScope {
  depth: number;
}

/** On a library miss: the nearest map there is (same chapter, another depth), for the student to choose. */
export interface ClosestMindMap {
  depth: number;
  nodeCount: number;
  chapterNames: string[];
}

export interface MindMapSummary {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  nodeCount: number;
  fromLibrary: boolean;
  level?: number | null;
  createdAt: string;
}

export interface MindMapDetail {
  id: string;
  title: string;
  subject: string;
  board: string;
  grade: string;
  nodeCount: number;
  root: MindMapNode;
}

export interface ExamOption {
  /** "BOARD_MCQ" / "JEE_MAIN" / "NEET". */
  id: string;
  label: string;
  note: string;
  durationMinutes: number;
  board?: string | null;
  grades: string[];
  /** A board paper has one section with no subject: the subject the student picks. */
  sections: { subject?: string | null; questions: number; marksCorrect: number; marksWrong: number }[];
  /** "past" / "model" / "board". */
  kinds: string[];
}

export interface MockQuestion {
  question: string;
  options: string[];
  /** Only after submission. */
  correctIndex?: number | null;
  explanation?: string | null;
  chapterTitle?: string | null;
  origin?: string | null;
  year?: number | null;
}

export interface MockResponse {
  chosenIndex: number | null;
  seconds: number;
  markedForReview: boolean;
}

export interface MockPaper {
  _id: string;
  pattern: string;
  kind: string;
  title: string;
  /** Model papers' "AI-generated practice paper — not an official…" label. */
  label?: string | null;
  note: string;
  durationSeconds: number;
  endsAt: string;
  submittedAt?: string | null;
  sections: { subject: string; marksCorrect: number; marksWrong: number; expected: number; questions: MockQuestion[] }[];
  responses: MockResponse[];
  result?: {
    correct: number;
    wrong: number;
    skipped: number;
    score: number;
    maxScore: number;
    secondsUsed: number;
    late: boolean;
    sections: { subject: string; correct: number; wrong: number; skipped: number; score: number; maxScore: number; seconds: number }[];
  } | null;
}

export interface MockSummary {
  _id: string;
  title: string;
  label?: string | null;
  questionCount: number;
  createdAt: string;
  submittedAt?: string | null;
  score?: number | null;
  maxScore?: number | null;
}

/** One chapter's notes in the library: one per set of topics a teacher planned it by. */
export interface SuperNotesEntry {
  _id: string;
  topics: string[];
  title?: string | null;
  summary?: string | null;
}

export interface CorpusScopeEntry {
  board: string;
  grade: string;
  subject: string;
  /** "en" / "as". */
  language: string;
}

export interface CorpusChapter {
  chapterNumber: number;
  chapterTitle: string;
}

interface RawNode {
  id?: string;
  label?: string;
  detail?: string;
  children?: RawNode[];
}
const toNode = (n: RawNode): MindMapNode => ({ id: n.id ?? "", label: n.label ?? "", detail: n.detail, children: (n.children ?? []).map(toNode) });

export const learnService = {
  plans: () => api.get<StudentPlans>("learn/plans"),

  libraryPractice: (r: PracticeRequest) => api.post<PracticeResult>("learn/practice/library", r),
  practiceNextLevel: (r: PracticeRequest) => api.post<NextLevel>("learn/practice/next-level", r),
  generatePractice: (r: PracticeRequest, signal?: AbortSignal) => api.post<PracticeResult>("learn/practice/generate", r, { slow: true, signal }),
  /** Writes the questions a library set is missing. */
  topUpPractice: (setId: string, signal?: AbortSignal) => api.post<PracticeResult>("learn/practice/generate", { setId }, { slow: true, signal }),
  practiceSets: () => api.get<PracticeSetSummary[]>("learn/practice"),
  practiceSet: (id: string) => api.get<PracticeSet>(`learn/practice/${id}`),
  deletePracticeSet: (id: string) => api.del(`learn/practice/${id}`),
  /** Grades one run through a set; the server keeps the record adaptive sets read. */
  submitAttempt: (setId: string, answers: { chosenIndex: number | null; seconds: number }[]) =>
    api.post<AttemptResult>(`learn/practice/${setId}/attempts`, { answers }),
  progress: () => api.get<SubjectProgress[]>("learn/progress"),

  superNotes: (q: { board: string; grade: string; subject: string; chapterNumber: number; language: string }) =>
    api.get<SuperNotesEntry[]>("learn/super-notes", { query: q }),
  async superNote(id: string): Promise<SuperNotes> {
    return (await api.get<{ superNotes: SuperNotes }>(`learn/super-notes/${id}`)).superNotes;
  },

  exams: () => api.get<ExamOption[]>("learn/exams"),
  /** Assembles a timed paper (one of the month's mocks) and starts its clock. */
  startMock: (r: { pattern: string; kind: string; board?: string | null; grade?: string | null; subject?: string | null }) => api.post<MockPaper>("learn/mocks", r),
  mocks: () => api.get<MockSummary[]>("learn/mocks"),
  mock: (id: string) => api.get<MockPaper>(`learn/mocks/${id}`),
  submitMock: (id: string, responses: MockResponse[]) => api.post<MockPaper>(`learn/mocks/${id}/submit`, { responses }),

  /** The library's map for exactly this request, copied to the student; on a miss, the closest map there is. */
  async libraryMindMap(r: MindMapRequest): Promise<{ mindMapId: string | null; closest: ClosestMindMap | null }> {
    const root = await api.post<{ mindMap?: { _id: string } | null; closest?: ClosestMindMap | null }>("learn/mind-maps/library", r);
    return { mindMapId: root.mindMap?._id ?? null, closest: root.closest ?? null };
  },
  mindMapNextLevel: (r: MindMapRequest) => api.post<NextLevel>("learn/mind-maps/next-level", r),
  /** A fresh map (another student's version when one is ready); resolves to its id. */
  async generateMindMap(r: MindMapRequest, signal?: AbortSignal): Promise<string> {
    return (await api.post<{ mindMap: { _id: string } }>("learn/mind-maps/generate", r, { slow: true, signal })).mindMap._id;
  },
  mindMaps: () => api.get<MindMapSummary[]>("learn/mind-maps"),
  async mindMap(id: string): Promise<MindMapDetail> {
    const m = await api.get<{ _id: string; title?: string; subject?: string; board?: string; grade?: string; nodeCount?: number; rootNode: RawNode }>(`learn/mind-maps/${id}`);
    return {
      id: m._id,
      title: m.title ?? "",
      subject: (m.subject ?? "").replace(/_/g, " "),
      board: m.board ?? "",
      grade: m.grade ?? "",
      nodeCount: m.nodeCount ?? 0,
      root: toNode(m.rootNode),
    };
  },
  deleteMindMap: (id: string) => api.del(`learn/mind-maps/${id}`),

  corpusScope: async () => (await api.get<{ scope?: CorpusScopeEntry[] }>("corpus/scope")).scope ?? [],
  corpusChapters: async (q: { board: string; grade: string; subject: string; language: string }) =>
    ((await api.get<{ chapters?: CorpusChapter[] }>("corpus/chapters", { query: q })).chapters ?? []).sort((a, b) => a.chapterNumber - b.chapterNumber),
};
