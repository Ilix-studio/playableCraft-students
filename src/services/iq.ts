// The student IQ test and leaderboard (/api/iq). One attempt per cycle. IqSession is the timing and telemetry
// ledger the server scores on (the website's useIqSession.ts, the Android app's IqSession), so its rules match:
//
// - Durations come from a monotonic clock (performance.now), in ms since this sitting started; the server rejects
//   a batch whose clientAtMs goes backwards.
// - A resumed attempt is a new sitting with a new sessionId; seq continues from the server's lastSeq, and every
//   flush or submit uses a fresh, higher seq (the server ignores a seq it has already seen).
// - Time with the app in the background is not thinking time: hide() closes the question's dwell segment.

import { api } from "@/lib/api";

export interface IqCycleInfo {
  cycle: { cycleIndex: number; startDate?: string; endDate?: string; daysRemaining: number; status: string; questionCount: number } | null;
  attempt: { status: string; attemptId?: string; answeredCount?: number; score?: number };
  /** Null when the student is in no class and ranks on the Unassigned board. */
  grade: string | null;
  providers?: { providerId: string; providerKind: string }[];
  message?: string;
}

export interface IqQuestion {
  index: number;
  prompt: string;
  options: string[];
  category?: string;
  difficulty?: string;
  retired?: boolean;
}

export interface IqStart {
  status?: string;
  ready: boolean;
  resumed?: boolean;
  attemptId?: string;
  cycleIndex?: number;
  lastSeq?: number;
  questions?: IqQuestion[];
  answers?: { questionIndex: number; selectedIndex: number | null; changeCount: number }[];
  retryAfterMs?: number;
}

interface IqEvent {
  kind: string;
  fromIndex?: number;
  toIndex?: number;
  optionIndex?: number;
  prevOption?: number | null;
  clientAtMs: number;
  dwellMs?: number;
}

export interface IqProgress {
  seq: number;
  sessionId: string;
  clientElapsedMs: number;
  events: IqEvent[];
}

export interface IqResult {
  attemptId: string;
  scoring: {
    base: number;
    speedFactor: number;
    changePenalty: number;
    thrashPenalty: number;
    multiplier: number;
    score: number;
    correctCount: number;
    scoredQuestionCount: number;
    medianAnswerMs: number;
    suspicious: boolean;
  };
  grade: string | null;
  navCounts: { backward: number };
  changeTotal: number;
  rank: { rank: number; total: number; score: number };
  review: {
    index: number;
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    selectedIndex: number | null;
    isCorrect: boolean;
    timeToFirstAnswerMs: number;
    changeCount: number;
  }[];
}

export interface IqBoard {
  scope: string;
  cycleIndex: number;
  grade: string | null;
  rows: { rank: number; attemptId: string; name: string; score: number; correctCount: number; multiplier: number; activeMs: number; isMe: boolean }[];
  total: number;
  page: number;
  limit: number;
}

export interface IqMyRank {
  grade: { rank: number; total: number; score: number; gradeLabel?: string } | null;
}

export const iqService = {
  cycle: () => api.get<IqCycleInfo>("iq/cycle"),
  /** Starts or resumes this cycle's attempt; a resume returns the saved answers. */
  start: () => api.post<IqStart>("iq/attempts/start"),
  flush: (attemptId: string, p: IqProgress) => api.post(`iq/attempts/${attemptId}/progress`, p),
  submit: (attemptId: string, p: IqProgress) => api.post<IqResult>(`iq/attempts/${attemptId}/submit`, p, { slow: true }),
  report: (attemptId: string, questionIndex: number, reason: string) => api.post(`iq/attempts/${attemptId}/report`, { questionIndex, reason: reason.trim() }),
  /** `providerId` only with scope "provider". */
  leaderboard: (q: { cycleIndex?: number | null; scope: string; providerId?: string | null; page: number; limit: number }) =>
    api.get<IqBoard>("iq/leaderboard", { query: q }),
  myRank: (cycleIndex?: number | null) => api.get<IqMyRank>("iq/leaderboard/me", { query: { cycleIndex } }),
  history: () => api.get<{ attempts: { cycleIndex: number }[] }>("iq/attempts/me"),
};

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class IqSession {
  readonly sessionId = uuid();
  readonly answers: (number | null)[];
  currentIndex = 0;
  submitted = false;
  private readonly t0 = now();
  private enteredAt = this.t0;
  private hiddenAt: number | null = null;
  private nextSeq: number;
  private pending: IqEvent[] = [];

  constructor(
    private readonly total: number,
    initialAnswers: (number | null)[],
    startSeq: number,
  ) {
    this.answers = Array.from({ length: total }, (_, i) => initialAnswers[i] ?? null);
    this.nextSeq = startSeq + 1;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  elapsedMs(): number {
    return Math.round(now() - this.t0);
  }

  private closeSegment(): number {
    const t = now();
    const dwell = Math.max(0, Math.round(t - this.enteredAt));
    this.enteredAt = t;
    return dwell;
  }

  /** NEXT / PREV / JUMP. False when the move is a no-op. */
  move(kind: "NEXT" | "PREV" | "JUMP", target: number): boolean {
    if (this.submitted || target === this.currentIndex || target < 0 || target >= this.total) return false;
    const dwell = this.closeSegment();
    this.pending.push({ kind, fromIndex: this.currentIndex, toIndex: target, clientAtMs: this.elapsedMs(), dwellMs: dwell });
    this.currentIndex = target;
    return true;
  }

  /** ANSWER on a first pick, CHANGE after; re-picking the same option is a no-op. Nothing is revealed. */
  select(option: number): boolean {
    if (this.submitted) return false;
    const qi = this.currentIndex;
    const prev = this.answers[qi];
    if (prev === option) return false;
    // dwellMs on an answer is time on the question so far: the server's timeToFirstAnswerMs.
    const sinceEntered = Math.max(0, Math.round(now() - this.enteredAt));
    this.answers[qi] = option;
    this.pending.push({ kind: prev === null ? "ANSWER" : "CHANGE", toIndex: qi, optionIndex: option, prevOption: prev, clientAtMs: this.elapsedMs(), dwellMs: sinceEntered });
    return true;
  }

  /** The app went to the background. */
  hide(): void {
    if (this.submitted || this.hiddenAt !== null) return;
    const dwell = this.closeSegment();
    this.pending.push({ kind: "BLUR", fromIndex: this.currentIndex, clientAtMs: this.elapsedMs(), dwellMs: dwell });
    this.hiddenAt = now();
  }

  /** The app came back; dwellMs on FOCUS carries how long it was hidden. */
  show(): void {
    if (this.hiddenAt === null || this.submitted) return;
    const hiddenFor = Math.max(0, Math.round(now() - this.hiddenAt));
    this.hiddenAt = null;
    this.enteredAt = now();
    this.pending.push({ kind: "FOCUS", toIndex: this.currentIndex, clientAtMs: this.elapsedMs(), dwellMs: hiddenFor });
  }

  /** The pending events for a checkpoint, or null when there is nothing to send. */
  takeBatch(): IqProgress | null {
    if (this.submitted || this.pending.length === 0) return null;
    const events = this.pending;
    this.pending = [];
    return { seq: this.nextSeq++, sessionId: this.sessionId, clientElapsedMs: this.elapsedMs(), events };
  }

  /** A failed checkpoint's events go back in front, to be retried under the next seq. */
  restore(batch: IqProgress): void {
    this.pending = [...batch.events, ...this.pending];
  }

  /** Closes the sitting with a SUBMIT event and returns the final payload. Later input is ignored. */
  finalize(): IqProgress {
    if (!this.submitted) {
      const dwell = this.closeSegment();
      this.pending.push({ kind: "SUBMIT", fromIndex: this.currentIndex, clientAtMs: this.elapsedMs(), dwellMs: dwell });
      this.submitted = true;
    }
    const events = this.pending;
    this.pending = [];
    return { seq: this.nextSeq++, sessionId: this.sessionId, clientElapsedMs: this.elapsedMs(), events };
  }
}

export const formatScore = (s: number) => (Number.isInteger(s) ? String(s) : s.toFixed(1));
/** "3:07", minutes and seconds of a duration in ms. */
export const formatMs = (ms: number) => {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
