// The whole HTTP layer (the Android app's ApiClient, in TypeScript). Paths are relative to API_URL with no leading
// slash. Most endpoints reply { success, data } and `data` is returned; a bare body is returned as-is.
//
// The access token lives in memory only. The refresh token is the server's httpOnly cookie, kept and sent by the
// platform's own cookie store (native fetch on Android and iOS, the browser on web). A 401 on an authenticated
// call triggers one refresh, shared by every request waiting on it, and one retry; if that fails the session ends.

import { API_URL } from "./config";

/** An error whose message is safe to show the student. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }

  /** The server refused for want of a live plan (402 with planRequired). */
  get planRequired(): boolean {
    return this.status === 402 || this.details?.planRequired === true;
  }
}

const TIMEOUT_MS = 30_000;
/** Generation endpoints run a model and can take a while. */
const SLOW_TIMEOUT_MS = 180_000;

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshing: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Called once a refresh has failed: the session is over and the app returns to sign-in. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** False for sign-in and other calls made before there is a session. */
  auth?: boolean;
  /** A model runs behind it: 3 minutes instead of 30 seconds. */
  slow?: boolean;
  /** Cancels the request (a stopped generation): the server abandons the run and refunds it. */
  signal?: AbortSignal;
}

function urlFor(path: string, query?: RequestOptions["query"]): string {
  const url = API_URL + path;
  const params = Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (params.length === 0) return url;
  return `${url}?${params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`;
}

async function send(method: string, path: string, opts: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.slow ? SLOW_TIMEOUT_MS : TIMEOUT_MS);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    return await fetch(urlFor(path, opts.query), {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(opts.auth !== false && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    if (controller.signal.aborted) throw new ApiError("The server took too long to answer. Please try again.", 0);
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorFrom(res: Response, body: unknown): ApiError {
  const b = body as { message?: string; error?: { message?: string; code?: string; details?: Record<string, unknown> } } | null;
  if (res.status >= 500) return new ApiError("The server had a problem. Please try again.", res.status);
  return new ApiError(
    b?.error?.message ?? b?.message ?? "Something went wrong. Please try again.",
    res.status,
    b?.error?.code,
    b?.error?.details,
  );
}

/** Rotates the refresh cookie for a new access token. Shared by every request that hit a 401 at once. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await send("POST", "refresh", { body: {}, auth: false });
      if (!res.ok) return false;
      const body = (await readBody(res)) as { data?: { accessToken?: string } } | null;
      const token = body?.data?.accessToken;
      if (!token) return false;
      setAccessToken(token);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(method, path, opts);
  if (res.status === 401 && opts.auth !== false) {
    if (await refreshSession()) {
      res = await send(method, path, opts);
    } else {
      setAccessToken(null);
      onSessionExpired?.();
      throw new ApiError("Your session has ended. Please sign in again.", 401);
    }
  }
  const body = await readBody(res);
  if (!res.ok) throw errorFrom(res, body);
  const env = body as { success?: boolean; data?: unknown } | null;
  return (env && typeof env === "object" && "success" in env && "data" in env ? env.data : body) as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, { ...opts, body: body ?? {} }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, { ...opts, body: body ?? {} }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, { ...opts, body: body ?? {} }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, opts),
};

/** The message to show for any error. */
export function messageOf(err: unknown, fallback = "Something went wrong. Please try again."): string {
  return err instanceof ApiError || err instanceof Error ? err.message || fallback : fallback;
}
