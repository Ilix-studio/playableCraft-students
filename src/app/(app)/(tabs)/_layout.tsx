// The three tabs (Home, Manage, Profile) in a floating pill bar, as the Android app's BottomTabBar.

import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/tabs";
import { colors, type IconName } from "@/components/ui";

const ICONS: Record<string, IconName> = { index: "home-outline", manage: "layers-outline", profile: "person-outline" };
const LABELS: Record<string, string> = { index: "Home", manage: "Manage", profile: "Profile" };

function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-page px-4" style={{ paddingBottom: insets.bottom + 8 }}>
      <View className="flex-row rounded-3xl border border-edge bg-card p-1.5">
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              className={`flex-1 items-center rounded-2xl py-2 ${focused ? "bg-[#0C2A78]" : ""}`}
            >
              <Ionicons name={ICONS[route.name]} size={22} color={focused ? colors.ink : colors.muted} />
              <Text className={`mt-0.5 text-xs ${focused ? "font-semibold text-ink" : "text-ink-muted"}`}>{LABELS[route.name]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#08090C" } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="manage" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
