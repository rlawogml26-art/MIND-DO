import {
  BASIC_TICKET_STICKERS,
  DESIGN_LAYOUTS,
  ErrorCode,
  MOOD_PROMPT_MAX,
  PERSONAL_TICKET_MEMO_MAX,
  PHOTO_UPLOAD_MAX_COUNT,
  type AiDraft,
  type IssuedTicketResponse,
  type TicketDecoration,
  type SharedTicketDetailResponse,
} from "@mind-do/shared";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
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
import TicketRenderer, { getTicketStickerSize } from "./TicketRenderer";
const dispenserOutputPadding = 8;
const { w: ticketFaceWidth, h: ticketFaceHeight } = DESIGN_LAYOUTS.horizontal.ticket;

type Props = {
  detail: SharedTicketDetailResponse;
  onClose: () => void;
  onIssued: () => void;
  onOpenTodaysTickets: () => void;
};

export default function SharedTicketEditor({
  detail,
  onClose,
  onIssued,
  onOpenTodaysTickets,
}: Props) {
  const { width, height } = useWindowDimensions();
  const dispenserWidth = Math.max(1, Math.min(320, width - 48));
  const dispenserTicketHeight = dispenserWidth * ticketFaceHeight / ticketFaceWidth;
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
  const [stage, setStage] = useState<"decorate" | "memo" | "issue">("decorate");
  const [memoBeforeEdit, setMemoBeforeEdit] = useState("");
  const [issued, setIssued] = useState<IssuedTicketResponse | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printProgress] = useState(() => new Animated.Value(0));
  const [tool, setTool] = useState<"photos" | "stickers">("photos");
  const [decorations, setDecorations] = useState<TicketDecoration[]>([]);
  const [activeSticker, setActiveSticker] = useState<number | null>(null);
  const step = drafts.length ? 2 : 1;
  const values = {
    title: detail.title,
    date: detail.ticketDate,
    groupName: detail.groupName,
    participants: detail.slots.map((slot) => slot.name),
  };
  useEffect(() => {
    if (!issued) return;
    const animation = Animated.timing(printProgress, {
      toValue: 1,
      duration: 1900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setPrinting(false);
    });
    return () => animation.stop();
  }, [issued, printProgress]);

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

  const replacePhotoAt = (index: number) =>
    run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
      if (result.canceled || !result.assets[0]) return;
      const replacement = result.assets[0].uri;
      setPhotos((current) => current.map((uri, position) => position === index ? replacement : uri));
      setPhotoKeys([]);
    }, "사진을 바꾸지 못했어요.");

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
      if (!selected || issued) return;
      const keys = photoKeys.length ? photoKeys : await uploadTicketPhotos(detail.sharedTicketId, photos);
      setPhotoKeys(keys);
      const result = await issueTicket(detail.sharedTicketId, {
        photoKeys: keys,
        memo: memo.trim(),
        design: selected.design,
        decorations,
      });
      setPrinting(true);
      setIssued(result);
    }, "티켓을 저장하지 못했어요.");

  if (selected) {
    const previewWidth = Math.max(1, Math.min(360, width - 48));
    const { body, ticket } = DESIGN_LAYOUTS.horizontal;
    const bodyWidth = previewWidth * body.w / ticket.w;
    const bodyHeight = previewWidth * body.h / ticket.w;
    const title = issued && !printing ? "발권 완료" : stage === "decorate" ? "티켓 꾸미기" : stage === "memo" ? "뒷면 메모" : "발권하기";
    const openMemo = () => {
      setMemoBeforeEdit(memo);
      setStage("memo");
    };
    const back = () => {
      if (issued) onIssued();
      else if (stage === "memo") {
        setMemo(memoBeforeEdit);
        setStage("decorate");
      } else if (stage === "issue") setStage("memo");
      else setSelected(null);
    };
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.assembly} keyboardShouldPersistTaps="handled">
          <View style={styles.assemblyHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel={stage === "memo" && !issued ? "취소" : "뒤로가기"} onPress={back} disabled={busy || printing} style={styles.assemblyLeft}>
              <Text style={stage === "memo" && !issued ? styles.headerAction : styles.backIcon}>{stage === "memo" && !issued ? "취소" : "‹"}</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.assemblyTitle}>{title}</Text>
            {!issued && stage !== "issue" && (
              <Pressable accessibilityRole="button" onPress={stage === "decorate" ? openMemo : () => setStage("issue")} disabled={busy || editingUnavailable} style={styles.assemblyRight}>
                <Text style={[styles.headerAction, styles.blueText]}>완료</Text>
              </Pressable>
            )}
          </View>
          {stage !== "issue" && (
            <View style={styles.faceTabs}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: stage === "decorate" }}
                disabled={busy}
                onPress={() => setStage("decorate")}
                style={[styles.faceTab, stage === "decorate" && styles.faceTabActive]}
              >
                <Text style={stage === "decorate" ? styles.headerAction : styles.label}>앞면</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: stage === "memo" }}
                disabled={busy || stage === "memo"}
                onPress={openMemo}
                style={[styles.faceTab, stage === "memo" && styles.faceTabActive]}
              >
                <Text style={stage === "memo" ? styles.headerAction : styles.label}>뒷면 메모</Text>
              </Pressable>
            </View>
          )}
          {stage === "decorate" ? (
            <>
              <View style={styles.assemblyPreview}>
                <View>
                  <TicketRenderer designId={selected.design.designId} decorations={decorations} photoUris={photos} values={values} width={previewWidth} lieDown />
                  {tool === "stickers" && activeSticker !== null && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="티켓에 스티커 배치"
                      disabled={busy || editingUnavailable}
                      style={[styles.stickerPlacement, { width: bodyWidth, height: bodyHeight }]}
                      onPress={({ nativeEvent: { locationX, locationY } }) => {
                        const size = getTicketStickerSize(bodyWidth, bodyHeight);
                        const x = Math.min(1, Math.max(0, (locationX - size / 2) / (bodyWidth - size)));
                        const y = Math.min(1, Math.max(0, (locationY - size / 2) / (bodyHeight - size)));
                        setDecorations((current) => current.map((item, index) => index === activeSticker ? { ...item, x, y } : item));
                      }}
                    />
                  )}
                </View>
              </View>
              <View style={styles.faceTabs}>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: tool === "photos" }} onPress={() => setTool("photos")}>
                  <Text style={[styles.headerAction, tool === "photos" && styles.faceSelected]}>사진 변경</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: tool === "stickers" }} onPress={() => setTool("stickers")}>
                  <Text style={[styles.headerAction, tool === "stickers" && styles.faceSelected]}>스티커</Text>
                </Pressable>
              </View>
              {tool === "photos" ? (
                <View style={styles.photos}>
                  {photos.map((uri, index) => (
                    <Pressable key={index} accessibilityRole="button" accessibilityLabel={`사진 ${index + 1} 변경`} disabled={busy || editingUnavailable} onPress={() => void replacePhotoAt(index)} style={styles.slot}>
                      <Image source={{ uri }} style={styles.photo} />
                      <Text style={styles.photoChangeBadge}>변경</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.stickerPalette}>
                    {BASIC_TICKET_STICKERS.map((sticker) => (
                      <Pressable key={sticker} accessibilityRole="button" accessibilityLabel={`${sticker} 스티커 추가`} disabled={busy || editingUnavailable} style={styles.stickerButton} onPress={() => {
                        setDecorations((current) => [...current, { sticker, x: 0.5, y: 0.5 }]);
                        setActiveSticker(decorations.length);
                      }}>
                        <Text style={styles.stickerGlyph}>{sticker}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {decorations.length > 0 && (
                    <>
                      <Text style={styles.label}>스티커를 선택한 뒤 티켓 위를 눌러 위치를 바꿀 수 있어요.</Text>
                      <View style={styles.stickerPalette}>
                        {decorations.map(({ sticker }, index) => (
                          <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${index + 1}번 ${sticker} 스티커 선택`} accessibilityState={{ selected: activeSticker === index }} onPress={() => setActiveSticker(index)} style={[styles.stickerButton, activeSticker === index && styles.stickerSelected]}>
                            <Text style={styles.stickerGlyph}>{sticker}</Text>
                          </Pressable>
                        ))}
                      </View>
                      {activeSticker !== null && (
                        <Pressable accessibilityRole="button" onPress={() => {
                          setDecorations((current) => current.filter((_, index) => index !== activeSticker));
                          setActiveSticker(null);
                        }}>
                          <Text style={[styles.label, styles.blueText]}>선택한 스티커 삭제</Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          ) : stage === "memo" ? (
            <View style={styles.memoCard}>
              <View style={styles.fieldHeading}>
                <Text style={[styles.label, styles.blueText]}>MEMORY NOTE</Text>
                <Text style={styles.label}>{detail.ticketDate.replaceAll("-", ".")}</Text>
              </View>
              <TextInput accessibilityLabel="뒷면 메모" placeholder="기억하고 싶은 순간을 적어 주세요" placeholderTextColor="#969EAD" style={styles.memoInput} editable={!busy && !editingUnavailable} multiline maxLength={PERSONAL_TICKET_MEMO_MAX} value={memo} onChangeText={setMemo} />
              <Text style={styles.memoCount}>{memo.length}/{PERSONAL_TICKET_MEMO_MAX}</Text>
            </View>
          ) : (
            <View style={[styles.dispenser, { minHeight: Math.max(320, height - 220) }]}>
              <View style={styles.dispenserBrand}>
                <Text style={styles.dispenserLogo}>MEMO:RE</Text>
                <Text style={styles.dispenserTagline}>MEMORY · TICKET</Text>
              </View>
              <View style={{ width: dispenserWidth }}>
                <View style={styles.dispenserSlot} />
                <View style={[styles.dispenserOutput, { height: dispenserTicketHeight + dispenserOutputPadding }]}>
                  {issued && (
                    <Animated.View style={{
                      transform: [{
                        translateY: printProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-dispenserTicketHeight - dispenserOutputPadding, 0],
                        }),
                      }],
                    }}>
                      <TicketRenderer
                        designId={issued.design.designId}
                        decorations={issued.decorations}
                        photoUris={photos}
                        values={values}
                        width={dispenserWidth}
                        lieDown
                      />
                    </Animated.View>
                  )}
                </View>
              </View>
              <View style={styles.dispenserStatusRow}>
                <Text accessibilityLiveRegion="polite" style={[styles.dispenserStatus, issued && !printing && styles.dispenserComplete]}>
                  {printing ? "티켓을 인쇄하고 있어요…" : busy ? "티켓을 저장하고 있어요…" : issued ? "티켓 발권 완료!" : ""}
                </Text>
              </View>
              <View style={styles.dispenserAction}>
                {!busy && !printing && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={!issued && editingUnavailable}
                    onPress={issued ? onOpenTodaysTickets : () => void save()}
                    style={[styles.issueButton, !issued && editingUnavailable && styles.actionDisabled]}
                  >
                    <Text style={styles.actionText}>{issued ? "오늘의 티켓 보러가기  →" : "발권하기"}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            <EditorButton
              label={`초안 ${draft.draftNo} 선택`}
              disabled={busy || editingUnavailable}
              onPress={() => setSelected(draft)}
            />
          </View>
        ))}
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
  assembly: { paddingHorizontal: 24, paddingBottom: 28, gap: 16 },
  assemblyHeader: { height: 54, justifyContent: "center", alignItems: "center" },
  assemblyTitle: { color: "#282B33", fontSize: 16, fontWeight: "500" },
  assemblyLeft: { position: "absolute", left: 0, minWidth: 40, height: 44, justifyContent: "center" },
  assemblyRight: { position: "absolute", right: 0, minWidth: 40, height: 44, justifyContent: "center", alignItems: "flex-end" },
  headerAction: { color: "#282B33", fontSize: 14, fontWeight: "500" },
  blueText: { color: "#0750ED" },
  faceTabs: { flexDirection: "row", alignItems: "center", gap: 40, paddingHorizontal: 12, minHeight: 40 },
  faceTab: { minHeight: 40, justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "transparent" },
  faceTabActive: { borderBottomColor: "#FF7868" },
  faceSelected: { borderBottomWidth: 3, borderBottomColor: "#FF7868", paddingBottom: 6 },
  assemblyPreview: { alignItems: "center", marginVertical: 28 },
  photoChangeBadge: { position: "absolute", bottom: 4, right: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: "#282B33", color: "#FFFFFF", fontSize: 10 },
  stickerPlacement: { position: "absolute", top: 0, right: 0 },
  stickerPalette: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stickerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "#DFE5EF", backgroundColor: "#FFFFFF" },
  stickerSelected: { borderColor: "#0750ED", backgroundColor: "#EAF0FF" },
  stickerGlyph: { fontSize: 23 },
  memoCard: { marginTop: 20, minHeight: 170, padding: 16, gap: 12, borderWidth: 1, borderColor: "#DFE5EF", borderRadius: 18 },
  memoInput: { minHeight: 84, color: "#282B33", fontSize: 14, lineHeight: 22, textAlignVertical: "top" },
  memoCount: { alignSelf: "flex-end", color: "#767A85", fontSize: 11 },
  dispenser: { alignItems: "center", justifyContent: "center", paddingBottom: 48 },
  dispenserBrand: { alignItems: "center", marginBottom: 30 },
  dispenserLogo: { color: "#7C8292", fontFamily: "serif", fontSize: 27, fontStyle: "italic", letterSpacing: 1.2 },
  dispenserTagline: { color: "#252A3A", fontSize: 6, letterSpacing: 1.5, marginTop: -2 },
  dispenserSlot: { width: "100%", height: 8, borderRadius: 5, backgroundColor: "#49382F", zIndex: 2, elevation: 4, shadowColor: "#372921", shadowOpacity: 0.28, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  dispenserOutput: { alignItems: "center", overflow: "hidden", paddingTop: dispenserOutputPadding },
  dispenserStatusRow: { minHeight: 22, marginTop: 22 },
  dispenserStatus: { color: "#252A3A", fontSize: 13, lineHeight: 22, textAlign: "center" },
  dispenserComplete: { fontSize: 16, fontWeight: "700" },
  dispenserAction: { width: "100%", minHeight: 48, marginTop: 22 },
  issueButton: { height: 48, borderRadius: 24, paddingHorizontal: 22, backgroundColor: "#0750ED", justifyContent: "center", alignItems: "center" },
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
