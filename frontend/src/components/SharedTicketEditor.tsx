import {
  ErrorCode,
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
import {
  ApiError,
  createAiDrafts,
  issueTicket,
  NETWORK_ERROR,
} from "../lib/api";
import {
  PHOTO_TOO_LARGE,
  PHOTO_UPLOAD_FAILED,
  uploadTicketPhotos,
} from "../lib/photo-upload";
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
  const [draftLimitReached, setDraftLimitReached] = useState(false);
  const [editingUnavailable, setEditingUnavailable] = useState(false);
  const operation = useRef(false);

  async function run(action: () => Promise<void>, failure: string) {
    if (operation.current || editingUnavailable) return;
    operation.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error: unknown) {
      if (!(error instanceof ApiError)) {
        Alert.alert(failure, "선택한 사진이나 기기 권한을 확인해 주세요.");
        return;
      }
      const { code, status } = error;
      let message: string;
      if (code === ErrorCode.AI_DRAFT_ALREADY_GENERATED) {
        setDraftLimitReached(true);
        message = "이 티켓의 AI 초안은 이미 만들었어요. 다시 만들 수 없어요.";
      } else if (code === ErrorCode.TICKET_ALREADY_COMPLETED) {
        setEditingUnavailable(true);
        message = "이미 저장된 티켓이에요. 공동 티켓에서 확인해 주세요.";
      } else if (status === 401) {
        setEditingUnavailable(true);
        message = "로그인이 만료됐어요. 다시 로그인해 주세요.";
      } else if (
        code === ErrorCode.NOT_INVITED ||
        status === 403 ||
        status === 404
      ) {
        setEditingUnavailable(true);
        message = "이 공동 티켓에서는 내 티켓을 만들 수 없어요.";
      } else if (
        code === PHOTO_TOO_LARGE ||
        code === ErrorCode.INVALID_PHOTO_KEY
      ) {
        if (code === ErrorCode.INVALID_PHOTO_KEY) setPhotoKeys([]);
        message = "선택한 사진을 사용할 수 없어요. 다른 사진을 선택해 주세요.";
      } else if (
        code === ErrorCode.INVALID_DESIGN ||
        code === ErrorCode.INVALID_INPUT
      ) {
        message = "선택한 초안과 입력 내용을 확인해 주세요.";
      } else if (
        code === NETWORK_ERROR ||
        code === PHOTO_UPLOAD_FAILED ||
        status >= 500 ||
        status === 429
      ) {
        message = "잠시 뒤 다시 시도해 주세요.";
      } else {
        message = "공동 티켓으로 돌아가 현재 상태를 확인해 주세요.";
      }
      Alert.alert(failure, message);
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
      if (draftLimitReached) return;
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
          disabled={busy || editingUnavailable}
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
          disabled={
            busy ||
            editingUnavailable ||
            draftLimitReached ||
            photos.length === 0
          }
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
              disabled={busy || editingUnavailable || photoKeys.length === 0}
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
