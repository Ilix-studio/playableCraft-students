// My Plan: the student's own plan (no class code needed) with this month's fresh use, and the plans on offer.
// Plans are bought on the website, signed in with the same account; the app takes no payment.

import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, colors, ErrorBox, Loading, PageHeader, SectionLabel, Tag } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { WEBSITE_URL } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { learnService, tierLabel, type StudentPlanCatalogEntry } from "@/services/learn";

const TRACK_LABEL: Record<string, string> = { BOARD: "Board exam", JEE: "JEE", NEET: "NEET" };

const featuresOf = (p: StudentPlanCatalogEntry) => [
  `${p.grades.join(" and ")} — every subject in the library`,
  `Prepares for: ${p.tracks.map((t) => TRACK_LABEL[t] ?? t).join(", ")}`,
  "Unlimited practice sets and mind maps from the library",
  `${p.quotas.mcq} fresh practice sets and ${p.quotas.mindMap} fresh mind maps a month`,
  `${p.quotas.mock} timed mock papers a month${p.tracks.length > 1 ? ", board and entrance pattern" : ""}`,
  `Up to ${p.questionsPerSet} questions in a set`,
];

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const frac = limit > 0 ? Math.min(1, used / limit) : 0;
  return (
    <View className="mt-3">
      <View className="mb-1 flex-row justify-between">
        <Text className="text-[13px] text-ink-muted">{label}</Text>
        <Text className="text-[13px] text-ink">
          {used} / {limit}
        </Text>
      </View>
      <View className="h-1.5 rounded-full bg-tag">
        <View className={`h-1.5 rounded-full ${frac >= 1 ? "bg-warning" : "bg-primary"}`} style={{ width: `${frac * 100}%` }} />
      </View>
    </View>
  );
}

export default function Plans() {
  const insets = useSafeAreaInsets();
  const plans = useQuery({ queryKey: ["learn", "plans"], queryFn: learnService.plans });
  const p = plans.data;

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="px-5"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={plans.isRefetching} onRefresh={() => void plans.refetch()} tintColor={colors.primary} />}
    >
      <PageHeader title="My Plan" subtitle="Practise on your own, no class code needed. Your classes stay as they are." back />
      {plans.isLoading ? (
        <Loading />
      ) : !p ? (
        <ErrorBox title="Couldn't load the plans" message={messageOf(plans.error)} onRetry={() => void plans.refetch()} />
      ) : (
        <View>
          {p.plan && (
            <Card className="mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-ink">{tierLabel(p, p.plan.tier)}</Text>
                <Tag label={p.live ? "Active" : "Ended"} tone={p.live ? "success" : "warning"} />
              </View>
              <Text className="mt-1 text-sm text-ink-muted">
                {p.live ? "Active until " : "Ended on "}
                {formatDate(p.plan.periodEnd)}
              </Text>
              {p.live && p.usage && (
                <>
                  <Meter label="Fresh practice sets this month" used={p.usage.used.mcq} limit={p.usage.limits.mcq} />
                  <Meter label="Fresh mind maps this month" used={p.usage.used.mindMap} limit={p.usage.limits.mindMap} />
                  <Meter label="Mock papers this month" used={p.usage.used.mock} limit={p.usage.limits.mock} />
                </>
              )}
            </Card>
          )}
          <SectionLabel className="mb-2">Plans</SectionLabel>
          {p.catalog.map((entry) => {
            const mine = p.plan?.tier === entry.tier && p.live;
            return (
              <Card key={entry.tier} className={`mb-3 ${mine ? "border-success/60" : ""}`}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-ink">{entry.label}</Text>
                  {mine && <Tag label="Your plan" tone="success" />}
                </View>
                <Text className="mt-1 text-xl font-bold text-ink">
                  ₹{entry.monthlyINR}
                  <Text className="text-sm font-normal text-ink-muted"> / month</Text>
                </Text>
                <View className="mt-2">
                  {featuresOf(entry).map((f) => (
                    <View key={f} className="flex-row py-0.5">
                      <Ionicons name="checkmark" size={15} color={colors.success} style={{ marginTop: 2 }} />
                      <Text className="ml-2 flex-1 text-[13px] leading-5 text-ink-muted">{f}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            );
          })}
          <Card>
            <Text className="text-sm leading-5 text-ink-muted">
              Plans are bought on the PlayableCraft website, signed in with this account. Your plan shows here as soon as it is active.
            </Text>
            <Button title="Open the website" icon="open-outline" onPress={() => void Linking.openURL(`${WEBSITE_URL}/learn/plans`)} className="mt-3 self-start" />
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
