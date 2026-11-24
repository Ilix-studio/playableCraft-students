// Display formatting shared by every screen.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "24 Nov 2026" from an ISO date; empty for none. Locale-free, so it reads the same on every device. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "1m 20s" / "45s". */
export function formatSeconds(s: number): string {
  const n = Math.max(0, Math.round(s));
  return n >= 60 ? `${Math.floor(n / 60)}m ${n % 60}s` : `${n}s`;
}

/** "02:05" or "1:02:05", for countdowns. */
export function formatClock(s: number): string {
  const n = Math.max(0, Math.floor(s));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(n % 60)}` : `${pad(m)}:${pad(n % 60)}`;
}

export const percent = (x: number) => `${Math.round(x * 100)}%`;

/** "Class 12" from "12" or "Class 12" (grades are stored both ways). */
export const classLabel = (grade: string) => (!grade ? "" : /^class\b/i.test(grade.trim()) ? grade.trim() : `Class ${grade.trim()}`);
