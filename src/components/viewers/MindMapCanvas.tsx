// A mind map as a left-to-right tree (the Android app's InteractiveMindMapCanvas): leaves stacked down the page,
// each parent centred on its children, elbow lines between them. Tap a node with children to fold it. Pan by
// scrolling both ways; zoom scales the whole layout, so the scroll area always fits it.

import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/components/ui";
import type { MindMapNode } from "@/lib/types";

const NODE_W = 190;
const LEVEL_GAP = 56;
const LEAF_GAP = 14;
const MARGIN = 24;
/** Rough characters per line at the node's width and font, to size a node before it is drawn. */
const CHARS_PER_LINE = 24;

interface Placed {
  node: MindMapNode;
  x: number;
  y: number;
  h: number;
  depth: number;
  folded: boolean;
  children: Placed[];
}

function layout(root: MindMapNode, folded: Set<string>) {
  let nextY = MARGIN;
  let maxX = 0;
  const place = (n: MindMapNode, depth: number): Placed => {
    const x = MARGIN + depth * (NODE_W + LEVEL_GAP);
    maxX = Math.max(maxX, x + NODE_W);
    const lines = n.label.split("\n").reduce((sum, l) => sum + Math.max(1, Math.ceil(l.length / CHARS_PER_LINE)), 0);
    const h = 24 + lines * 18;
    const isFolded = folded.has(n.id);
    if (n.children.length > 0 && !isFolded) {
      const kids = n.children.map((c) => place(c, depth + 1));
      const top = kids[0].y + kids[0].h / 2;
      const bottom = kids[kids.length - 1].y + kids[kids.length - 1].h / 2;
      return { node: n, x, y: (top + bottom) / 2 - h / 2, h, depth, folded: false, children: kids };
    }
    const y = nextY;
    nextY += h + LEAF_GAP;
    return { node: n, x, y, h, depth, folded: isFolded, children: [] };
  };
  const placed = place(root, 0);
  return { root: placed, width: maxX + MARGIN, height: nextY + MARGIN };
}

const FILL = ["#3875FF", "#1E3A8A", "#152243", "#0F1A36"];

function flatten(p: Placed, out: Placed[] = []): Placed[] {
  out.push(p);
  p.children.forEach((c) => flatten(c, out));
  return out;
}

export function allIds(n: MindMapNode, out: string[] = []): string[] {
  if (n.children.length) out.push(n.id);
  n.children.forEach((c) => allIds(c, out));
  return out;
}

export function MindMapCanvas({ root, zoom, folded, onToggle }: { root: MindMapNode; zoom: number; folded: Set<string>; onToggle: (id: string) => void }) {
  const { root: placed, width, height } = useMemo(() => layout(root, folded), [root, folded]);
  const nodes = useMemo(() => flatten(placed), [placed]);
  const z = (v: number) => v * zoom;
  const line = colors.primary + "99";

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ height: z(height) }}>
      <ScrollView horizontal contentContainerStyle={{ width: z(width) }}>
        <View style={{ width: z(width), height: z(height) }}>
          {nodes
            .filter((p) => p.children.length > 0)
            .map((p) => {
              const midX = p.x + NODE_W + LEVEL_GAP / 2;
              const cy = (c: Placed) => c.y + c.h / 2;
              const top = Math.min(p.y + p.h / 2, ...p.children.map(cy));
              const bottom = Math.max(p.y + p.h / 2, ...p.children.map(cy));
              return (
                <View key={`l-${p.node.id}`} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
                  <View style={{ position: "absolute", left: z(p.x + NODE_W), top: z(p.y + p.h / 2) - 1, width: z(LEVEL_GAP / 2), height: 2, backgroundColor: line }} />
                  <View style={{ position: "absolute", left: z(midX) - 1, top: z(top), width: 2, height: z(bottom - top), backgroundColor: line }} />
                  {p.children.map((c) => (
                    <View key={c.node.id} style={{ position: "absolute", left: z(midX), top: z(cy(c)) - 1, width: z(LEVEL_GAP / 2), height: 2, backgroundColor: line }} />
                  ))}
                </View>
              );
            })}
          {nodes.map((p) => {
            const kids = p.node.children.length;
            return (
              <Pressable
                key={p.node.id}
                onPress={() => kids > 0 && onToggle(p.node.id)}
                disabled={kids === 0}
                accessibilityHint={kids > 0 ? (p.folded ? "Show its branches" : "Hide its branches") : undefined}
                style={{
                  position: "absolute",
                  left: z(p.x),
                  top: z(p.y),
                  width: z(NODE_W),
                  minHeight: z(p.h),
                  backgroundColor: FILL[Math.min(p.depth, FILL.length - 1)],
                  borderRadius: z(12),
                  paddingHorizontal: z(10),
                  paddingVertical: z(6),
                  borderWidth: 1,
                  borderColor: p.depth === 0 ? "#8FB0FF" : "#1E2B4D",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text style={{ flex: 1, color: "#fff", fontSize: z(p.depth === 0 ? 14 : 13), lineHeight: z(18), fontWeight: p.depth <= 1 ? "600" : "400" }}>{p.node.label}</Text>
                {kids > 0 && (
                  <View style={{ marginLeft: z(6), flexDirection: "row", alignItems: "center" }}>
                    {p.folded && <Text style={{ color: "#BACAF8", fontSize: z(11), marginRight: z(2) }}>{kids}</Text>}
                    <Ionicons name={p.folded ? "add-circle-outline" : "remove-circle-outline"} size={z(15)} color="#BACAF8" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

/** Every branch below the first level, so a map opens on its main ideas. */
const belowFirstLevel = (root: MindMapNode | null) => new Set(root ? root.children.flatMap((c) => allIds(c)) : []);

/** Zoom, fold-all and open-all for a canvas. The map opens folded to its main ideas. */
export function useMindMapControls(root: MindMapNode | null) {
  const [zoom, setZoom] = useState(1);
  const [folded, setFolded] = useState<Set<string>>(() => belowFirstLevel(root));
  return {
    zoom,
    folded,
    toggle: (id: string) =>
      setFolded((f) => {
        const n = new Set(f);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    zoomIn: () => setZoom((v) => Math.min(2, Math.round((v + 0.2) * 10) / 10)),
    zoomOut: () => setZoom((v) => Math.max(0.5, Math.round((v - 0.2) * 10) / 10)),
    expandAll: () => setFolded(new Set()),
    collapseAll: () => setFolded(belowFirstLevel(root)),
  };
}

function ToolButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} className="h-9 flex-row items-center rounded-full border border-edge bg-card px-3 active:opacity-80">
      <Ionicons name={icon} size={16} color={colors.ink} />
    </Pressable>
  );
}

export function MindMapToolbar({ c }: { c: ReturnType<typeof useMindMapControls> }) {
  return (
    <View className="flex-row items-center gap-2">
      <ToolButton icon="remove" label="Zoom out" onPress={c.zoomOut} />
      <Text className="w-11 text-center text-xs text-ink-muted">{Math.round(c.zoom * 100)}%</Text>
      <ToolButton icon="add" label="Zoom in" onPress={c.zoomIn} />
      <View className="flex-1" />
      <ToolButton icon="contract-outline" label="Fold branches" onPress={c.collapseAll} />
      <ToolButton icon="expand-outline" label="Open all branches" onPress={c.expandAll} />
    </View>
  );
}
