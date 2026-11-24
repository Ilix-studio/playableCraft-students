// The app's building blocks, styled with NativeWind (the Android app's ScreenKit): page header, cards, buttons,
// pills, text fields, a select sheet, loading / error / empty states and a confirm dialog. Dark navy surfaces,
// rounded corners, borders rather than shadows.

import { useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export const colors = {
  ink: "#FFFFFF",
  muted: "#8F9BD6",
  label: "#8C96B0",
  primary: "#3875FF",
  accent: "#8FB0FF",
  success: "#2EE59D",
  warning: "#F5B942",
  danger: "#FF6B6B",
  card: "#0B1530",
  tag: "#152243",
  page: "#08090C",
};

/** A pushed screen's frame: safe area, side gutter, and optional scrolling. */
export function Page({ children, scroll = true, top = true }: { children: ReactNode; scroll?: boolean; top?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: top ? insets.top + 8 : 8, paddingBottom: insets.bottom + 24 };
  return scroll ? (
    <ScrollView className="flex-1 bg-page" contentContainerStyle={pad} contentContainerClassName="px-5" keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 bg-page px-5" style={pad}>
      {children}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string | null;
  /** True for the router's back; a function for a custom one. */
  back?: boolean | (() => void);
  right?: ReactNode;
}) {
  const router = useRouter();
  const onBack = typeof back === "function" ? back : back ? () => router.back() : null;
  return (
    <View className="mb-4 flex-row items-center">
      {onBack && (
        <Pressable onPress={onBack} accessibilityLabel="Back" className="mr-2 h-10 w-10 items-center justify-center rounded-full active:bg-tag">
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
      )}
      <View className="flex-1">
        <Text className="text-[26px] font-bold tracking-tight text-ink">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm leading-5 text-ink-muted">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, className = "", onPress }: { children: ReactNode; className?: string; onPress?: () => void }) {
  const cls = `rounded-2xl border border-edge bg-card p-4 ${className}`;
  return onPress ? (
    <Pressable onPress={onPress} className={`${cls} active:opacity-80`}>
      {children}
    </Pressable>
  ) : (
    <View className={cls}>{children}</View>
  );
}

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Text className={`text-[11px] font-semibold uppercase tracking-widest text-ink-label ${className}`}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  className = "",
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  className?: string;
}) {
  const off = disabled || loading;
  const look =
    variant === "primary" ? "bg-primary" : variant === "danger" ? "bg-danger/15 border border-danger/50" : "border border-edge bg-transparent";
  const tint = variant === "danger" ? colors.danger : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      className={`h-11 flex-row items-center justify-center rounded-xl px-4 ${look} ${off ? "opacity-60" : "active:opacity-80"} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={tint} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={17} color={tint} />
      ) : null}
      <Text className={`ml-2 text-[15px] font-semibold ${variant === "danger" ? "text-danger" : "text-ink"}`}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ label, selected, onPress, note, disabled }: { label: string; selected: boolean; onPress: () => void; note?: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ selected }}
      className={`flex-row items-center rounded-full border px-4 py-2 ${selected ? "border-primary bg-primary" : "border-edge bg-transparent"} ${disabled ? "opacity-60" : ""}`}
    >
      <Text className={`text-sm font-medium ${selected ? "text-ink" : "text-ink-muted"}`}>{label}</Text>
      {note !== undefined && <Text className={`ml-1.5 text-xs ${selected ? "text-ink" : "text-ink-label"}`}>{note}</Text>}
    </Pressable>
  );
}

export function Tag({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const cls = { default: "bg-tag text-tag-text", success: "bg-success/15 text-success", warning: "bg-warning/15 text-warning", danger: "bg-danger/15 text-danger" }[tone];
  return <Text className={`self-start overflow-hidden rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</Text>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  multiline,
  autoCapitalize = "none",
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: ComponentProps<typeof TextInput>["keyboardType"];
  multiline?: boolean;
  autoCapitalize?: ComponentProps<typeof TextInput>["autoCapitalize"];
}) {
  const [hidden, setHidden] = useState(true);
  return (
    <View className="mb-3">
      {label ? <SectionLabel className="mb-1.5">{label}</SectionLabel> : null}
      <View className="flex-row items-center rounded-xl border border-edge bg-[#0E1730] px-3">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#5E6985"
          secureTextEntry={secure && hidden}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          className={`flex-1 py-3 text-[15px] text-ink ${multiline ? "min-h-[96px]" : ""}`}
          style={multiline ? { textAlignVertical: "top" } : undefined}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? "Show password" : "Hide password"} className="p-1">
            <Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={19} color={colors.label} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** A labelled choice that opens a list in a sheet. */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  disabled,
}: {
  label?: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View className="mb-3">
      {label ? <SectionLabel className="mb-1.5">{label}</SectionLabel> : null}
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        className={`flex-row items-center justify-between rounded-xl border border-edge bg-[#0E1730] px-3 py-3 ${disabled ? "opacity-60" : ""}`}
      >
        <Text className={`flex-1 text-[15px] ${current ? "text-ink" : "text-ink-faint"}`} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.label} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        {options.map((o) => (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              onChange(o.value);
              setOpen(false);
            }}
            className={`rounded-xl px-3 py-3 ${o.value === value ? "bg-primary/20" : "active:bg-tag"}`}
          >
            <Text className="text-[15px] text-ink">{o.label}</Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

/**
 * A bottom sheet over a dimmed page. The modal is edge-to-edge so its window never resizes for the keyboard
 * (on Android 15+ a resized modal window left the sheet blank); the keyboard avoider lifts the sheet instead.
 */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/60" onPress={onClose} accessibilityLabel="Close" />
        <View className="max-h-[85%] rounded-t-3xl border border-edge bg-card px-4 pt-4" style={{ marginTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}>
          {title ? <Text className="mb-3 text-base font-semibold text-ink">{title}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive,
  cancelLabel = "Cancel",
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  cancelLabel?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-md rounded-2xl border border-edge bg-card p-5">
          <Text className="text-lg font-semibold text-ink">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-ink-muted">{message}</Text>
          <View className="mt-5 flex-row justify-end gap-3">
            <Button title={cancelLabel} variant="ghost" onPress={onCancel} />
            <Button title={confirmLabel} variant={destructive ? "danger" : "primary"} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Loading({ className = "py-16" }: { className?: string }) {
  return (
    <View className={`items-center justify-center ${className}`}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorBox({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  return (
    <Card className="items-center">
      <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      <Text className="mt-2 text-base font-semibold text-ink">{title}</Text>
      {message ? <Text className="mt-1 text-center text-sm text-ink-muted">{message}</Text> : null}
      {onRetry && <Button title="Try again" variant="ghost" onPress={onRetry} className="mt-3" />}
    </Card>
  );
}

export function EmptyBox({ icon, message, children }: { icon: IconName; message: string; children?: ReactNode }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-edge px-6 py-10">
      <Ionicons name={icon} size={30} color={colors.label} />
      <Text className="mt-3 text-center text-sm leading-5 text-ink-muted">{message}</Text>
      {children}
    </View>
  );
}

export function InlineError({ text }: { text?: string | null }) {
  return text ? <Text className="mt-2 text-sm text-danger">{text}</Text> : null;
}

/** "Playable" regular + "Craft" bold, as the apps' wordmark. */
export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <Text style={{ fontSize: size }} className="text-ink">
      Playable<Text className="font-bold">Craft</Text>
    </Text>
  );
}
