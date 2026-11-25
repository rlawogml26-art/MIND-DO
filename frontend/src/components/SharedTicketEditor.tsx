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
  Pressable,
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
  const [reviewing, setReviewing] = useState(false);
  const step = reviewing ? 4 : selected ? 3 : drafts.length ? 2 : 1;

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
        selectionLimit: PHOTO_UPLOAD_MAX_COUNT - photos.length,
      });
      if (!result.canceled) {
        replacePhotos(
          [...photos, ...result.assets.map((asset) => asset.uri)].slice(
            0,
            PHOTO_UPLOAD_MAX_COUNT,
          ),
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

  const closeEditor = () => {
    if (drafts.length === 0) {
      onClose();
      return;
    }
    Alert.alert("티켓 만들기를 그만할까요?", "초안은 다시 불러올 수 없어요.", [
      { text: "이어서 만들기", style: "cancel" },
      { text: "나가기", style: "destructive", onPress: onClose },
    ]);
  };

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
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="공동 티켓으로 돌아가기"
            disabled={busy}
            hitSlop={8}
            onPress={closeEditor}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.date}>
            {detail.ticketDate.replaceAll("-", ".")}
          </Text>
        </View>
        <Text accessibilityRole="header" style={styles.heading}>
          내 티켓 만들기
        </Text>
        <View
          style={styles.progress}
          accessibilityLabel={`4단계 중 ${step}단계`}
        >
          {[1, 2, 3, 4].map((number) => (
            <View
              key={number}
              style={[
                styles.progressSegment,
                number <= step && styles.progressActive,
              ]}
            />
          ))}
        </View>
        {drafts.length === 0 && (
          <>
            <View style={styles.fieldHeading}>
              <Text style={styles.label}>
                추억 사진 (최대 {PHOTO_UPLOAD_MAX_COUNT}장)
              </Text>
              <Text style={styles.count}>
                {photos.length} / {PHOTO_UPLOAD_MAX_COUNT}장
              </Text>
            </View>
            <View style={styles.photos}>
              {Array.from({ length: PHOTO_UPLOAD_MAX_COUNT }, (_, index) => {
                const uri = photos[index];
                return uri ? (
                  <View key={index} style={styles.slot}>
                    <Image
                      source={{ uri }}
                      accessibilityLabel={`사진 ${index + 1}`}
                      style={styles.photo}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`사진 ${index + 1} 삭제`}
                      disabled={busy || editingUnavailable || draftLimitReached}
                      hitSlop={6}
                      onPress={() =>
                        replacePhotos(
                          photos.filter((_, position) => position !== index),
                        )
                      }
                      style={styles.removePhoto}
                    >
                      <Text style={styles.removeIcon}>×</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    key={index}
                    accessibilityRole="button"
                    accessibilityLabel={`추억 사진 ${index + 1} 추가`}
                    disabled={busy || editingUnavailable || draftLimitReached}
                    onPress={() => void pickPhotos()}
                    style={styles.slot}
                  >
                    <Text style={styles.addIcon}>＋</Text>
                  </Pressable>
                );
              })}
            </View>
            <View
              style={styles.orientationChoices}
              accessibilityLabel="티켓 형식"
            >
              <View
                style={[styles.orientationCard, styles.orientationCardSelected]}
                accessibilityLabel="가로형 선택됨"
              >
                <OrientationThumbnail vertical={false} />
                <Text style={styles.orientationLabel}>● 가로형</Text>
              </View>
              <View
                style={styles.orientationCard}
                accessibilityLabel="세로형 준비 중"
              >
                <OrientationThumbnail vertical />
                <Text style={styles.orientationUnavailable}>
                  ○ 세로형 · 준비 중
                </Text>
              </View>
            </View>
            <View style={styles.fieldHeading}>
              <Text style={styles.label}>티켓 분위기</Text>
              <Text style={styles.count}>
                {mood.length}/{MOOD_PROMPT_MAX}
              </Text>
            </View>
            <TextInput
              accessibilityLabel="티켓 분위기"
              placeholder="예: 따뜻한 노을빛 여행 / 세련된 전시회 기록"
              placeholderTextColor="#969EAD"
              style={styles.input}
              editable={!busy && !editingUnavailable && !draftLimitReached}
              multiline
              maxLength={MOOD_PROMPT_MAX}
              value={mood}
              onChangeText={setMood}
            />
            <EditorButton
              label="초안 만들기"
              disabled={
                busy ||
                editingUnavailable ||
                draftLimitReached ||
                photos.length === 0
              }
              onPress={() => void generate()}
            />
          </>
        )}
        {drafts.length > 0 && !selected && (
          <Text style={styles.heading}>마음에 드는 초안을 골라 주세요</Text>
        )}
        {selected && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setReviewing(false);
              setSelected(null);
            }}
          >
            <Text style={styles.count}>다른 초안 고르기</Text>
          </Pressable>
        )}
        {(selected ? [selected] : drafts).map((draft) => (
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
            {!selected && (
              <EditorButton
                label={`초안 ${draft.draftNo} 선택`}
                disabled={busy}
                onPress={() => setSelected(draft)}
              />
            )}
          </View>
        ))}
        {selected && (
          <>
            {reviewing ? (
              <>
                <Text style={styles.heading}>티켓 확인</Text>
                {!!memo.trim() && (
                  <Text style={styles.label}>{memo.trim()}</Text>
                )}
                <EditorButton
                  label="메모 수정"
                  disabled={busy}
                  onPress={() => setReviewing(false)}
                />
                <EditorButton
                  label="티켓 저장"
                  disabled={
                    busy || editingUnavailable || photoKeys.length === 0
                  }
                  onPress={() => void save()}
                />
              </>
            ) : (
              <>
                <View style={styles.fieldHeading}>
                  <Text style={styles.label}>뒷면 메모</Text>
                  <Text style={styles.count}>
                    {memo.length}/{PERSONAL_TICKET_MEMO_MAX}
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel="뒷면 메모"
                  placeholder="기억하고 싶은 순간을 적어 주세요"
                  placeholderTextColor="#969EAD"
                  style={styles.input}
                  editable={!busy && !editingUnavailable}
                  multiline
                  maxLength={PERSONAL_TICKET_MEMO_MAX}
                  value={memo}
                  onChangeText={setMemo}
                />
                <EditorButton
                  label="티켓 확인"
                  disabled={busy || editingUnavailable}
                  onPress={() => setReviewing(true)}
                />
              </>
            )}
          </>
        )}
        {busy && <Text accessibilityLiveRegion="polite">처리 중이에요.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function OrientationThumbnail({ vertical }: { vertical: boolean }) {
  return (
    <View
      style={styles.orientationThumbnail}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.orientationStub}>
        <Text style={styles.orientationBrand}>MEMO:RE</Text>
      </View>
      <View style={styles.orientationPreview}>
        <View
          style={[
            styles.orientationMark,
            vertical && styles.orientationMarkVertical,
          ]}
        >
          <View style={styles.orientationDot} />
          <View style={styles.orientationSilhouette} />
        </View>
      </View>
    </View>
  );
}

function EditorButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled && styles.actionDisabled]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const accent = "#4053E8";
const ink = "#303649";
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  header: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    position: "absolute",
    left: 0,
    height: 44,
    minWidth: 40,
    justifyContent: "center",
    zIndex: 1,
  },
  backIcon: { color: ink, fontSize: 27 },
  date: { color: ink, fontSize: 15, fontWeight: "600" },
  heading: { color: ink, fontSize: 16, fontWeight: "600" },
  progress: { flexDirection: "row", gap: 8 },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  progressActive: { backgroundColor: accent },
  orientationChoices: { flexDirection: "row", gap: 12 },
  orientationCard: {
    flex: 1,
    minHeight: 112,
    gap: 12,
    justifyContent: "center",
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E5EC",
  },
  orientationCardSelected: { borderColor: accent, borderWidth: 1.5 },
  orientationThumbnail: {
    width: "100%",
    maxWidth: 130,
    aspectRatio: 2.5,
    alignSelf: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E2E5EC",
    borderRadius: 4,
    overflow: "hidden",
  },
  orientationStub: { width: "20%", padding: 2, backgroundColor: "#E1EBF2" },
  orientationBrand: { fontSize: 5, color: "#667082" },
  orientationPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F9",
  },
  orientationMark: { gap: 2, alignItems: "center" },
  orientationMarkVertical: { transform: [{ rotate: "90deg" }] },
  orientationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34416F",
  },
  orientationSilhouette: {
    width: 13,
    height: 6,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: "#34416F",
  },
  orientationLabel: { color: ink, fontSize: 14, fontWeight: "500" },
  orientationUnavailable: { color: "#767A85", fontSize: 12 },
  fieldHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { color: ink, fontSize: 12, lineHeight: 16 },
  count: { color: accent, fontSize: 12, lineHeight: 16 },
  photos: { flexDirection: "row", gap: 8, marginBottom: 4 },
  slot: {
    flex: 1,
    maxWidth: 76,
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F2F5",
  },
  photo: { width: "100%", height: "100%", borderRadius: 10 },
  removePhoto: {
    position: "absolute",
    right: 2,
    top: 2,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#303649",
  },
  removeIcon: { color: "#FFFFFF", fontSize: 15, lineHeight: 18 },
  addIcon: { color: accent, fontSize: 23 },
  input: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E5EC",
    padding: 12,
    color: ink,
    textAlignVertical: "top",
  },
  action: {
    alignSelf: "stretch",
    height: 48,
    borderRadius: 14,
    backgroundColor: accent,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  actionDisabled: { backgroundColor: "#DDE1F7" },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  draft: { gap: 8, alignItems: "center" },
});
