// Mind maps (web: learn/StudentMindMapsPage): one chapter at a chosen detail. "Find in the library" copies the
// library's map for exactly that request (free); on a miss the closest map of that chapter is offered, never
// swapped in. The fresh button gets the student's next level of the request for one of the month's fresh maps:
// another student's version when one is ready, else a new map. It runs on after leaving the page.

import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChapterPicker } from "@/components/ChapterPicker";
import { ListRow } from "@/components/ListRow";
import { PlanNotice } from "@/components/PlanNotice";
import { Button, Card, colors, InlineError, Loading, PageHeader, SectionLabel, Select, Tag } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cancelRun, isRunning, startRun, useRunOutcome, useRuns } from "@/lib/runs";
import { freshTitle, learnService, left, LEVELS_NOTE, livePlan, type ClosestMindMap } from "@/services/learn";

const DEPTHS: [number, string][] = [
  [3, "Short (3 layers)"],
  [4, "Standard (4 layers)"],
  [5, "Detailed (5 layers)"],
];

export default function MindMaps() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  useRuns();
  const running = isRunning("mindMap");
  const plans = useQuery({ queryKey: ["learn", "plans"], queryFn: learnService.plans });
  const maps = useQuery({ queryKey: ["learn", "mind-maps"], queryFn: learnService.mindMaps });
  const plan = livePlan(plans.data);
  const picker = useChapterPicker({ grades: plan?.grades, single: true, disabled: running });
  const [depth, setDepth] = useState(4);
  const [finding, setFinding] = useState(false);
  const [notInLibrary, setNotInLibrary] = useState(false);
  const [closest, setClosest] = useState<ClosestMindMap | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canSubmit = picker.scope !== null && !finding && !running;
  const nextReq = picker.scope ? { ...picker.scope, depth } : null;
  const next = useQuery({
    queryKey: ["learn", "mind-maps", "next-level", nextReq],
    queryFn: () => learnService.mindMapNextLevel(nextReq!),
    enabled: nextReq !== null && !running,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["learn"] });

  useRunOutcome("mindMap", (o) => {
    if (o.route) router.push(o.route as never);
    else setMessage(o.error);
    refresh();
  });

  const find = async (atDepth = depth) => {
    if (!picker.scope || !canSubmit) return;
    setFinding(true);
    setNotInLibrary(false);
    setClosest(null);
    setMessage(null);
    try {
      const r = await learnService.libraryMindMap({ ...picker.scope, depth: atDepth });
      if (r.mindMapId) {
        void qc.invalidateQueries({ queryKey: ["learn", "mind-maps"] });
        router.push({ pathname: "/mind-maps/[id]", params: { id: r.mindMapId } });
      } else {
        setNotInLibrary(true);
        setClosest(r.closest);
      }
    } catch (err) {
      setMessage(messageOf(err, "Couldn't search the library."));
    } finally {
      setFinding(false);
    }
  };

  const makeFresh = () => {
    if (!picker.scope || !canSubmit) return;
    const req = { ...picker.scope, depth };
    setMessage(null);
    startRun("mindMap", async (signal) => `/mind-maps/${await learnService.generateMindMap(req, signal)}`);
  };

  const remove = useMutation({
    mutationFn: learnService.deleteMindMap,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["learn", "mind-maps"] }),
    onError: (err) => setMessage(messageOf(err, "Couldn't remove the mind map.")),
  });
  const freshLeft = left(plans.data, "mindMap");
  const depthName = (d: number) => DEPTHS.find(([v]) => v === d)?.[1].toLowerCase() ?? `${d}-layer`;

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="px-5"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <PageHeader title="Mind Maps" subtitle="See how a chapter's ideas connect, branch by branch." back />
      {plans.isLoading ? (
        <Loading className="py-8" />
      ) : !plan ? (
        <PlanNotice ended={plans.data?.plan != null} />
      ) : (
        <Card className="mb-3">
          {picker.view}
          <Select
            label="Detail"
            value={depth}
            disabled={running}
            options={DEPTHS.map(([v, l]) => ({ value: v, label: l }))}
            onChange={(d) => {
              setDepth(d);
              setNotInLibrary(false);
              setClosest(null);
            }}
          />
          {notInLibrary && (
            <View className="mb-2">
              <Text className="text-xs leading-4 text-warning">
                There is no map for this chapter at this detail in the library yet. A fresh one is added for everyone.
              </Text>
              {closest && (
                <View className="mt-2 rounded-xl border border-edge p-3">
                  <Text className="text-xs leading-4 text-ink-muted">
                    The library does have a {depthName(closest.depth)} map of {closest.chapterNames.join(", ") || "this chapter"} ({closest.nodeCount} ideas), free.
                  </Text>
                  <Button title="Use that one" variant="ghost" onPress={() => find(closest.depth)} className="mt-2 h-9 self-start" />
                </View>
              )}
            </View>
          )}
          <InlineError text={message} />
          <Button title="Find in the library" icon="library-outline" loading={finding} disabled={!canSubmit} onPress={() => find()} className="mt-3" />
          {running ? (
            <View className="mt-2 flex-row items-center">
              <Button title="Stop" variant="ghost" icon="stop" onPress={() => cancelRun("mindMap")} />
              <Text className="ml-3 text-xs text-ink-muted">Building your mind map…</Text>
            </View>
          ) : (
            <Button
              title={freshTitle(next.data, freshLeft, "Make")}
              variant="ghost"
              icon="sparkles-outline"
              disabled={!canSubmit || freshLeft === 0}
              onPress={makeFresh}
              className="mt-2"
            />
          )}
          <Text className="mt-2 text-xs leading-4 text-ink-muted">{LEVELS_NOTE}</Text>
        </Card>
      )}

      <SectionLabel className="mb-2 mt-3">Your mind maps</SectionLabel>
      {(maps.data ?? []).length === 0 ? (
        <Text className="text-[13px] text-ink-muted">Mind maps you make appear here.</Text>
      ) : (
        maps.data!.map((m) => (
          <ListRow
            key={m._id}
            icon="git-network-outline"
            title={m.title}
            meta={[m.subject.replace(/_/g, " "), m.grade, `${m.nodeCount} ideas`, formatDate(m.createdAt)].filter(Boolean).join(" · ")}
            right={m.fromLibrary ? <Tag label="Library" /> : m.level ? <Tag label={`Level ${m.level}`} /> : null}
            onOpen={() => router.push({ pathname: "/mind-maps/[id]", params: { id: m._id } })}
            onDelete={() => remove.mutate(m._id)}
          />
        ))
      )}
    </ScrollView>
  );
}
