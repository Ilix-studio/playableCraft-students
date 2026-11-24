// My Classes: join a class with its batch code, see each class's access, remove one (web: StudentPasskeys). The
// access fee is paid on the website; the app shows what is due but takes no payment.

import { useState } from "react";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, colors, EmptyBox, ErrorBox, Field, InlineError, Loading, PageHeader, SectionLabel, Tag } from "@/components/ui";
import { messageOf } from "@/lib/api";
import { WEBSITE_URL } from "@/lib/config";
import { STUDENT_ACCESS_PERIOD_DAYS, STUDENT_PLATFORM_FEE_INR } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { isActive, needsPayment, studentService, type Enrollment } from "@/services/student";

function ClassCard({ e }: { e: Enrollment }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => studentService.leave(e.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const fee = e.platformFeeINR ?? STUDENT_PLATFORM_FEE_INR;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start">
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-ink">{e.codeLabel}</Text>
          {e.batchName ? <Text className="text-xs text-ink-muted">{e.batchName}</Text> : null}
        </View>
        {isActive(e) ? (
          <Tag label="Active" tone="success" />
        ) : e.status === "REVOKED" ? (
          <Tag label="Revoked" tone="danger" />
        ) : e.status === "EXPIRED" ? (
          <Tag label="Expired" />
        ) : (
          <Tag label="Payment due" tone="warning" />
        )}
      </View>
      {isActive(e) && e.paidThrough ? <Text className="mt-2 text-xs text-ink-muted">Active until {formatDate(e.paidThrough)}</Text> : null}
      {needsPayment(e) && (
        <Text className="mt-2 text-xs leading-5 text-warning">Pay the ₹{fee} access fee on the PlayableCraft website to unlock this class.</Text>
      )}
      {/* A revoked class cannot be removed: that record is what stops rejoining with the same code. */}
      {e.status !== "REVOKED" &&
        (!confirming ? (
          <Button title="Remove" variant="ghost" icon="trash-outline" onPress={() => setConfirming(true)} className="mt-3 h-9 self-start" />
        ) : (
          <View className="mt-3">
            <Text className="text-xs leading-5 text-warning">
              {isActive(e) && e.paidThrough
                ? `Remove this class? Your access until ${formatDate(e.paidThrough)} ends now. If you rejoin later, you'll need to pay again.`
                : "Remove this class? You can rejoin later with the same batch code."}
            </Text>
            <InlineError text={remove.error ? messageOf(remove.error) : null} />
            <View className="mt-2 flex-row gap-2">
              <Button title="Remove class" variant="danger" loading={remove.isPending} onPress={() => remove.mutate()} className="h-9" />
              <Button title="Cancel" variant="ghost" disabled={remove.isPending} onPress={() => setConfirming(false)} className="h-9" />
            </View>
          </View>
        ))}
    </Card>
  );
}

export default function Classes() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const classes = useQuery({ queryKey: ["enrollments"], queryFn: studentService.enrollments });
  const [code, setCode] = useState("");
  const join = useMutation({
    mutationFn: (c: string) => studentService.join(c),
    onSuccess: () => {
      setCode("");
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const joined = join.data && needsPayment(join.data) ? join.data : null;

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="px-5"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={classes.isRefetching} onRefresh={() => void classes.refetch()} tintColor={colors.primary} />}
    >
      <PageHeader title="My Classes" subtitle="Enter the batch code from your school or tutor to join their class." back />
      <Card className="mb-4">
        <SectionLabel className="mb-2">Join a class</SectionLabel>
        <Field value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ENTER BATCH CODE" autoCapitalize="characters" />
        <InlineError text={join.error ? messageOf(join.error) : null} />
        <Button title="Join class" icon="add" loading={join.isPending} disabled={!code.trim()} onPress={() => join.mutate(code)} className="mt-1" />
      </Card>

      {joined && (
        <Card className="mb-4 border-warning/50">
          <Text className="text-[15px] font-semibold text-warning">Payment required to activate access</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-muted">
            You joined {joined.batchName || joined.codeLabel}, but its content stays locked until the platform fee of ₹
            {joined.platformFeeINR ?? STUDENT_PLATFORM_FEE_INR} is paid for {STUDENT_ACCESS_PERIOD_DAYS} days of access. Pay it on the
            PlayableCraft website, signed in with this account.
          </Text>
          <Button title="Open the website" variant="ghost" icon="open-outline" onPress={() => void Linking.openURL(WEBSITE_URL)} className="mt-3 self-start" />
        </Card>
      )}

      {classes.isLoading ? (
        <Loading />
      ) : classes.isError ? (
        <ErrorBox title="Unable to load your classes" message={messageOf(classes.error)} onRetry={() => void classes.refetch()} />
      ) : (classes.data ?? []).length === 0 ? (
        <EmptyBox icon="key-outline" message="No classes yet. Join one above to get started." />
      ) : (
        (classes.data ?? []).map((e) => <ClassCard key={e.id} e={e} />)
      )}
    </ScrollView>
  );
}
