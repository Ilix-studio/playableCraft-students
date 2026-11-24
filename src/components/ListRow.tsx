// A saved item in a list (a practice set, a mind map, a mock paper): opens on tap, with an optional remove
// button that asks first.

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, ConfirmDialog, type IconName } from "@/components/ui";

export function ListRow({ icon, title, meta, onOpen, onDelete, right }: { icon: IconName; title: string; meta: string; onOpen: () => void; onDelete?: () => void; right?: React.ReactNode }) {
  const [asking, setAsking] = useState(false);
  return (
    <Pressable onPress={onOpen} className="mb-2 flex-row items-center rounded-2xl border border-edge bg-card p-3.5 active:opacity-80">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-tag">
        <Ionicons name={icon} size={19} color={colors.accent} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[14.5px] font-semibold text-ink" numberOfLines={2}>
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={2}>
          {meta}
        </Text>
      </View>
      {right}
      {onDelete && (
        <Pressable onPress={() => setAsking(true)} accessibilityLabel={`Remove ${title}`} className="ml-1 p-2">
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </Pressable>
      )}
      {onDelete && (
        <ConfirmDialog
          visible={asking}
          title="Remove this?"
          message={`“${title}” is removed from your list.`}
          confirmLabel="Remove"
          destructive
          onConfirm={() => {
            setAsking(false);
            onDelete();
          }}
          onCancel={() => setAsking(false)}
        />
      )}
    </Pressable>
  );
}
