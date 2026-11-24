// One of the student's mind maps, on the same canvas as a delivered one.

import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorBox, Loading, Page, PageHeader } from "@/components/ui";
import { MindMapCanvas, MindMapToolbar, useMindMapControls } from "@/components/viewers/MindMapCanvas";
import { messageOf } from "@/lib/api";
import { learnService, type MindMapDetail } from "@/services/learn";

function MapView({ m }: { m: MindMapDetail }) {
  const insets = useSafeAreaInsets();
  const controls = useMindMapControls(m.root);
  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}>
      <View className="px-5">
        <PageHeader title={m.title || "Mind map"} subtitle={[m.subject, m.grade, m.nodeCount ? `${m.nodeCount} ideas` : ""].filter(Boolean).join(" · ")} back />
        <MindMapToolbar c={controls} />
      </View>
      <View className="mt-3 flex-1 border-t border-edge">
        <MindMapCanvas root={m.root} zoom={controls.zoom} folded={controls.folded} onToggle={controls.toggle} />
      </View>
    </View>
  );
}

export default function StudentMindMap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const map = useQuery({ queryKey: ["learn", "mind-maps", id], queryFn: () => learnService.mindMap(id) });
  if (map.data) return <MapView m={map.data} />;
  return (
    <Page>
      <PageHeader title="Mind map" back />
      {map.isLoading ? <Loading /> : <ErrorBox title="Couldn't load the mind map" message={messageOf(map.error)} onRetry={() => void map.refetch()} />}
    </Page>
  );
}
