// The signed-in student. Sign-in is POST student/login (or google/login); "keep me signed in" is remembered in
// secure storage, and on the next launch the refresh cookie is rotated (POST refresh) and the student read back
// (GET me). The access token itself is never stored. A refresh that fails ends the session (api.ts).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api, refreshSession, setAccessToken, setSessionExpiredHandler } from "./api";
import { queryClient } from "./query";

export interface Student {
  id: string;
  role: string;
  name: string;
  email: string;
}

interface LoginReply extends Student {
  accessToken: string;
}

type Status = "loading" | "signedOut" | "signedIn";

interface SessionValue {
  status: Status;
  student: Student | null;
  signIn: (email: string, password: string, keep: boolean) => Promise<void>;
  /** Google sign-in: a Firebase ID token for an existing account whose email is verified (server: google/login). */
  signInWithGoogle: (idToken: string, keep: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

const KEEP_KEY = "pc.keepSignedIn";

// Secure storage is native only; in the browser the choice lives for the tab, which is what a shared
// computer needs anyway.
const keepStore = {
  async get(): Promise<boolean> {
    if (Platform.OS === "web") return false;
    try {
      return (await SecureStore.getItemAsync(KEEP_KEY)) === "1";
    } catch {
      return false;
    }
  },
  async set(keep: boolean): Promise<void> {
    if (Platform.OS === "web") return;
    try {
      if (keep) await SecureStore.setItemAsync(KEEP_KEY, "1");
      else await SecureStore.deleteItemAsync(KEEP_KEY);
    } catch {
      // Not remembering only means signing in again next time.
    }
  },
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [student, setStudent] = useState<Student | null>(null);

  const end = useCallback(() => {
    setAccessToken(null);
    setStudent(null);
    setStatus("signedOut");
    queryClient.clear();
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(end);
    return () => setSessionExpiredHandler(null);
  }, [end]);

  // A kept session comes back through the refresh cookie.
  useEffect(() => {
    (async () => {
      if ((await keepStore.get()) && (await refreshSession())) {
        try {
          const me = await api.get<Student>("me");
          if (me.role === "STUDENT") {
            setStudent(me);
            setStatus("signedIn");
            return;
          }
        } catch {
          // Fall through to sign-in.
        }
      }
      setAccessToken(null);
      setStatus("signedOut");
    })();
  }, []);

  const accept = useCallback(async (reply: LoginReply, keep: boolean) => {
    if (reply.role !== "STUDENT") throw new Error("This app is for students. Teachers and tutors use the PlayableCraft app.");
    setAccessToken(reply.accessToken);
    await keepStore.set(keep);
    setStudent({ id: reply.id, role: reply.role, name: reply.name, email: reply.email });
    setStatus("signedIn");
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, keep: boolean) => {
      const reply = await api.post<LoginReply>("student/login", { email: email.trim().toLowerCase(), password }, { auth: false });
      await accept(reply, keep);
    },
    [accept],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string, keep: boolean) => {
      const reply = await api.post<LoginReply>("google/login", { idToken, role: "STUDENT" }, { auth: false });
      await accept(reply, keep);
    },
    [accept],
  );

  const signOut = useCallback(async () => {
    try {
      await api.post("logout");
    } catch {
      // Signing out locally is what matters; the server revokes the token when it can.
    }
    await keepStore.set(false);
    end();
  }, [end]);

  const value = useMemo(
    () => ({ status, student, signIn, signInWithGoogle, signOut }),
    [status, student, signIn, signInWithGoogle, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}
