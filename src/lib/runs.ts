// Fresh generations that outlive their screen (the Android app's GenerationRuns, the website's generationRuns.ts).
// A screen starts a run here and reads its progress; leaving the screen does not stop it. The result goes to the
// screen if it is open (useRunOutcome), otherwise the shell shows it as a toast with its route. Signing out stops
// every run, which closes its request and has the server refund it.

import { useEffect, useEffectEvent, useSyncExternalStore } from "react";

export type RunKind = "practice" | "mindMap";

export const RUN_LABELS: Record<RunKind, string> = { practice: "Practice set", mindMap: "Mind map" };

export interface RunOutcome {
  kind: RunKind;
  /** Where the result opens; null on failure. */
  route: string | null;
  error: string | null;
}

const running = new Map<RunKind, AbortController>();
const outcomes: RunOutcome[] = [];
/** Open screens of each kind: while one is open, its outcome goes there instead of the shell. */
const watching = new Map<RunKind, number>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function isRunning(kind: RunKind): boolean {
  return running.has(kind);
}

/** Starts `work`, which resolves to the result's route. False if a run of this kind is already going. */
export function startRun(kind: RunKind, work: (signal: AbortSignal) => Promise<string>): boolean {
  if (running.has(kind)) return false;
  const controller = new AbortController();
  running.set(kind, controller);
  emit();
  work(controller.signal)
    .then((route) => {
      if (running.get(kind) === controller) outcomes.push({ kind, route, error: null });
    })
    .catch((err: unknown) => {
      if (running.get(kind) === controller && !controller.signal.aborted) {
        outcomes.push({ kind, route: null, error: err instanceof Error ? err.message : "Generation failed." });
      }
    })
    .finally(() => {
      if (running.get(kind) === controller) running.delete(kind);
      emit();
    });
  return true;
}

export function cancelRun(kind: RunKind): boolean {
  const c = running.get(kind);
  if (!c) return false;
  running.delete(kind);
  c.abort();
  emit();
  return true;
}

export function cancelAllRuns(): void {
  running.forEach((c) => c.abort());
  running.clear();
  outcomes.length = 0;
  emit();
}

/** Re-renders when any run starts, ends or leaves an outcome. */
export function useRuns(): number {
  return useSyncExternalStore(subscribe, () => version);
}

function take(match: (o: RunOutcome) => boolean): RunOutcome | null {
  const i = outcomes.findIndex(match);
  return i < 0 ? null : outcomes.splice(i, 1)[0];
}

/** While mounted, this screen receives `kind`'s outcomes. */
export function useRunOutcome(kind: RunKind, handler: (o: RunOutcome) => void): void {
  const onOutcome = useEffectEvent(handler);
  const v = useRuns();
  useEffect(() => {
    watching.set(kind, (watching.get(kind) ?? 0) + 1);
    return () => {
      watching.set(kind, Math.max(0, (watching.get(kind) ?? 1) - 1));
    };
  }, [kind]);
  useEffect(() => {
    const o = take((x) => x.kind === kind);
    if (o) onOutcome(o);
  }, [kind, v]);
}

/** The shell: outcomes no open screen is watching. */
export function useUnwatchedOutcomes(handler: (o: RunOutcome) => void): void {
  const onOutcome = useEffectEvent(handler);
  const v = useRuns();
  useEffect(() => {
    let o: RunOutcome | null;
    while ((o = take((x) => (watching.get(x.kind) ?? 0) === 0))) onOutcome(o);
  }, [v]);
}
