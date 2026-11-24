// One chapter's Super Notes from the library.

import { ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorBox, Loading, PageHeader } from "@/components/ui";
import { SuperNotesView } from "@/components/viewers/SuperNotesView";
import { messageOf } from "@/lib/api";
import { learnService } from "@/services/learn";

export default function SuperNote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const notes = useQuery({ queryKey: ["learn", "super-notes", id], queryFn: () => learnService.superNote(id) });
  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <PageHeader title="Super Notes" back />
      {notes.data ? (
        <SuperNotesView notes={notes.data} />
      ) : notes.isLoading ? (
        <Loading />
      ) : (
        <ErrorBox title="Couldn't load the notes" message={messageOf(notes.error)} onRetry={() => void notes.refetch()} />
      )}
    </ScrollView>
  );
}
