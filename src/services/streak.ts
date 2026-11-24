// The fire streak (POST streak/visit): counts today, once a day, and returns the streak. Shared by every pill so a
// visit is sent once a day, not on each screen; cleared on sign-out.

import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";

export interface StreakSummary {
  /** Today in India, the clock the server counts by ("2026-11-24"). */
  today: string;
  current: number;
  longest: number;
  visitedToday: boolean;
  /** The current streak's days, oldest first. */
  streakDays: string[];
  /** Every visited day of today's month. */
  monthDays: string[];
}

let summary: StreakSummary | null = null;
let sending = false;
/** Bumped on sign-out, so a reply for the account that just left is dropped. */
let epoch = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Today in India (UTC+5:30), as the server counts streaks. */
export function todayInIndia(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export const streaks = {
  async visit(): Promise<void> {
    if (sending || summary?.today === todayInIndia()) return;
    sending = true;
    const asked = epoch;
    try {
      const s = await api.post<StreakSummary>("streak/visit");
      if (asked === epoch) {
        summary = s;
        emit();
      }
    } catch {
      // The last streak stays; the next visit tries again.
    } finally {
      sending = false;
    }
  },
  clear() {
    epoch += 1;
    summary = null;
    sending = false;
    emit();
  },
};

export function useStreak(): StreakSummary | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => summary,
  );
}
