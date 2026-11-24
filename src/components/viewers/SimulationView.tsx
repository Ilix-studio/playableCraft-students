// A delivered simulation (the Android app's SimulationViewerScreen, student view): the stage, a slider per
// variable, Reset, a full-screen stage, and the planner's notes as "Underlying Scientific Principles".

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, colors, ErrorBox, Loading, PageHeader, SectionLabel } from "@/components/ui";
import { parsePrinciples } from "@/lib/principles";
import { simulationHtml } from "@/lib/simTemplate";
import type { SimulationDetail, SimulationVariable } from "@/lib/types";
import { Slider } from "./Slider";
import { SimStage, type SimStageHandle } from "./SimStage";

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

function VariableSlider({ v, value, onChange }: { v: SimulationVariable; value: number; onChange: (n: number) => void }) {
  return (
    <View className="mb-3">
      <View className="mb-1 flex-row justify-between">
        <Text className="text-sm text-ink">{v.label}</Text>
        <Text className="text-sm font-semibold text-accent">
          {fmt(value)}
          {v.unit ? ` ${v.unit}` : ""}
        </Text>
      </View>
      <Slider min={v.min} max={v.max} value={value} onChange={onChange} />
    </View>
  );
}

export function SimulationView({ sim }: { sim: SimulationDetail }) {
  const insets = useSafeAreaInsets();
  const stage = useRef<SimStageHandle>(null);
  const [html, setHtml] = useState<string | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const defaults = useMemo(() => Object.fromEntries(sim.variables.map((v) => [v.name, v.default])), [sim.variables]);
  const [values, setValues] = useState<Record<string, number>>(defaults);
  const [reloadKey, setReloadKey] = useState(0);
  const [full, setFull] = useState(false);
  const principles = useMemo(() => parsePrinciples(sim.physicsNotes, sim.topic), [sim.physicsNotes, sim.topic]);

  useEffect(() => {
    let live = true;
    simulationHtml(sim.code, sim.runtime, sim.bioZoom)
      .then((h) => live && setHtml(h))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [sim.code, sim.runtime, sim.bioZoom]);

  const set = (name: string, n: number) => {
    setValues((prev) => ({ ...prev, [name]: n }));
    stage.current?.pushParams({ [name]: n });
  };
  const reset = () => {
    setValues(defaults);
    setReloadKey((k) => k + 1);
  };
  // A fresh page starts from its own defaults; send the sliders' values once it has loaded.
  const ready = () => stage.current?.pushParams(values);

  const stageView =
    html === undefined && !failed ? (
      <Loading className="flex-1" />
    ) : !html || failed ? (
      <View className="flex-1 items-center justify-center p-6">
        <ErrorBox title="This simulation can't be shown" message="Its sketch is missing or could not be loaded." />
      </View>
    ) : (
      <SimStage key={reloadKey} ref={stage} html={html} onReady={ready} />
    );

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-5">
        <PageHeader title={sim.title} subtitle={[sim.subject, sim.topic].filter(Boolean).join(" · ")} back />
      </View>
      <ScrollView contentContainerClassName="px-5" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View className="aspect-[4/3] overflow-hidden rounded-2xl border border-edge">
          {!full && stageView}
          <View className="absolute right-2 top-2 flex-row gap-2">
            <Pressable onPress={reset} accessibilityLabel="Reset" className="h-9 w-9 items-center justify-center rounded-full bg-black/60">
              <Ionicons name="refresh" size={18} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => setFull(true)} accessibilityLabel="Full screen" className="h-9 w-9 items-center justify-center rounded-full bg-black/60">
              <Ionicons name="expand" size={18} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        {sim.variables.length > 0 && (
          <Card className="mt-4">
            <SectionLabel className="mb-3">Controls</SectionLabel>
            {sim.variables.map((v) => (
              <VariableSlider key={v.name} v={v} value={values[v.name] ?? v.default} onChange={(n) => set(v.name, n)} />
            ))}
          </Card>
        )}

        {principles.length > 0 && (
          <Card className="mt-4">
            <Text className="mb-3 text-base font-semibold text-ink">Underlying Scientific Principles</Text>
            {principles.map((s) => (
              <View key={s.kind} className="mb-3">
                <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#B79CFF]">{s.kind}</Text>
                {s.items.map((item, i) => (
                  <View key={i} className="flex-row py-0.5">
                    <Text className="w-3.5 text-ink-muted">•</Text>
                    <Text
                      className={`flex-1 ${s.kind === "Heading" ? "text-base font-semibold text-ink" : s.kind === "Formula" ? "font-mono text-sm leading-6 text-[#E5E7FF]" : "text-sm leading-5 text-ink-muted"}`}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <Modal visible={full} animationType="fade" supportedOrientations={["portrait", "landscape"]} onRequestClose={() => setFull(false)}>
        <View className="flex-1 bg-black">
          {full && stageView}
          <Pressable
            onPress={() => setFull(false)}
            accessibilityLabel="Exit full screen"
            className="absolute right-3 h-10 w-10 items-center justify-center rounded-full bg-black/60"
            style={{ top: insets.top + 8 }}
          >
            <Ionicons name="contract" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
