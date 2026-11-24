// The signed-in frame (the Android app's AppShell for a Student): a top bar on the tab pages (menu button,
// wordmark, streak) and the sidebar, a sheet from the left with the student's pages and account.

import { createContext, useContext, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";
import { StreakPill } from "./StreakPill";
import { colors, SectionLabel, Wordmark, type IconName } from "./ui";

interface MenuItem {
  label: string;
  icon: IconName;
  href: Href;
  description?: string;
}

/** The student's pages. Manage lists the Learn section without Home. */
export const LEARN_ITEMS: MenuItem[] = [
  { label: "Home", icon: "home-outline", href: "/" },
  { label: "My Classes", icon: "key-outline", href: "/classes", description: "Join a class with the code from your school or tutor" },
  { label: "Practice", icon: "help-circle-outline", href: "/practice", description: "MCQ practice sets for your chapters" },
  { label: "Mind Maps", icon: "git-network-outline", href: "/mind-maps", description: "How a chapter's ideas connect" },
  { label: "Mock Papers", icon: "document-text-outline", href: "/mocks", description: "Timed papers in the exam's pattern" },
  { label: "Super Notes", icon: "book-outline", href: "/super-notes", description: "Revision notes for a chapter" },
  { label: "IQ Test", icon: "bulb-outline", href: "/iq", description: "Take this cycle's test" },
  { label: "Leaderboard", icon: "trophy-outline", href: "/iq/leaderboard", description: "See where you rank this cycle" },
  { label: "Notes", icon: "create-outline", href: "/notes", description: "Your own notes and reminders" },
];

const ACCOUNT_ITEMS: MenuItem[] = [
  { label: "My Plan", icon: "diamond-outline", href: "/plans" },
  { label: "Profile", icon: "person-circle-outline", href: "/profile" },
  { label: "Notifications", icon: "notifications-outline", href: "/notifications" },
];

const ShellContext = createContext<() => void>(() => undefined);
export const useOpenMenu = () => useContext(ShellContext);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <ShellContext.Provider value={() => setOpen(true)}>
      {children}
      <Sidebar open={open} onClose={() => setOpen(false)} />
    </ShellContext.Provider>
  );
}

/** The tab pages' bar: menu button and wordmark on the left, the streak on the right. */
export function TopBar() {
  const insets = useSafeAreaInsets();
  const openMenu = useOpenMenu();
  return (
    <View className="flex-row items-center bg-page px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
      <Pressable onPress={openMenu} accessibilityLabel="Open menu" className="mr-2 h-11 w-11 items-center justify-center rounded-full active:bg-tag">
        <Ionicons name="menu" size={26} color={colors.ink} />
      </Pressable>
      <View className="flex-1">
        <Wordmark size={21} />
      </View>
      <StreakPill />
    </View>
  );
}

function SidebarRow({ item, selected, onPress }: { item: MenuItem; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`mx-2 flex-row items-center rounded-xl px-3 py-3 ${selected ? "bg-primary/20" : "active:bg-tag"}`}>
      <Ionicons name={item.icon} size={20} color={selected ? colors.ink : colors.muted} />
      <Text className={`ml-3 text-[15px] ${selected ? "font-semibold text-ink" : "text-ink-muted"}`}>{item.label}</Text>
    </Pressable>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { student } = useSession();

  const go = (href: Href) => {
    onClose();
    // Tab pages are switched to; every other page opens over the current one, so Back returns.
    if (href === "/" || href === "/profile") router.navigate(href);
    else router.push(href);
  };


  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 flex-row">
        <View className="w-[300px] max-w-[85%] border-r border-edge bg-page" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View className="h-16 justify-center border-b border-edge px-5">
            <Wordmark size={19} />
          </View>
          <ScrollView className="flex-1" contentContainerClassName="py-3">
            <SectionLabel className="mb-1 ml-5">Learn</SectionLabel>
            {LEARN_ITEMS.map((i) => (
              <SidebarRow key={i.label} item={i} selected={pathname === i.href} onPress={() => go(i.href)} />
            ))}
            <SectionLabel className="mb-1 ml-5 mt-5">Account</SectionLabel>
            {ACCOUNT_ITEMS.map((i) => (
              <SidebarRow key={i.label} item={i} selected={pathname === i.href} onPress={() => go(i.href)} />
            ))}
          </ScrollView>
          {student && (
            <View className="border-t border-edge px-5 py-4">
              <Text className="text-sm font-medium text-ink" numberOfLines={1}>
                {student.name}
              </Text>
              <Text className="text-xs text-ink-label">Student</Text>
            </View>
          )}
        </View>
        <Pressable className="flex-1 bg-black/60" onPress={onClose} accessibilityLabel="Close menu" />
      </View>
    </Modal>
  );
}
