// The fire pill: the visit streak, opening this month's calendar with the streak's days lit.

import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { streaks, todayInIndia, useStreak } from "@/services/streak";
import { Sheet } from "./ui";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export function StreakPill() {
  const streak = useStreak();
  const [open, setOpen] = useState(false);

  // A visit on showing, and again when the app comes back to the front on a later day.
  useEffect(() => {
    void streaks.visit();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void streaks.visit();
    });
    return () => sub.remove();
  }, []);

  const current = streak?.current ?? 0;
  return (
    <>
      <Pressable
        onPress={() => streak && setOpen(true)}
        accessibilityLabel={streak ? `${days(current)} streak` : "Streak"}
        className="h-9 flex-row items-center rounded-full border border-edge bg-card px-3.5 active:opacity-80"
      >
        <Ionicons name="flame" size={18} color={current > 0 ? "#FF8A3D" : "#5E6985"} />
        <Text className="ml-1.5 text-sm font-semibold text-ink">{current}</Text>
      </Pressable>
      {streak && (
        <Sheet visible={open} onClose={() => setOpen(false)}>
          <Calendar />
        </Sheet>
      )}
    </>
  );
}

function Calendar() {
  const streak = useStreak()!;
  const [y, m] = (streak.today || todayInIndia()).split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // Monday-first grid.
  const lead = (first.getUTCDay() + 6) % 7;
  const iso = (d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const visited = new Set(streak.monthDays);
  const inStreak = new Set(streak.streakDays);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <View className="items-center">
      <Ionicons name="flame" size={44} color={streak.current > 0 ? "#FF8A3D" : "#5E6985"} />
      <Text className="mt-1 text-xl font-bold text-ink">{days(streak.current)} streak</Text>
      <Text className="text-sm text-ink-muted">Longest: {days(streak.longest)}</Text>
      <Text className="mb-2 mt-4 text-base font-semibold text-ink">
        {MONTHS[m - 1]} {y}
      </Text>
      <View className="w-full flex-row">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <Text key={i} className="flex-1 text-center text-xs text-ink-label">
            {d}
          </Text>
        ))}
      </View>
      <View className="mt-1 w-full flex-row flex-wrap">
        {cells.map((d, i) => {
          const date = d ? iso(d) : "";
          const lit = d !== null && inStreak.has(date);
          const seen = d !== null && visited.has(date);
          const today = date === streak.today;
          return (
            <View key={i} style={{ width: `${100 / 7}%` }} className="aspect-square items-center justify-center p-0.5">
              {d !== null && (
                <View
                  className={`h-full w-full items-center justify-center rounded-lg ${lit ? "bg-[#FF8A3D]" : seen ? "bg-[#FF8A3D]/30" : ""} ${today ? "border border-ink" : ""}`}
                >
                  <Text className={`text-sm ${lit ? "font-bold text-page" : "text-ink-muted"}`}>{d}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Text className="mt-4 text-center text-xs leading-5 text-ink-muted">
        A day counts when you open PlayableCraft, in the app or on the web. Sundays never break a streak.
      </Text>
    </View>
  );
}
