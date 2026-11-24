// A short message at the bottom of the screen ("Fresh practice set ready", an error that needs no dialog).

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tone = "info" | "error" | "success";
const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: Tone = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="none" className="absolute left-4 right-4 items-center" style={{ bottom: insets.bottom + 90 }}>
          <View
            className={`rounded-xl border px-4 py-3 ${
              toast.tone === "error" ? "border-danger/50 bg-[#2A1215]" : toast.tone === "success" ? "border-success/50 bg-[#0E2A20]" : "border-edge bg-card"
            }`}
          >
            <Text className="text-sm text-ink">{toast.message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
