// Shown on a plan page when the student has no live plan: what a plan gives, and where to get one.

import { Text } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card } from "@/components/ui";

export function PlanNotice({ ended }: { ended: boolean }) {
  const router = useRouter();
  return (
    <Card className="mb-3">
      <Text className="text-base font-semibold text-ink">{ended ? "Your plan has ended" : "Practise on your own"}</Text>
      <Text className="mt-1 text-sm leading-5 text-ink-muted">
        {ended
          ? "Renew it to keep making practice sets and mind maps. Everything you made stays here."
          : "With a plan you can make practice sets and mind maps for your class, from the library or fresh. No class code needed."}
      </Text>
      <Button title={ended ? "Renew plan" : "See plans"} onPress={() => router.push("/plans")} className="mt-3 self-start" />
    </Card>
  );
}
