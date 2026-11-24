// Notifications (the Android app's NotificationsScreen): newest first, unread marked with a dot. Tapping one
// marks it read; the cross hides it for now (the server has no delete).

import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, EmptyBox, ErrorBox, Loading, PageHeader } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { notificationsService, relativeTime, type AppNotification } from "@/services/notifications";

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["notifications"], queryFn: notificationsService.list });
  const setRead = (ids: string[] | "all") =>
    qc.setQueryData<AppNotification[]>(["notifications"], (old) =>
      old?.map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
    );
  const markOne = useMutation({ mutationFn: notificationsService.markRead, onMutate: (id: string) => setRead([id]) });
  const markAll = useMutation({ mutationFn: notificationsService.markAllRead, onMutate: () => setRead("all") });
  const items = list.data ?? [];
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-5">
        <PageHeader
          title="Notifications"
          back
          right={
            hasUnread ? (
              <Pressable onPress={() => markAll.mutate()} className="flex-row items-center rounded-full border border-edge px-3 py-1.5 active:opacity-80">
                <Ionicons name="checkmark-done" size={16} color={colors.ink} />
                <Text className="ml-1 text-xs text-ink">Mark all as read</Text>
              </Pressable>
            ) : null
          }
        />
      </View>
      {list.isLoading ? (
        <Loading />
      ) : list.isError ? (
        <View className="px-5">
          <ErrorBox title="Unable to load notifications" message={messageOf(list.error)} onRetry={() => void list.refetch()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerClassName="px-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyBox icon="notifications-off-outline" message="You're all caught up." />}
          renderItem={({ item: n }) => (
            <Pressable
              onPress={() => !n.readAt && markOne.mutate(n.id)}
              className={`mb-2.5 flex-row rounded-2xl border p-4 ${n.readAt ? "border-edge bg-card" : "border-primary/50 bg-primary/10"}`}
            >
              <View className="flex-1">
                <View className="flex-row items-center">
                  {!n.readAt && <View className="mr-2 h-2 w-2 rounded-full bg-primary" />}
                  <Text className="flex-1 text-[15px] font-semibold text-ink">{n.title}</Text>
                </View>
                {n.body ? <Text className="mt-1 text-sm leading-5 text-ink-muted">{n.body}</Text> : null}
                <Text className="mt-1.5 text-xs text-ink-label">{relativeTime(n.createdAt)}</Text>
              </View>
              <Pressable
                onPress={() => {
                  notificationsService.dismiss(n.id);
                  qc.setQueryData<AppNotification[]>(["notifications"], (old) => old?.filter((x) => x.id !== n.id));
                }}
                accessibilityLabel="Dismiss notification"
                className="ml-2 p-1"
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
