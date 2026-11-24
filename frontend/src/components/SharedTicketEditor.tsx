import {
  MOOD_PROMPT_MAX,
  PERSONAL_TICKET_MEMO_MAX,
  PHOTO_UPLOAD_MAX_COUNT,
  type AiDraft,
  type SharedTicketDetailResponse,
} from "@mind-do/shared";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createAiDrafts, issueTicket } from "../lib/api";
import { uploadTicketPhotos } from "../lib/photo-upload";
import TicketRenderer from "./TicketRenderer";

type Props = {
  detail: SharedTicketDetailResponse;
  onClose: () => void;
  onIssued: () => void;
};

export default function SharedTicketEditor({
  detail,
  onClose,
  onIssued,
}: Props) {
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<AiDraft[]>([]);
  const [selected, setSelected] = useState<AiDraft | null>(null);
  const [mood, setMood] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);

  async function run(action: () => Promise<void>, failure: string) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      await action();
    } catch {
      Alert.alert(failure, "잠시 뒤 다시 시도해 주세요.");
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  function replacePhotos(uris: string[]) {
    setPhotos(uris);
    setPhotoKeys([]);
    setDrafts([]);
    setSelected(null);
  }

  const pickPhotos = () =>
    run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: PHOTO_UPLOAD_MAX_COUNT,
      });
      if (!result.canceled) {
        replacePhotos(
          result.assets
            .map((asset) => asset.uri)
            .slice(0, PHOTO_UPLOAD_MAX_COUNT),
        );
      }
    }, "사진을 선택하지 못했어요.");

  const generate = () =>
    run(async () => {
      const keys = photoKeys.length
        ? photoKeys
        : await uploadTicketPhotos(detail.sharedTicketId, photos);
      setPhotoKeys(keys);
      const result = await createAiDrafts(detail.sharedTicketId, {
        photoKeys: keys,
        moodPrompt: mood,
      });
      setDrafts(result.drafts);
      setSelected(null);
    }, "초안을 불러오지 못했어요.");

  const save = () =>
    run(async () => {
      if (!selected) return;
      await issueTicket(detail.sharedTicketId, {
        photoKeys,
        memo: memo.trim(),
        design: selected.design,
      });
      onIssued();
    }, "티켓을 저장하지 못했어요.");

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Button
          title="공동 티켓으로 돌아가기"
          disabled={busy}
          onPress={onClose}
        />
        <Text accessibilityRole="header" style={styles.heading}>
          내 티켓 만들기
        </Text>
        <Text>
          {detail.groupName} · {detail.ticketDate}
        </Text>
        <Button
          title="사진 선택"
          disabled={busy}
          onPress={() => void pickPhotos()}
        />
        <View style={styles.photos}>
          {photos.map((uri, index) => (
            <Image
              key={index}
              source={{ uri }}
              accessibilityLabel={`사진 ${index + 1}`}
              style={styles.photo}
            />
          ))}
        </View>
        <TextInput
          accessibilityLabel="분위기 프롬프트"
          placeholder="분위기 프롬프트 (선택)"
          style={styles.input}
          editable={!busy}
          maxLength={MOOD_PROMPT_MAX}
          value={mood}
          onChangeText={setMood}
        />
        <Button
          title="AI 초안 만들기"
          disabled={busy || photos.length === 0}
          onPress={() => void generate()}
        />
        {drafts.map((draft) => (
          <View key={draft.draftNo} style={styles.draft}>
            <TicketRenderer
              designId={draft.design.designId}
              photoUris={photos}
              width={Math.max(1, Math.min(360, width - 40))}
              lieDown
              values={{
                title: detail.title,
                date: detail.ticketDate,
                groupName: detail.groupName,
                participants: detail.slots.map((slot) => slot.name),
              }}
            />
            <Button
              title={
                selected?.draftNo === draft.draftNo
                  ? "선택됨"
                  : `초안 ${draft.draftNo} 선택`
              }
              disabled={busy || selected?.draftNo === draft.draftNo}
              onPress={() => setSelected(draft)}
            />
          </View>
        ))}
        {selected && (
          <>
            <TextInput
              accessibilityLabel="뒷면 메모"
              placeholder="뒷면 메모 (선택)"
              style={styles.input}
              editable={!busy}
              multiline
              maxLength={PERSONAL_TICKET_MEMO_MAX}
              value={memo}
              onChangeText={setMemo}
            />
            <Button
              title="티켓 저장"
              disabled={busy}
              onPress={() => void save()}
            />
          </>
        )}
        {busy && <Text accessibilityLiveRegion="polite">처리 중이에요.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8EF" },
  content: { padding: 20, gap: 16 },
  heading: { fontSize: 24, fontWeight: "bold" },
  input: { padding: 12, backgroundColor: "#FFF", borderRadius: 8 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: 64, height: 64, borderRadius: 8 },
  draft: { gap: 8, alignItems: "center" },
});
