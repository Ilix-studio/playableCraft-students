// Notifications (/api/notifications): read one, read all. The server has no delete, so dismissing only hides
// an item until the app restarts.

import { api } from "@/lib/api";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

const dismissed = new Set<string>();

export const notificationsService = {
  async list(): Promise<AppNotification[]> {
    const items = await api.get<AppNotification[]>("notifications");
    return (Array.isArray(items) ? items : []).filter((n) => !dismissed.has(n.id));
  },
  markRead: (id: string) => api.post(`notifications/${id}/read`),
  markAllRead: () => api.post("notifications/read-all"),
  dismiss: (id: string) => {
    dismissed.add(id);
  },
};

/** "Just now", "5m ago", "3h ago", "Yesterday", else the date. */
export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const minutes = Math.floor((Date.now() - t) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 60 * 48) return "Yesterday";
  return new Date(iso).toDateString().slice(4);
}
