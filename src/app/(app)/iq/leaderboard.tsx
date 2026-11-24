// The IQ leaderboard (web: IqLeaderboard; Android: LeaderboardScreen): this cycle's or a past one's, for the
// student's grade or their school, 25 a page, with their own rank above it.

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, EmptyBox, ErrorBox, Loading, PageHeader, Pill, Select } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatMs, formatScore, iqService } from "@/services/iq";

const PAGE_SIZE = 25;

export default function Leaderboard() {
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<"grade" | "provider">("grade");
  const [cycleIndex, setCycleIndex] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const cycle = useQuery({ queryKey: ["iq", "cycle"], queryFn: iqService.cycle });
  const history = useQuery({ queryKey: ["iq", "history"], queryFn: iqService.history });
  const providers = cycle.data?.providers ?? [];
  // The school tab only exists for a student in a class.
  const effectiveScope = providers.length === 0 ? "grade" : scope;
  const board = useQuery({
    queryKey: ["iq", "board", effectiveScope, cycleIndex, page],
    enabled: cycle.isFetched,
    queryFn: () =>
      iqService.leaderboard({ cycleIndex, scope: effectiveScope, providerId: effectiveScope === "provider" ? providers[0]?.providerId : null, page, limit: PAGE_SIZE }),
  });
  const mine = useQuery({ queryKey: ["iq", "me", cycleIndex], queryFn: () => iqService.myRank(cycleIndex) });
  const cycles = [...new Set((history.data?.attempts ?? []).map((a) => a.cycleIndex))].sort((a, b) => b - a);
  const totalPages = board.data ? Math.max(1, Math.ceil(board.data.total / Math.max(1, board.data.limit))) : 1;
  const me = mine.data?.grade;

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <PageHeader title="Leaderboard" subtitle={board.data ? `Cycle ${board.data.cycleIndex}` : null} back />
      {cycles.length > 0 && (
        <Select
          label="Cycle"
          value={cycleIndex ?? -1}
          options={[{ value: -1, label: "Current cycle" }, ...cycles.map((c) => ({ value: c, label: `Cycle ${c}` }))]}
          onChange={(v) => {
            setCycleIndex(v === -1 ? null : v);
            setPage(1);
          }}
        />
      )}
      {cycle.data && !cycle.data.grade && (
        <Text className="mb-3 text-[13px] leading-5 text-warning">
          You’re ranking on the Unassigned board. Join your class with a batch code to compete with your classmates.
        </Text>
      )}
      {providers.length > 0 && (
        <View className="mb-3 flex-row gap-2">
          <Pill label={board.data?.grade ?? "Unassigned"} selected={effectiveScope === "grade"} onPress={() => (setScope("grade"), setPage(1))} />
          <Pill label="My school" selected={effectiveScope === "provider"} onPress={() => (setScope("provider"), setPage(1))} />
        </View>
      )}
      {me && (
        <Card className="mb-3 flex-row">
          <View className="flex-1">
            <Text className="text-xs text-ink-muted">Your rank</Text>
            <Text className="text-[22px] font-bold text-ink">
              #{me.rank} of {me.total}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-ink-muted">Score</Text>
            <Text className="text-[22px] font-bold text-ink">{formatScore(me.score)}</Text>
          </View>
        </Card>
      )}
      {board.isLoading || !cycle.isFetched ? (
        <Loading />
      ) : board.isError ? (
        <ErrorBox title="Unable to load the leaderboard" message={messageOf(board.error)} onRetry={() => void board.refetch()} />
      ) : (board.data?.rows ?? []).length === 0 ? (
        <EmptyBox icon="trophy-outline" message="No one has submitted this cycle's test yet." />
      ) : (
        <>
          {board.data!.rows.map((row) => {
            const medal = row.rank === 1 ? "bg-[#F5B942]/25 text-[#F5B942]" : row.rank === 2 ? "bg-[#C0C7D6]/25 text-[#C0C7D6]" : row.rank === 3 ? "bg-[#D08A52]/25 text-[#D08A52]" : "bg-tag text-tag-text";
            return (
              <View key={row.attemptId} className={`mb-2 flex-row items-center rounded-xl border p-3 ${row.isMe ? "border-primary bg-primary/10" : "border-edge bg-card"}`}>
                <Text className={`h-[34px] w-[34px] overflow-hidden rounded-lg text-center text-[13px] font-bold leading-[34px] ${medal}`}>{row.rank}</Text>
                <View className="ml-3 flex-1">
                  <Text className={`text-[14.5px] text-ink ${row.isMe ? "font-semibold" : ""}`} numberOfLines={1}>
                    {row.name}
                    {row.isMe ? " (you)" : ""}
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    {row.correctCount} correct · ×{row.multiplier.toFixed(2)} · {formatMs(row.activeMs)}
                  </Text>
                </View>
                <Text className="text-base font-bold text-ink">{formatScore(row.score)}</Text>
              </View>
            );
          })}
          {totalPages > 1 && (
            <View className="mt-2 flex-row items-center justify-between">
              <Button title="Prev" variant="ghost" icon="chevron-back" disabled={page <= 1} onPress={() => setPage(page - 1)} />
              <Text className="text-[13px] text-ink-muted">
                Page {page} of {totalPages}
              </Text>
              <Button title="Next" variant="ghost" icon="chevron-forward" disabled={page >= totalPages} onPress={() => setPage(page + 1)} />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
