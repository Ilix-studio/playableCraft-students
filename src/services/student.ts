// The student's delivered content and classes (GET reposts/feed, passkeys/mine, POST passkeys/join, DELETE
// passkeys/entitlements/:id), mapped as the Android app's StudentRepository maps them. Paying a class's access fee
// is not offered in the app; it happens on the website.

import { api } from "@/lib/api";
import type { MindMapNode, QuizQuestion, SimulationDetail, SimulationVariable, StoryAct, SuperNotes } from "@/lib/types";

export type DeliveryType = "simulation" | "mcq" | "storyline" | "mindMap" | "superNotes" | "lessonPlan";

export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  simulation: "Simulation",
  mcq: "MCQ Set",
  storyline: "StoryLine",
  mindMap: "Mind Map",
  superNotes: "Super Notes",
  lessonPlan: "Lesson Plan",
};

/** The kinds a student is sent now; lesson plans reach students only as their Super Notes. */
export const FEED_TYPES: DeliveryType[] = ["simulation", "mcq", "storyline", "mindMap", "superNotes"];

export type DeliveredContent =
  | { type: "simulation"; simulation: SimulationDetail }
  | { type: "mcq"; title: string; subject: string; questions: QuizQuestion[]; secondsPerQuestion: number | null }
  | { type: "storyline"; title: string; subject: string; grade: string; acts: StoryAct[] }
  | { type: "mindMap"; title: string; subject: string; grade: string; board: string; nodeCount: number; root: MindMapNode }
  | { type: "superNotes"; notes: SuperNotes };

export interface FeedItem {
  id: string;
  type: DeliveryType;
  title: string;
  note: string | null;
  releaseAt: string;
  subtitle: string;
  content: DeliveredContent | null;
}

export interface Enrollment {
  id: string;
  codeLabel: string;
  batchName: string;
  status: string;
  paidThrough: string | null;
  platformFeeINR: number | null;
}

type Json = Record<string, unknown>;
const str = (o: Json | undefined, k: string): string | undefined => (typeof o?.[k] === "string" ? (o[k] as string) : undefined);
const num = (o: Json | undefined, k: string): number | undefined => (typeof o?.[k] === "number" ? (o[k] as number) : undefined);
const obj = (o: Json | undefined, k: string): Json | undefined =>
  o?.[k] && typeof o[k] === "object" && !Array.isArray(o[k]) ? (o[k] as Json) : undefined;
const arr = (o: Json | undefined, k: string): Json[] => (Array.isArray(o?.[k]) ? (o[k] as Json[]) : []);

const paidUp = (e: Enrollment) => Boolean(e.paidThrough && new Date(e.paidThrough).getTime() > Date.now());
/** Content from this class reaches the feed. */
export const isActive = (e: Enrollment) => e.status === "ACTIVE" && paidUp(e);
/** Joined but not paid, or paid access that has lapsed (the website's rule). */
export const needsPayment = (e: Enrollment) => e.status !== "REVOKED" && e.status !== "EXPIRED" && (e.status !== "ACTIVE" || !paidUp(e));

function toEnrollment(o: Json): Enrollment {
  const code = obj(o, "batchPasskeyId");
  const batch = obj(o, "batchPeriodId");
  return {
    id: str(o, "_id") ?? "",
    codeLabel: str(code, "label") || str(code, "code") || "Class",
    batchName: str(batch, "name") ?? "",
    status: str(o, "status") ?? "GENERATED",
    paidThrough: str(o, "paidThrough") ?? null,
    platformFeeINR: num(o, "platformFeeINR") ?? null,
  };
}

function toNode(o: Json): MindMapNode {
  return {
    id: str(o, "id") ?? "",
    label: str(o, "label") ?? "",
    detail: str(o, "detail"),
    children: arr(o, "children").map(toNode),
  };
}

function toVariable(o: Json): SimulationVariable | null {
  const name = str(o, "name");
  if (!name) return null;
  const min = num(o, "min") ?? 0;
  const rawMax = num(o, "max") ?? 100;
  const max = rawMax > min ? rawMax : min + 1;
  return { name, label: str(o, "label") || name, min, max, default: Math.min(max, Math.max(min, num(o, "default") ?? min)), unit: str(o, "unit") ?? "" };
}

function toContent(type: DeliveryType, ref: Json): DeliveredContent | null {
  switch (type) {
    case "simulation": {
      const code = str(ref, "code");
      if (!code) return null;
      return {
        type,
        simulation: {
          id: str(ref, "_id") ?? "",
          title: str(ref, "label") ?? str(ref, "topic") ?? "Simulation",
          subject: str(ref, "subject") ?? "",
          topic: str(ref, "topic") ?? "",
          code,
          runtime: str(ref, "library") ?? "p5-shim",
          bioZoom: ref.bioZoom === true,
          variables: arr(ref, "variables").map(toVariable).filter((v): v is SimulationVariable => v !== null),
          physicsNotes: str(ref, "physicsNotes") ?? "",
        },
      };
    }
    case "mcq": {
      const questions = arr(ref, "questions").flatMap((q): QuizQuestion[] => {
        const options = Array.isArray(q.options) ? (q.options as unknown[]).filter((x): x is string => typeof x === "string") : [];
        const correct = num(q, "correctIndex");
        return correct !== undefined && correct >= 0 && correct < options.length
          ? [{ question: str(q, "question") ?? "", options, correctIndex: correct, explanation: str(q, "explanation") || null }]
          : [];
      });
      const timer = obj(ref, "timer");
      const seconds = timer?.enabled === true ? num(timer, "secondsPerQuestion") : undefined;
      return { type, title: str(ref, "title") ?? "", subject: str(ref, "subject") ?? "", questions, secondsPerQuestion: seconds && seconds > 0 ? seconds : null };
    }
    case "superNotes": {
      const notes = obj(ref, "superNotes");
      return notes ? { type, notes: notes as unknown as SuperNotes } : null;
    }
    case "mindMap": {
      const root = obj(ref, "rootNode");
      return root
        ? {
            type,
            title: str(ref, "title") ?? "",
            subject: (str(ref, "subject") ?? "").replace(/_/g, " "),
            grade: str(ref, "grade") ?? "",
            board: str(ref, "board") ?? "",
            nodeCount: num(ref, "nodeCount") ?? 0,
            root: toNode(root),
          }
        : null;
    }
    case "storyline":
      return {
        type,
        title: str(ref, "topic") ?? "",
        subject: str(ref, "subject") ?? "",
        grade: str(ref, "grade") ?? "",
        acts: arr(ref, "acts").map((a, i) => ({
          actNumber: num(a, "actNumber") ?? i + 1,
          title: str(a, "title") ?? "",
          synopsis: str(a, "synopsis") ?? "",
          script: str(a, "script") ?? "",
          conceptFocus: str(a, "conceptFocus") ?? "",
          microExplanation: str(a, "microExplanation") ?? "",
          imageUrl: str(a, "imageUrl") || null,
        })),
      };
    default:
      return null;
  }
}

function subtitleFor(type: DeliveryType, ref: Json): string {
  const parts =
    type === "simulation"
      ? [str(ref, "subject"), str(ref, "topic")]
      : type === "mcq"
        ? [str(ref, "subject"), num(ref, "questionCount") !== undefined ? `${num(ref, "questionCount")} Q` : undefined]
        : [str(ref, "subject"), str(ref, "grade")];
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(" · ");
}

function toFeedItem(o: Json): FeedItem | null {
  const id = str(o, "_id");
  if (!id) return null;
  const rawType = str(o, "contentType");
  // Legacy deliveries (before content types) are simulations, carried in `simulationId`.
  const type = (FEED_TYPES as string[]).includes(rawType ?? "") || rawType === "lessonPlan" ? (rawType as DeliveryType) : "simulation";
  const ref = obj(o, "contentId") ?? (rawType ? undefined : obj(o, "simulationId"));
  let content: DeliveredContent | null = null;
  try {
    content = ref ? toContent(type, ref) : null;
  } catch {
    content = null;
  }
  return {
    id,
    type,
    title: str(o, "title") || str(ref, "label") || str(ref, "topic") || str(ref, "title") || "Untitled",
    note: str(o, "note") || null,
    releaseAt: str(o, "releaseAt") ?? "",
    subtitle: ref ? subtitleFor(type, ref) : "",
    content,
  };
}

/** The last feed loaded, so a viewer opened from Home does not fetch it again. */
let lastFeed: FeedItem[] = [];

export const studentService = {
  async feed(): Promise<FeedItem[]> {
    const root = await api.get<{ reposts?: Json[] }>("reposts/feed");
    lastFeed = (root.reposts ?? []).map(toFeedItem).filter((x): x is FeedItem => x !== null);
    return lastFeed;
  },
  cachedFeedItem: (id: string) => lastFeed.find((i) => i.id === id) ?? null,
  async enrollments(): Promise<Enrollment[]> {
    const root = await api.get<{ entitlements?: Json[] }>("passkeys/mine");
    return (root.entitlements ?? []).map(toEnrollment);
  },
  async join(code: string): Promise<Enrollment> {
    const created = await api.post<Json>("passkeys/join", { code: code.trim().toUpperCase() });
    // The join reply is not populated; read the class back so it has its batch name.
    const id = str(created, "_id");
    return (await studentService.enrollments()).find((e) => e.id === id) ?? toEnrollment(created);
  },
  /** Refused by the server for a revoked class (removing it would undo the revoke). */
  leave: (id: string) => api.del(`passkeys/entitlements/${id}`),
};
