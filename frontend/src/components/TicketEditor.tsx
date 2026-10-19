import {
  createTicketSchema,
  TICKET_TITLE_MAX,
  TICKET_LOCATION_MAX,
  TICKET_MEMO_MAX,
} from "@mind-do/shared";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library/legacy";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  issueTicketOnce,
  loadFrontDraft,
  saveFrontDraft,
  type FrontDraft,
  type IssuedTicket,
} from "../storage/issued-tickets";

type Step =
  | "photos"
  | "frames"
  | "frameConfirm"
  | "decorate"
  | "stickers"
  | "stickerPlace"
  | "text"
  | "textInput"
  | "frontPreview"
  | "backEdit"
  | "changePhoto"
  | "reviewFront"
  | "reviewBack"
  | "issuing"
  | "issued"
  | "archive"
  | "error";

const C = {
  bg: "#FFF8EF",
  brown: "#654C40",
  outline: "#987966",
  gray: "#DFDFDF",
  cream: "#FFF8EF",
  white: "#FFFFFF",
};
const STEPS: Step[] = [
  "photos",
  "frames",
  "frameConfirm",
  "decorate",
  "stickers",
  "stickerPlace",
  "text",
  "textInput",
  "frontPreview",
  "backEdit",
  "changePhoto",
  "reviewFront",
  "reviewBack",
  "issuing",
  "issued",
  "archive",
  "error",
];
const TITLES: Record<Step, string> = {
  photos: "사진 선택",
  frames: "프레임 선택",
  frameConfirm: "프레임 결정",
  decorate: "티켓 꾸미기",
  stickers: "스티커 선택",
  stickerPlace: "스티커 배치",
  text: "텍스트 선택",
  textInput: "텍스트 입력",
  frontPreview: "앞면 미리보기",
  backEdit: "뒷면 디자인",
  changePhoto: "사진 변경하기",
  reviewFront: "저장 전 확인하기 · 앞면",
  reviewBack: "저장 전 확인하기 · 뒷면",
  issuing: "티켓 발권",
  issued: "티켓 발권 완료",
  archive: "내 보관함",
  error: "티켓 생성 오류",
};
const FRAMES = [
  { name: "로즈", color: "#E8CBC2" },
  { name: "그레이", color: "#DFDFDF" },
  { name: "코코아", color: "#947D6D" },
  { name: "로즈", color: "#E8CBC2" },
  { name: "크림", color: "#F2E8DC" },
  { name: "코코아", color: "#947D6D" },
];
// 실제 피그마 스티커 이미지 에셋을 받기 전까지 사용할 임시 스티커입니다.
const STICKER_CATEGORIES = ["최근", "사랑", "축하", "꽃", "동물", "음식", "별"];
const STICKER_ITEMS = [
  { symbol: "📷", category: "최근" },
  { symbol: "🎀", category: "사랑" },
  { symbol: "✨", category: "별" },
  { symbol: "🎁", category: "축하" },
  { symbol: "🌼", category: "꽃" },
  { symbol: "🧸", category: "동물" },
  { symbol: "🐱", category: "동물" },
  { symbol: "🍰", category: "음식" },
  { symbol: "💌", category: "사랑" },
  { symbol: "💖", category: "사랑" },
  { symbol: "🍒", category: "음식" },
  { symbol: "🌟", category: "별" },
  { symbol: "💐", category: "사랑" },
  { symbol: "💕", category: "사랑" },
  { symbol: "🎉", category: "축하" },
  { symbol: "🎈", category: "축하" },
  { symbol: "🦋", category: "꽃" },
  { symbol: "🌷", category: "꽃" },
  { symbol: "🐰", category: "동물" },
  { symbol: "🐻", category: "동물" },
  { symbol: "🐶", category: "동물" },
  { symbol: "🍓", category: "음식" },
  { symbol: "🍩", category: "음식" },
  { symbol: "🍦", category: "음식" },
];
const F = ({
  children,
  onPress,
  selected = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {children}
    </Text>
  </Pressable>
);

type PlacedSticker = { id: number; symbol: string; x: number; y: number };

const DraggableSticker = ({
  item,
  imageWidth,
  imageHeight,
  onMove,
}: {
  item: PlacedSticker;
  imageWidth: number;
  imageHeight: number;
  onMove: (id: number, x: number, y: number) => void;
}) => {
  const position = useRef(new Animated.ValueXY()).current;
  const current = useRef({ x: item.x, y: item.y });
  const moveCallback = useRef(onMove);
  moveCallback.current = onMove;
  current.current = { x: item.x, y: item.y };
  const bounds = useRef({ width: imageWidth, height: imageHeight });
  bounds.current = { width: imageWidth, height: imageHeight };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gesture) => {
        const { width, height } = bounds.current;
        const x = Math.max(
          0,
          Math.min(1, current.current.x + gesture.dx / Math.max(1, width - 36)),
        );
        const y = Math.max(
          0,
          Math.min(
            1,
            current.current.y + gesture.dy / Math.max(1, height - 36),
          ),
        );
        moveCallback.current(item.id, x, y);
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderTerminate: () => position.setValue({ x: 0, y: 0 }),
    }),
  ).current;
  return (
    <Animated.View
      {...pan.panHandlers}
      style={[
        styles.placedSticker,
        {
          left: item.x * Math.max(0, imageWidth - 36),
          top: item.y * Math.max(0, imageHeight - 36),
          transform: position.getTranslateTransform(),
        },
      ]}
    >
      <Text style={styles.placedStickerText}>{item.symbol}</Text>
    </Animated.View>
  );
};

const FONT_OPTIONS = [
  { label: "기본", family: "sans-serif" },
  { label: "명조", family: "serif" },
  { label: "고정폭", family: "monospace" },
] as const;
type TicketFont = (typeof FONT_OPTIONS)[number]["family"];

type FramePreviewProps = {
  editable?: boolean;
  ticketFont?: TicketFont;
  frame: number;
  front: string | null;
  title: string;
  visitDate: string;
  location: string;
  large?: boolean;
  decorateWidth?: number;
  stickers?: PlacedSticker[];
  onStickerMove?: (id: number, x: number, y: number) => void;
  previewOnly?: boolean;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  setLocation: React.Dispatch<React.SetStateAction<string>>;
};

const FramePreview = ({
  editable = false,
  ticketFont = "sans-serif",
  large = false,
  decorateWidth,
  stickers = [],
  onStickerMove,
  previewOnly = false,
  frame,
  front,
  title,
  visitDate,
  location,
  setTitle,
  setLocation,
}: FramePreviewProps) => {
  // 티켓 너비에 비례해 TITLE / DATE / PLACE 라벨과 입력값 크기를 함께 조절합니다.
  const ticketWidth = decorateWidth ?? (large ? 250 : 204);
  const ticketTextSize = Math.max(10, Math.min(14, ticketWidth * 0.052));
  const ticketLabelWidth = ticketWidth * 0.19;
  const ticketTextStyle = { fontFamily: ticketFont, fontSize: ticketTextSize };
  return (
    <View
      style={[
        styles.framePreview,
        large && styles.framePreviewLarge,
        decorateWidth !== undefined && {
          width: decorateWidth,
          height: decorateWidth * (348 / 204),
        },
        { backgroundColor: FRAMES[frame].color },
      ]}
    >
      <View
        style={[
          styles.framePreviewImage,
          large && styles.framePreviewImageLarge,
          decorateWidth !== undefined && {
            height: decorateWidth * (256 / 204),
          },
        ]}
      >
        {front ? (
          <Image
            source={{ uri: front }}
            style={styles.fillImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.fillImage, styles.photoEmpty]}>
            <Text style={styles.muted}>선택한 사진</Text>
          </View>
        )}
        {decorateWidth !== undefined &&
          stickers.map((item) =>
            previewOnly ? (
              <View
                key={item.id}
                pointerEvents="none"
                style={[
                  styles.placedSticker,
                  {
                    left: item.x * Math.max(0, decorateWidth - 18 - 36),
                    top: item.y * Math.max(0, decorateWidth * (256 / 204) - 36),
                  },
                ]}
              >
                <Text style={styles.placedStickerText}>{item.symbol}</Text>
              </View>
            ) : (
              <DraggableSticker
                key={item.id}
                item={item}
                imageWidth={decorateWidth - 18}
                imageHeight={decorateWidth * (256 / 204)}
                onMove={onStickerMove ?? (() => {})}
              />
            ),
          )}
      </View>
      <View style={styles.frameMeta}>
        {editable ? (
          <TextInput
            style={[styles.frameMetaInput, ticketTextStyle]}
            showSoftInputOnFocus={true}
            keyboardType="default"
            value={title}
            onChangeText={setTitle}
            onBlur={() => setTitle((value) => value.slice(0, TICKET_TITLE_MAX))}
            placeholder="TITLE"
            placeholderTextColor="#292929"
            maxLength={TICKET_TITLE_MAX}
            accessibilityLabel={`티켓 제목 입력 (최대 ${TICKET_TITLE_MAX}자)`}
          />
        ) : (
          <View style={styles.ticketMetaRow}>
            <Text
              style={[
                styles.ticketMetaLabel,
                ticketTextStyle,
                { width: ticketLabelWidth },
              ]}
            >
              TITLE
            </Text>
            <Text style={[styles.ticketMetaValue, ticketTextStyle]}>
              {title}
            </Text>
          </View>
        )}
        <View style={styles.ticketMetaRow}>
          <Text
            style={[
              styles.ticketMetaLabel,
              ticketTextStyle,
              { width: ticketLabelWidth },
            ]}
          >
            DATE
          </Text>
          <Text style={[styles.ticketMetaValue, ticketTextStyle]}>
            {visitDate}
          </Text>
        </View>
        {editable ? (
          <TextInput
            style={[styles.frameMetaInput, ticketTextStyle]}
            showSoftInputOnFocus={true}
            keyboardType="default"
            value={location}
            onChangeText={setLocation}
            onBlur={() =>
              setLocation((value) => value.slice(0, TICKET_LOCATION_MAX))
            }
            placeholder="PLACE"
            placeholderTextColor="#292929"
            maxLength={TICKET_LOCATION_MAX}
            accessibilityLabel={`티켓 장소 입력 (최대 ${TICKET_LOCATION_MAX}자)`}
          />
        ) : (
          <View style={styles.ticketMetaRow}>
            <Text
              style={[
                styles.ticketMetaLabel,
                ticketTextStyle,
                { width: ticketLabelWidth },
              ]}
            >
              PLACE
            </Text>
            <Text style={[styles.ticketMetaValue, ticketTextStyle]}>
              {location}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const BACK_COLORS = [
  "#E8D8CA",
  "#DFDFDF",
  "#654C40",
  "#987966",
  "#B69986",
  "#CF897C",
  "#F0C8BE",
  "#FFFDF8",
  "#B8BEB0",
  "#681D1D",
];
// 후속 Issue #25: 원본의 뒷면 사진 3개 제한을 확정된 첨부 정책으로 교체한다.
const TEMP_BACK_PHOTO_LIMIT = 3;

// 뒷면 미리보기: 긴 글은 티켓 크기를 늘리지 않고 팝업으로 보여줍니다.
function BackTicketContent({
  photos,
  text,
  visitDate,
  color,
  onMore,
}: {
  photos: string[];
  text: string;
  visitDate: string;
  color: string;
  onMore: () => void;
}) {
  const shortened = Array.from(text).length > 34;
  return (
    <View style={[styles.backTicketInner, { backgroundColor: color }]}>
      <Text style={styles.backTicketLogo}>MEMO:RE</Text>
      <View style={styles.backTicketRule} />
      <View style={styles.backPhotoGrid}>
        {photos.slice(0, TEMP_BACK_PHOTO_LIMIT).map((uri, i) => (
          <Image
            key={`${i}-${uri}`}
            source={{ uri }}
            resizeMode="cover"
            style={[
              styles.backGridImage,
              photos.length === 1 && styles.backGridImageSingle,
            ]}
          />
        ))}
        {photos.length === 0 && (
          <Text style={styles.backEmptyPhoto}>
            사진을 추가해 주세요 (최대 3장)
          </Text>
        )}
      </View>
      {text.trim().length > 0 && (
        <View style={styles.backPreviewTextWrap}>
          <Text style={styles.backPreviewText} numberOfLines={2}>
            {text}
          </Text>
          {shortened && (
            <Pressable
              onPress={onMore}
              accessibilityRole="button"
              accessibilityLabel="뒷면 글 더보기"
            >
              <Text style={styles.backMore}>더보기 ›</Text>
            </Pressable>
          )}
        </View>
      )}
      <Text style={styles.backTicketDate}>{visitDate}</Text>
    </View>
  );
}
function BackTextModal({
  text,
  onClose,
}: {
  text: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={text !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backModalShade}>
        <View style={styles.backModalCard}>
          <Text style={styles.backModalTitle}>기억 보관함</Text>
          <ScrollView style={{ maxHeight: 250 }}>
            <Text style={styles.backModalText}>{text}</Text>
          </ScrollView>
          <Pressable style={styles.backModalClose} onPress={onClose}>
            <Text style={styles.backPhotoButtonText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const Action = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <View style={styles.bottomWrap}>
    <Pressable style={styles.action} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  </View>
);

type TicketCreationScreenProps = {
  onBackHome?: () => void;
  selectedVisitDate?: string;
  issuedTicket?: IssuedTicket | null;
  onCreateNew?: () => void;
};

export default function TicketCreationScreen({
  onBackHome,
  selectedVisitDate,
  issuedTicket = null,
  onCreateNew,
}: TicketCreationScreenProps = {}) {
  const { width, height } = useWindowDimensions();
  // 1-2-4 / 1-2-5 전용: 기본 티켓의 약 1.25배. 작은 화면에서는 탭과 헤더를 침범하지 않도록 제한.
  const decorateWidth = Math.max(
    150,
    Math.min(255, width - 40, (height - 250) * (204 / 348)),
  );
  // 스티커 선택 패널이 열리면 티켓이 패널과 겹치지 않도록 축소합니다.
  const stickerEditWidth = Math.max(
    110,
    Math.min(decorateWidth, (height - 460) * (204 / 348)),
  );
  const cell = width / 3;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const [step, setStep] = useState<Step>("photos");
  const [front, setFront] = useState<string | null>(null);
  const [backs, setBacks] = useState<string[]>([]);
  const [frame, setFrame] = useState(0);
  const [frameChosen, setFrameChosen] = useState(false);
  const [sticker, setSticker] = useState("");
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [stickerCategory, setStickerCategory] = useState("최근");
  const [stickerSearch, setStickerSearch] = useState("");
  const [recentStickers, setRecentStickers] = useState<string[]>([]);
  const stickerId = useRef(0);
  const addSticker = (symbol: string) => {
    setRecentStickers((prev) => [
      symbol,
      ...prev.filter((item) => item !== symbol),
    ]);
    stickerId.current += 1;
    setPlacedStickers((prev) => [
      ...prev,
      { id: stickerId.current, symbol, x: 0.42, y: 0.42 },
    ]);
  };
  const moveSticker = (id: number, x: number, y: number) => {
    setPlacedStickers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x, y } : item)),
    );
  };
  const [caption, setCaption] = useState("");
  const [ticketFont, setTicketFont] = useState<TicketFont>("sans-serif");
  const [textEditorTab, setTextEditorTab] = useState<"keyboard" | "font">(
    "keyboard",
  );
  const [title, setTitle] = useState("");
  const [visitDate, setVisitDate] = useState(selectedVisitDate ?? "");
  const [location, setLocation] = useState("");
  const [backStyle, setBackStyle] = useState(0);
  const [memo, setMemo] = useState("");
  const [backColor, setBackColor] = useState("#F2E8DC");
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [tab, setTab] = useState(1);
  const [savedDraft, setSavedDraft] = useState<FrontDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftSaving, setDraftSaving] = useState(false);
  useEffect(() => {
    let active = true;
    loadFrontDraft(FRAMES.length)
      .then((draft) => {
        if (active) setSavedDraft(draft);
      })
      .catch(() => {
        if (active) Alert.alert("임시저장", "저장된 작업을 불러오지 못했어요.");
      })
      .finally(() => {
        if (active) setDraftLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const saveDraft = async () => {
    if (draftSaving) return;
    const draft: FrontDraft = {
      front,
      frame,
      frameChosen,
      sticker,
      placedStickers,
      caption,
      ticketFont,
      title,
      visitDate,
      location,
      savedAt: new Date().toISOString(),
    };
    setDraftSaving(true);
    try {
      const saved = await saveFrontDraft(draft, FRAMES.length);
      setSavedDraft(saved);
      Alert.alert("임시저장 완료", "마지막 앞면 작업 1개를 저장했어요.");
    } catch {
      Alert.alert("임시저장 실패", "저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setDraftSaving(false);
    }
  };
  const restoreDraft = () => {
    if (!savedDraft) return;
    setFront(savedDraft.front);
    setFrame(savedDraft.frame);
    setFrameChosen(savedDraft.frameChosen);
    setSticker(savedDraft.sticker);
    setPlacedStickers(savedDraft.placedStickers);
    stickerId.current = Math.max(
      0,
      ...savedDraft.placedStickers.map((item) => item.id),
    );
    setCaption(savedDraft.caption);
    setTicketFont(savedDraft.ticketFont);
    setTitle(savedDraft.title);
    setVisitDate(selectedVisitDate ?? savedDraft.visitDate);
    setLocation(savedDraft.location);
    go("decorate");
  };

  // 기기 사진을 60장씩 불러와 3열로 표시합니다.
  const [galleryPhotos, setGalleryPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [galleryCursor, setGalleryCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const galleryBusy = useRef(false);

  const loadGallery = async (after?: string, append = false) => {
    if (galleryBusy.current) return;
    galleryBusy.current = true;
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false, [
        "photo",
      ]);
      if (!permission.granted) {
        setGalleryError(
          "사진 접근 권한이 필요해요. 기기 설정에서 허용해 주세요.",
        );
        return;
      }
      const result = await MediaLibrary.getAssetsAsync({
        first: 60,
        after,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      setGalleryPhotos((previous) =>
        append ? [...previous, ...result.assets] : result.assets,
      );
      setGalleryCursor(result.endCursor);
      setHasNextPage(result.hasNextPage);
    } catch {
      setGalleryError(
        "사진을 불러오지 못했어요. 사진 권한을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      galleryBusy.current = false;
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (!issuedTicket && step === "photos" && galleryPhotos.length === 0) {
      void loadGallery();
    }
  }, [step]);

  const go = (s: Step) => setStep(s);
  const returnHome = () => {
    if (onBackHome) onBackHome();
    else go("photos");
  };
  const back = () => {
    if (step === "photos") {
      returnHome();
      return;
    }
    if (step === "frontPreview") {
      go("decorate");
      return;
    }
    if (step === "reviewFront") {
      go("backEdit");
      return;
    }
    if (step === "stickers") {
      go("decorate");
      return;
    }
    if (step === "stickerPlace") {
      go("stickers");
      return;
    }
    if (step === "text") {
      go("decorate");
      return;
    }
    if (step === "textInput") {
      Keyboard.dismiss();
      go("text");
      return;
    }
    const idx = STEPS.indexOf(step);
    if (idx > 0) go(STEPS[idx - 1]);
  };

  const pick = async (forBack = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: forBack,
        selectionLimit: forBack ? TEMP_BACK_PHOTO_LIMIT : 1,
        quality: 0.9,
      });
      if (result.canceled) return;
      const uris = result.assets.map((a) => a.uri);
      if (forBack) setBacks(uris.slice(0, TEMP_BACK_PHOTO_LIMIT));
      else setFront(uris[0] ?? null);
    } catch {
      Alert.alert("사진 선택 오류", "갤러리를 열 수 없습니다.");
    }
  };
  const shoot = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("카메라 권한 필요", "카메라 사용 권한을 허용해 주세요.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      if (!result.canceled) setFront(result.assets[0]?.uri ?? null);
    } catch {
      Alert.alert(
        "카메라 오류",
        "카메라를 실행할 수 없어요. 갤러리에서 사진을 선택하거나 다시 시도해 주세요.",
      );
    }
  };

  const nextFromPhotos = () => {
    go("frames");
  };
  const renderTicket = ({ backSide = false }: { backSide?: boolean }) => (
    <View
      style={[
        styles.ticket,
        frame === 1 && styles.ticketFilm,
        frame === 2 && styles.ticketPolaroid,
        backSide && styles.backTicketShell,
        backSide && { backgroundColor: backColor },
      ]}
    >
      {backSide ? (
        <BackTicketContent
          photos={backs}
          text={memo}
          visitDate={visitDate}
          color={backColor}
          onMore={() => setExpandedText(memo)}
        />
      ) : (
        <>
          {front ? (
            <Image
              source={{ uri: front }}
              style={styles.ticketImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.ticketImage, styles.photoEmpty]}>
              <Text style={styles.muted}>사진 없음</Text>
            </View>
          )}
          <Text style={styles.ticketCaption}>
            {sticker} {caption || "MEMO:RE"}
          </Text>
          <Text style={[styles.ticketDetail, { fontFamily: ticketFont }]}>
            {"TITLE  " + title}
          </Text>
          <Text style={[styles.ticketDetail, { fontFamily: ticketFont }]}>
            {"DATE  " + visitDate}
          </Text>
          <Text style={[styles.ticketDetail, { fontFamily: ticketFont }]}>
            {"PLACE  " + location}
          </Text>
        </>
      )}
    </View>
  );
  // 1-2-3 프레임 선택 화면 전용 미리보기. 이후 꾸미기 화면의 Ticket은 유지합니다.

  const renderFrameSelection = ({
    confirmed = false,
  }: {
    confirmed?: boolean;
  }) => (
    <View style={styles.frameScreen}>
      <Text style={styles.frameHelper}>
        선택한 사진에 어울리는 티켓 디자인을 골라주세요.
      </Text>
      <View style={styles.framePreviewArea}>
        <FramePreview
          ticketFont={ticketFont}
          large
          frame={frame}
          front={front}
          title={title}
          visitDate={visitDate}
          location={location}
          setTitle={setTitle}
          setLocation={setLocation}
        />
      </View>
      <View style={styles.framePickerArea}>
        <Text style={styles.frameSectionTitle}>프레임 스타일</Text>
        <View style={styles.frameSectionRule} />
        <ScrollView
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
          style={styles.frameVerticalList}
          contentContainerStyle={styles.frameVerticalScroll}
        >
          {FRAMES.map((item, index) => (
            <Pressable
              key={`${item.name}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} 프레임 선택`}
              accessibilityState={{ selected: frameChosen && frame === index }}
              onPress={() => {
                setFrame(index);
                setFrameChosen(true);
                if (!confirmed) go("frameConfirm");
              }}
              style={[
                styles.frameOption,
                frameChosen && frame === index && styles.frameOptionSelected,
              ]}
            >
              <View
                style={[styles.frameSwatch, { backgroundColor: item.color }]}
              />
              <Text
                style={[
                  styles.frameOptionText,
                  frameChosen &&
                    frame === index &&
                    styles.frameOptionTextSelected,
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {(confirmed || frameChosen) && (
        <Action label="프레임 선택 완료 →" onPress={() => go("decorate")} />
      )}
    </View>
  );

  const [issuingTicket, setIssuingTicket] = useState(false);
  const [readOnlyBack, setReadOnlyBack] = useState(false);

  const resetTicket = () => {
    setFront(null);
    setBacks([]);
    setFrame(0);
    setFrameChosen(false);
    setSticker("");
    setPlacedStickers([]);
    stickerId.current = 0;
    setCaption("");
    setTicketFont("sans-serif");
    setTitle("");
    setLocation("");
    setBackStyle(0);
    setMemo("");
    setBackColor("#F2E8DC");
    setVisitDate("");
    setTab(1);
    if (onCreateNew) onCreateNew();
    else {
      returnHome();
    }
  };

  const finishIssuing = async () => {
    if (issuingTicket) return;
    const input = createTicketSchema.safeParse({
      title,
      location,
      visitDate: visitDate.trim().replaceAll(".", "-"),
      memo,
    });
    if (!input.success) {
      Alert.alert(
        "입력 확인",
        "제목, 장소와 달력에서 선택한 날짜를 확인해 주세요.",
      );
      return;
    }
    setIssuingTicket(true);
    try {
      const snapshot: IssuedTicket = {
        visitDate: input.data.visitDate,
        front,
        backs,
        frame,
        placedStickers,
        caption,
        sticker,
        ticketFont,
        title: input.data.title,
        location: input.data.location,
        backStyle,
        memo,
        backColor,
        issuedAt: new Date().toISOString(),
      };
      const created = await issueTicketOnce(snapshot);
      if (!created) {
        Alert.alert(
          "이미 발권한 날짜",
          "이 날짜에는 이미 티켓이 있어요. 달력에서 기존 티켓을 확인해 주세요.",
        );
        returnHome();
        return;
      }
      go("issued");
    } catch {
      Alert.alert("발권 실패", "티켓을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIssuingTicket(false);
    }
  };

  const content = () => {
    switch (step) {
      case "photos":
        return (
          <>
            <Text style={styles.helper}>
              사진은 선택 사항이에요. 앞면 1장, 뒷면 최대{" "}
              {TEMP_BACK_PHOTO_LIMIT}장을 선택할 수 있습니다.
            </Text>
            {!selectedVisitDate && (
              <TextInput
                accessibilityLabel="방문 날짜, YYYY-MM-DD 형식"
                value={visitDate}
                onChangeText={setVisitDate}
                placeholder="방문 날짜 (YYYY-MM-DD)"
                autoCapitalize="none"
                style={styles.backTextInput}
              />
            )}
            <View style={styles.rule} />
            <View style={styles.filterContainer}>
              {["임시 저장", "최근 항목"].map((name, i) => (
                <F key={name} selected={tab === i} onPress={() => setTab(i)}>
                  {name}
                </F>
              ))}
            </View>
            {tab === 0 ? (
              <View style={styles.draftArea}>
                {draftLoading ? (
                  <Text style={styles.info}>
                    임시저장을 확인하는 중이에요...
                  </Text>
                ) : savedDraft ? (
                  <Pressable
                    style={styles.draftCard}
                    onPress={restoreDraft}
                    accessibilityRole="button"
                    accessibilityLabel="임시저장한 티켓 이어서 편집"
                  >
                    {savedDraft.front ? (
                      <Image
                        source={{ uri: savedDraft.front }}
                        style={styles.draftThumbnail}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={styles.draftInfo}>
                      <Text style={styles.draftTitle}>
                        {savedDraft.title || "제목 없는 티켓"}
                      </Text>
                      <Text style={styles.draftDescription}>
                        마지막 임시저장 · 이어서 편집하기 →
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <Text style={styles.info}>임시저장된 티켓이 없어요.</Text>
                )}
              </View>
            ) : (
              <FlatList
                style={styles.gallery}
                data={[{ id: "__camera__", uri: "" }, ...galleryPhotos]}
                numColumns={3}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.galleryGrid}
                onEndReached={() => {
                  if (hasNextPage && !galleryLoading && !galleryError) {
                    void loadGallery(galleryCursor, true);
                  }
                }}
                onEndReachedThreshold={0.5}
                renderItem={({ item }) =>
                  item.id === "__camera__" ? (
                    <Pressable
                      style={[styles.cameraTile, { width: cell, height: cell }]}
                      onPress={shoot}
                    >
                      <Text style={styles.cameraIcon}>◎</Text>
                      <Text style={styles.cameraText}>촬영하기</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.galleryItem,
                        { width: cell, height: cell },
                      ]}
                      onPress={() => setFront(item.uri)}
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.fillImage}
                        resizeMode="cover"
                      />
                      {front === item.uri && (
                        <View style={styles.selected}>
                          <Text style={styles.selectedText}>✓</Text>
                        </View>
                      )}
                    </Pressable>
                  )
                }
                ListFooterComponent={
                  galleryError ? (
                    <View style={styles.galleryMessage}>
                      <Text style={styles.info}>{galleryError}</Text>
                      <Pressable onPress={() => void loadGallery()}>
                        <Text style={styles.retryText}>다시 시도</Text>
                      </Pressable>
                    </View>
                  ) : galleryLoading ? (
                    <Text style={styles.info}>사진을 불러오는 중이에요...</Text>
                  ) : galleryPhotos.length === 0 ? (
                    <Text style={styles.info}>
                      기기에 저장된 사진이 없어요.
                    </Text>
                  ) : null
                }
              />
            )}
            <Action
              label="사진 선택 완료   ·   프레임 고르기  →"
              onPress={nextFromPhotos}
            />
          </>
        );
      case "frames":
        return renderFrameSelection({});
      case "frameConfirm":
        return renderFrameSelection({ confirmed: true });
      case "decorate":
      case "stickerPlace":
        return (
          <View style={styles.decorateScreen}>
            <View
              style={[
                styles.decoratePreviewArea,
                keyboardVisible && styles.decoratePreviewAreaKeyboard,
              ]}
            >
              <FramePreview
                ticketFont={ticketFont}
                decorateWidth={decorateWidth}
                stickers={placedStickers}
                onStickerMove={moveSticker}
                frame={frame}
                front={front}
                title={title}
                visitDate={visitDate}
                location={location}
                setTitle={setTitle}
                setLocation={setLocation}
              />
            </View>
            {!keyboardVisible && (
              <View style={styles.decorateTabs}>
                {(
                  [
                    { label: "프레임", target: "frames" },
                    { label: "스티커", target: "stickers" },
                    { label: "텍스트", target: "textInput" },
                  ] as const
                ).map((item) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole="tab"
                    accessibilityState={{
                      selected:
                        item.target ===
                        (step === "stickerPlace" ? "stickers" : "frames"),
                    }}
                    style={styles.decorateTab}
                    onPress={() => go(item.target)}
                  >
                    <Text
                      style={[
                        styles.decorateTabText,
                        item.target ===
                          (step === "stickerPlace" ? "stickers" : "frames") &&
                          styles.decorateTabTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      case "stickers":
        return (
          <View style={styles.stickerEditorScreen}>
            <View style={styles.stickerEditorPreview}>
              <FramePreview
                ticketFont={ticketFont}
                decorateWidth={stickerEditWidth}
                stickers={placedStickers}
                onStickerMove={moveSticker}
                frame={frame}
                front={front}
                title={title}
                visitDate={visitDate}
                location={location}
                setTitle={setTitle}
                setLocation={setLocation}
              />
            </View>
            <View style={styles.stickerSheet}>
              <View style={styles.stickerSheetToolbar}>
                <Pressable
                  accessibilityLabel="스티커 배치 취소"
                  onPress={() => go("decorate")}
                >
                  <Text style={styles.stickerSheetCancel}>×</Text>
                </Pressable>
                <Text style={styles.stickerSheetTitle}>스티커 선택</Text>
                <Pressable
                  accessibilityLabel="스티커 배치 확정"
                  onPress={() => go("stickerPlace")}
                >
                  <Text style={styles.stickerSheetConfirm}>✓</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stickerCategoryRow}
              >
                {STICKER_CATEGORIES.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => setStickerCategory(category)}
                  >
                    <Text
                      style={[
                        styles.stickerCategoryText,
                        stickerCategory === category &&
                          styles.stickerCategoryActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                style={styles.stickerSearchInput}
                placeholder="⌕  스티커 검색"
                placeholderTextColor="#B9AAA0"
                value={stickerSearch}
                onChangeText={setStickerSearch}
                returnKeyType="search"
              />
              <ScrollView
                style={styles.stickerGridScroll}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.stickerGrid}
              >
                {(stickerCategory === "최근" && recentStickers.length > 0
                  ? recentStickers
                      .map((symbol) =>
                        STICKER_ITEMS.find((item) => item.symbol === symbol),
                      )
                      .filter(
                        (item): item is (typeof STICKER_ITEMS)[number] =>
                          item !== undefined,
                      )
                  : STICKER_ITEMS.filter(
                      (item) =>
                        stickerCategory === "최근" ||
                        item.category === stickerCategory,
                    )
                )
                  .filter(
                    (item) =>
                      stickerSearch.trim() === "" ||
                      item.symbol.includes(stickerSearch.trim()) ||
                      item.category.includes(stickerSearch.trim()),
                  )
                  .map((item, index) => (
                    <Pressable
                      key={`${item.symbol}-${index}`}
                      style={styles.stickerGridItem}
                      accessibilityLabel={`${item.symbol} 스티커 추가`}
                      onPress={() => {
                        Keyboard.dismiss();
                        addSticker(item.symbol);
                      }}
                    >
                      <Text style={styles.stickerGridEmoji}>{item.symbol}</Text>
                    </Pressable>
                  ))}
              </ScrollView>
              <View style={styles.stickerSheetFooter}>
                <Pressable
                  onPress={() => setPlacedStickers((prev) => prev.slice(0, -1))}
                >
                  <Text style={styles.stickerUndo}>마지막 스티커 삭제</Text>
                </Pressable>
                {/* <Pressable onPress={() => go('stickerPlace')} style={styles.stickerApplyButton}>
                  <Text style={styles.stickerApplyText}>배치 완료 ✓</Text>
                </Pressable> */}
              </View>
            </View>
          </View>
        );
      case "text":
        return (
          <View style={styles.decorateScreen}>
            <View style={styles.decoratePreviewArea}>
              <FramePreview
                ticketFont={ticketFont}
                decorateWidth={decorateWidth}
                stickers={placedStickers}
                onStickerMove={moveSticker}
                frame={frame}
                front={front}
                title={title}
                visitDate={visitDate}
                location={location}
                setTitle={setTitle}
                setLocation={setLocation}
              />
            </View>
            <View style={styles.decorateTabs}>
              {(
                [
                  { label: "프레임", target: "frames" },
                  { label: "스티커", target: "stickers" },
                  { label: "텍스트", target: "textInput" },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.label}
                  style={styles.decorateTab}
                  onPress={() => go(item.target)}
                >
                  <Text
                    style={[
                      styles.decorateTabText,
                      item.target === "textInput" &&
                        styles.decorateTabTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      case "textInput":
        return (
          <View style={styles.textEditorScreen}>
            {!keyboardVisible && (
              <View style={styles.textEditorPreview}>
                <FramePreview
                  ticketFont={ticketFont}
                  decorateWidth={
                    keyboardVisible
                      ? Math.min(150, stickerEditWidth)
                      : decorateWidth
                  }
                  stickers={placedStickers}
                  onStickerMove={moveSticker}
                  frame={frame}
                  front={front}
                  title={title}
                  visitDate={visitDate}
                  location={location}
                  setTitle={setTitle}
                  setLocation={setLocation}
                />
              </View>
            )}
            <View
              style={[
                styles.textEditorSheet,
                keyboardVisible && styles.textEditorSheetKeyboard,
              ]}
            >
              <View style={styles.textEditorToolbar}>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    go("text");
                  }}
                >
                  <Text style={styles.stickerSheetCancel}>×</Text>
                </Pressable>
                <Text style={styles.stickerSheetTitle}>텍스트 입력</Text>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    go("text");
                  }}
                >
                  <Text style={styles.stickerSheetConfirm}>✓</Text>
                </Pressable>
              </View>
              <View style={styles.textEditorTabRow}>
                {(
                  [
                    { key: "keyboard", label: "키보드" },
                    { key: "font", label: "폰트" },
                  ] as const
                ).map((tabItem) => (
                  <Pressable
                    key={tabItem.key}
                    accessibilityRole="tab"
                    accessibilityState={{
                      selected: textEditorTab === tabItem.key,
                    }}
                    style={[
                      styles.textEditorTabButton,
                      textEditorTab === tabItem.key &&
                        styles.textEditorTabButtonActive,
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setTextEditorTab(tabItem.key);
                    }}
                  >
                    <Text
                      style={[
                        styles.textEditorTabText,
                        textEditorTab === tabItem.key &&
                          styles.textEditorTabTextActive,
                      ]}
                    >
                      {tabItem.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {textEditorTab === "keyboard" && (
                <ScrollView
                  keyboardShouldPersistTaps="always"
                  keyboardDismissMode="none"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.textFields}
                >
                  <View style={styles.textFieldRow}>
                    <Text style={styles.textFieldLabel}>TITLE</Text>
                    <TextInput
                      style={styles.textFieldInput}
                      value={title}
                      onChangeText={setTitle}
                      maxLength={TICKET_TITLE_MAX}
                      onBlur={() =>
                        setTitle((value) => value.slice(0, TICKET_TITLE_MAX))
                      }
                      placeholder={`제목 입력 (최대 ${TICKET_TITLE_MAX}자)`}
                      placeholderTextColor="#B9AAA0"
                      autoCorrect={false}
                      returnKeyType="done"
                      accessibilityLabel={`TITLE 제목 입력, 최대 ${TICKET_TITLE_MAX}자`}
                    />
                  </View>
                  <View style={styles.textFieldRow}>
                    <Text style={styles.textFieldLabel}>DATE</Text>
                    <Text style={styles.textDatePlaceholder}>
                      {visitDate || "달력 연동 예정"}
                    </Text>
                  </View>
                  <View style={styles.textFieldRow}>
                    <Text style={styles.textFieldLabel}>PLACE</Text>
                    <TextInput
                      style={styles.textFieldInput}
                      value={location}
                      onChangeText={setLocation}
                      maxLength={TICKET_LOCATION_MAX}
                      onBlur={() =>
                        setLocation((value) =>
                          value.slice(0, TICKET_LOCATION_MAX),
                        )
                      }
                      placeholder={`장소 입력 (최대 ${TICKET_LOCATION_MAX}자)`}
                      placeholderTextColor="#B9AAA0"
                      returnKeyType="done"
                      accessibilityLabel={`PLACE 장소 입력, 최대 ${TICKET_LOCATION_MAX}자`}
                    />
                  </View>
                </ScrollView>
              )}
              {textEditorTab === "font" && (
                <ScrollView
                  style={styles.fontGridScroll}
                  contentContainerStyle={styles.fontGrid}
                >
                  {FONT_OPTIONS.map((option) => (
                    <Pressable
                      key={option.family}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: ticketFont === option.family,
                      }}
                      onPress={() => setTicketFont(option.family)}
                      style={[
                        styles.fontGridCard,
                        ticketFont === option.family &&
                          styles.fontGridCardActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.fontGridSample,
                          { fontFamily: option.family },
                        ]}
                      >
                        가나다 ABC
                      </Text>
                      <Text style={styles.fontGridLabel}>{option.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        );
      case "frontPreview":
        return (
          <>
            <View style={styles.frontPreviewCenter}>
              <View style={{ marginTop: -90 }}>
                <FramePreview
                  previewOnly
                  ticketFont={ticketFont}
                  decorateWidth={decorateWidth}
                  stickers={placedStickers}
                  frame={frame}
                  front={front}
                  title={title}
                  visitDate={visitDate}
                  location={location}
                  setTitle={setTitle}
                  setLocation={setLocation}
                />
              </View>
            </View>
            <Action label="뒷면 꾸미기  →" onPress={() => go("backEdit")} />
          </>
        );
      case "backEdit":
        return (
          <View style={styles.backEditScreen}>
            <ScrollView
              contentContainerStyle={[
                styles.backEditScroll,
                keyboardVisible && styles.backEditScrollKeyboard,
              ]}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
            >
              {!keyboardVisible && (
                <View style={styles.backEditIntro}>
                  <Text style={styles.backEditTitle}>기억 보관함</Text>
                  <Text style={styles.backEditSubtitle}>
                    소중한 순간을 차곡차곡 저장
                  </Text>
                </View>
              )}
              {!keyboardVisible && renderTicket({ backSide: true })}
              {!keyboardVisible && (
                <View style={styles.backPalette}>
                  {BACK_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      accessibilityLabel={`뒷면 색상 ${color}`}
                      accessibilityState={{ selected: backColor === color }}
                      onPress={() => setBackColor(color)}
                      style={[
                        styles.backColorChip,
                        { backgroundColor: color },
                        backColor === color && styles.backColorSelected,
                      ]}
                    />
                  ))}
                </View>
              )}
              {!keyboardVisible && (
                <Pressable
                  style={styles.backPhotoButton}
                  onPress={() => void pick(true)}
                >
                  <Text style={styles.backPhotoButtonText}>
                    사진 추가 및 변경 ({backs.length}/{TEMP_BACK_PHOTO_LIMIT})
                  </Text>
                </Pressable>
              )}
              <Text style={styles.backInputLabel}>
                뒷면에 남길 글 · 최대 {TICKET_MEMO_MAX}자
              </Text>
              <TextInput
                style={styles.backTextInput}
                multiline
                maxLength={TICKET_MEMO_MAX}
                value={memo}
                onChangeText={setMemo}
                placeholder="이날의 기억을 적어 주세요"
                placeholderTextColor="#987966"
              />
              <Text style={styles.backCount}>{Array.from(memo).length}/80</Text>
            </ScrollView>
            {keyboardVisible ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="텍스트 입력 완료"
                style={styles.backInputDoneButton}
                onPress={() => Keyboard.dismiss()}
              >
                <Text style={styles.backInputDoneText}>텍스트 입력 완료</Text>
              </Pressable>
            ) : (
              <Action
                label="티켓 저장 단계로  →"
                onPress={() => go("reviewFront")}
              />
            )}
          </View>
        );
      case "changePhoto":
        return (
          <>
            <View style={styles.center}>
              {renderTicket({ backSide: true })}
            </View>
            <View style={styles.options}>
              <F onPress={() => void pick(false)}>앞면 사진 변경</F>
              <F onPress={() => void pick(true)}>
                뒷면 사진 변경 (최대 {TEMP_BACK_PHOTO_LIMIT}장)
              </F>
            </View>
            <Action
              label="저장 전 확인하기  →"
              onPress={() => go("reviewFront")}
            />
          </>
        );
      case "reviewFront":
        return (
          <>
            <View style={styles.reviewCenter}>
              <View style={styles.reviewTicketOffset}>
                <FramePreview
                  previewOnly
                  ticketFont={ticketFont}
                  decorateWidth={decorateWidth}
                  stickers={placedStickers}
                  frame={frame}
                  front={front}
                  title={title}
                  visitDate={visitDate}
                  location={location}
                  setTitle={setTitle}
                  setLocation={setLocation}
                />
              </View>
            </View>
            <Action label="뒷면 확인하기  →" onPress={() => go("reviewBack")} />
          </>
        );
      case "reviewBack":
        return (
          <>
            <View style={styles.reviewCenter}>
              <View style={styles.reviewTicketOffset}>
                <View
                  style={[
                    styles.reviewBackShell,
                    {
                      width: decorateWidth,
                      height: decorateWidth * (348 / 204),
                      backgroundColor: backColor,
                    },
                  ]}
                >
                  <BackTicketContent
                    photos={backs}
                    text={memo}
                    visitDate={visitDate}
                    color={backColor}
                    onMore={() => setExpandedText(memo)}
                  />
                </View>
              </View>
            </View>
            <Action label="티켓 발권하기  →" onPress={() => go("issuing")} />
          </>
        );
      case "issuing":
        return (
          <>
            <View style={styles.center}>
              <Text style={styles.big}>티켓을 발권하고 있어요</Text>
              <Text style={styles.info}>
                발권 버튼을 눌러 완료 화면으로 이동해요.
              </Text>
            </View>
            <Action
              label={issuingTicket ? "발권 중..." : "발권 완료  →"}
              onPress={() => void finishIssuing()}
            />
          </>
        );
      case "issued":
        return (
          <>
            <View style={styles.frontPreviewCenter}>
              <View style={styles.issuedTicketPosition}>
                <Text style={styles.issuedTitle}>티켓 발권 완료!</Text>
                <FramePreview
                  previewOnly
                  ticketFont={ticketFont}
                  decorateWidth={decorateWidth}
                  stickers={placedStickers}
                  frame={frame}
                  front={front}
                  title={title}
                  visitDate={visitDate}
                  location={location}
                  setTitle={setTitle}
                  setLocation={setLocation}
                />
              </View>
            </View>
            <Action
              label="내 보관함에서 보기  →"
              onPress={() => go("archive")}
            />
          </>
        );
      case "archive":
        return (
          <>
            <View style={styles.center}>
              <View style={styles.archiveTicketOffset}>
                <FramePreview
                  previewOnly
                  ticketFont={ticketFont}
                  decorateWidth={decorateWidth}
                  stickers={placedStickers}
                  frame={frame}
                  front={front}
                  title={title}
                  visitDate={visitDate}
                  location={location}
                  setTitle={setTitle}
                  setLocation={setLocation}
                />
              </View>
            </View>
            <Action label="새 티켓 만들기" onPress={resetTicket} />
          </>
        );
      case "error":
        return (
          <>
            <View style={styles.center}>
              <Text style={styles.big}>티켓 생성에 실패했어요.</Text>
            </View>
            <Action label="다시 시도하기" onPress={() => go("reviewBack")} />
          </>
        );
    }
  };
  if (issuedTicket) {
    const readOnlyFrame = Math.max(
      0,
      Math.min(FRAMES.length - 1, issuedTicket.frame),
    );
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <BackTextModal
          text={expandedText}
          onClose={() => setExpandedText(null)}
        />
        <View style={styles.header}>
          <Pressable onPress={returnHome} style={styles.back}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            발권한 티켓 · {readOnlyBack ? "뒷면" : "앞면"}
          </Text>
        </View>
        <View style={styles.center}>
          {readOnlyBack ? (
            <View
              style={[
                styles.reviewBackShell,
                {
                  width: decorateWidth,
                  height: decorateWidth * (348 / 204),
                  backgroundColor: issuedTicket.backColor ?? "#F2E8DC",
                },
              ]}
            >
              <BackTicketContent
                photos={issuedTicket.backs ?? []}
                text={issuedTicket.memo ?? ""}
                visitDate={issuedTicket.visitDate}
                color={issuedTicket.backColor ?? "#F2E8DC"}
                onMore={() => setExpandedText(issuedTicket.memo ?? "")}
              />
            </View>
          ) : (
            <FramePreview
              previewOnly
              ticketFont={issuedTicket.ticketFont}
              decorateWidth={decorateWidth}
              stickers={issuedTicket.placedStickers}
              frame={readOnlyFrame}
              front={issuedTicket.front}
              title={issuedTicket.title}
              visitDate={issuedTicket.visitDate}
              location={issuedTicket.location}
              setTitle={setTitle}
              setLocation={setLocation}
            />
          )}
          <Text style={styles.info}>
            발권 완료 · 수정할 수 없는 티켓입니다.
          </Text>
          <Pressable
            style={styles.action}
            onPress={() => setReadOnlyBack((value) => !value)}
          >
            <Text style={[styles.actionText, { paddingHorizontal: 30 }]}>
              {readOnlyBack ? "앞면 보기" : "뒷면 보기"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <BackTextModal
        text={expandedText}
        onClose={() => setExpandedText(null)}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : step === "textInput" || step === "backEdit"
              ? "height"
              : undefined
        }
      >
        <View style={styles.header}>
          <Pressable onPress={back} style={styles.back}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {step === "decorate" ||
            step === "stickers" ||
            step === "stickerPlace" ||
            step === "text" ||
            step === "textInput"
              ? "티켓 꾸미기"
              : TITLES[step]}
          </Text>
          <View style={styles.headerActions}>
            {(step === "decorate" ||
              step === "stickers" ||
              step === "stickerPlace" ||
              step === "text" ||
              step === "textInput" ||
              step === "frontPreview") && (
              <Pressable
                onPress={() => void saveDraft()}
                disabled={draftSaving}
                style={styles.draftSaveButton}
                accessibilityRole="button"
                accessibilityLabel="앞면 임시저장"
              >
                <Text style={styles.draftSaveButtonText}>
                  {draftSaving ? "저장 중" : "임시저장"}
                </Text>
              </Pressable>
            )}
            {(step === "decorate" ||
              step === "stickers" ||
              step === "stickerPlace" ||
              step === "text" ||
              step === "textInput") && (
              <Pressable
                style={styles.donePill}
                onPress={() => {
                  Keyboard.dismiss();
                  go("frontPreview");
                }}
                accessibilityRole="button"
                accessibilityLabel="티켓 꾸미기 완료"
              >
                <Text style={styles.donePillText}>완료</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.body}>{content()}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  reviewCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  reviewTicketOffset: { marginTop: -90 },
  archiveTicketOffset: { transform: [{ translateY: -40 }] },
  reviewBackShell: {
    width: 204,
    height: 348,
    maxWidth: "100%",
    backgroundColor: "#F2E8DC",
    borderWidth: 0,
    borderRadius: 12,
    padding: 8,
    overflow: "hidden",
  },
  backTicketShell: {
    width: 235,
    height: 360,
    minHeight: 360,
    borderWidth: 1,
    borderColor: "#987966",
    borderRadius: 16,
    padding: 7,
  },
  backTicketInner: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backTicketLogo: {
    color: "#987966",
    fontSize: 15,
    fontFamily: "serif",
    fontStyle: "italic",
    marginBottom: 10,
  },
  backTicketRule: {
    height: 1,
    backgroundColor: "#FFFDF8",
    width: "100%",
    marginBottom: 8,
  },
  backPhotoGrid: {
    width: "100%",
    height: 175,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    alignContent: "center",
  },
  backGridImage: { width: "48%", height: 84, backgroundColor: "#E8D8CA" },
  backGridImageSingle: { width: "100%", height: 173 },
  backEmptyPhoto: { color: "#987966", fontSize: 11, textAlign: "center" },
  backPreviewTextWrap: {
    width: "100%",
    height: 48,
    paddingTop: 4,
    alignItems: "center",
  },
  backPreviewText: {
    color: "#654C40",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  backMore: {
    color: "#654C40",
    fontSize: 11,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  backTicketDate: {
    color: "#987966",
    fontSize: 12,
    fontWeight: "600",
    marginTop: "auto",
  },
  backEditScreen: { flex: 1 },
  backInputDoneButton: {
    marginHorizontal: 22,
    marginBottom: 12,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#654C40",
    alignItems: "center",
    justifyContent: "center",
  },
  backInputDoneText: { color: "#FFFDF8", fontSize: 15, fontWeight: "700" },
  backEditScroll: { alignItems: "center", paddingBottom: 130, paddingTop: 12 },
  backEditScrollKeyboard: { paddingTop: 12, paddingBottom: 24 },
  backEditIntro: {
    alignSelf: "stretch",
    paddingHorizontal: 30,
    marginBottom: 18,
  },
  backEditTitle: { color: "#654C40", fontSize: 15, fontWeight: "700" },
  backEditSubtitle: {
    color: "#987966",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },
  backPalette: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  backColorChip: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "#E8D8CA",
  },
  backColorSelected: { borderWidth: 2, borderColor: "#654C40" },
  backPhotoButton: {
    backgroundColor: "#F0C8BE",
    borderRadius: 12,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    width: "84%",
  },
  backPhotoButtonText: { color: "#654C40", fontSize: 14, fontWeight: "600" },
  backInputLabel: {
    color: "#654C40",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 20,
    alignSelf: "flex-start",
    marginLeft: "8%",
  },
  backTextInput: {
    width: "84%",
    minHeight: 74,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    borderRadius: 12,
    backgroundColor: "#FFFDF8",
    color: "#654C40",
    fontSize: 15,
    fontWeight: "500",
    padding: 10,
    marginTop: 8,
    textAlignVertical: "top",
  },
  backCount: {
    alignSelf: "flex-end",
    marginRight: "8%",
    color: "#987966",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  backModalShade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  backModalCard: { backgroundColor: "#FFFDF8", borderRadius: 16, padding: 22 },
  backModalTitle: {
    color: "#654C40",
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 18,
  },
  backModalText: {
    color: "#654C40",
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "500",
  },
  backModalClose: {
    backgroundColor: "#F0C8BE",
    borderRadius: 12,
    alignItems: "center",
    padding: 12,
    marginTop: 20,
  },

  draftArea: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3D9D0",
    backgroundColor: "#FFFFFF",
  },
  draftThumbnail: {
    width: 68,
    height: 86,
    borderRadius: 7,
    backgroundColor: "#F2E8DC",
  },
  draftInfo: { flex: 1, paddingLeft: 14 },
  draftTitle: { fontSize: 15, fontWeight: "600", color: C.brown },
  draftDescription: { fontSize: 12, color: C.outline, marginTop: 8 },
  draftSaveButton: {
    minWidth: 64,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outline,
    backgroundColor: "#F3E9DF",
    alignItems: "center",
    justifyContent: "center",
  },
  draftSaveButtonText: { color: C.brown, fontSize: 12, fontWeight: "600" },
  root: { flex: 1, backgroundColor: C.bg },
  decorateScreen: { flex: 1, backgroundColor: C.bg },
  decoratePreviewArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 15,
  },
  decoratePreviewAreaKeyboard: {
    justifyContent: "flex-start",
    paddingTop: 4,
    paddingBottom: 0,
  },
  placedSticker: {
    position: "absolute",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  placedStickerText: {
    fontSize: 30,
    color: "#E46C84",
    textShadowColor: "#FFFFFF",
    textShadowRadius: 2,
  },
  textEditorScreen: { flex: 1, backgroundColor: C.bg },
  textEditorPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  textEditorPreviewKeyboard: { justifyContent: "flex-start", paddingTop: 4 },
  textEditorSheetKeyboard: { flex: 1, maxHeight: undefined },
  textEditorSheet: {
    maxHeight: 300,
    backgroundColor: "#FFFDFC",
    borderTopWidth: 1,
    borderTopColor: "#E9D6CC",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  textEditorTabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E9D6CC",
    marginTop: 8,
  },
  textEditorTabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  textEditorTabButtonActive: { borderBottomColor: "#D98B7D" },
  textEditorTabText: { fontSize: 15, color: "#8C7E74", fontWeight: "500" },
  textEditorTabTextActive: { color: C.brown, fontWeight: "700" },
  fontGridScroll: { flexGrow: 0, maxHeight: 205 },
  fontGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 12,
    gap: 10,
  },
  fontGridCard: {
    width: "47%",
    minHeight: 74,
    backgroundColor: "#F4E7DF",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  fontGridCardActive: { borderColor: "#D98B7D" },
  fontGridSample: { fontSize: 19, color: C.brown, marginBottom: 5 },
  fontGridLabel: { fontSize: 12, color: C.brown },
  textEditorToolbar: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fontChooser: { paddingTop: 8, paddingBottom: 4 },
  fontChooserLabel: {
    color: C.brown,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  fontChooserOptions: { flexDirection: "row", gap: 8 },
  fontChooserButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9D8CD",
    alignItems: "center",
    justifyContent: "center",
  },
  fontChooserButtonActive: { backgroundColor: "#E9D6CC", borderColor: C.brown },
  fontChooserButtonText: { color: C.brown, fontSize: 13 },
  textFields: { paddingVertical: 12, paddingBottom: 18, gap: 12 },
  textFieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  textFieldLabel: {
    width: 52,
    fontSize: 13,
    color: C.brown,
    fontWeight: "700",
  },
  textFieldInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#D9A99A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: C.brown,
    fontSize: 14,
  },
  textDatePlaceholder: {
    flex: 1,
    minHeight: 42,
    textAlignVertical: "center",
    paddingHorizontal: 10,
    color: "#A99A90",
    fontSize: 13,
  },
  stickerEditorScreen: { flex: 1, backgroundColor: C.bg },
  stickerEditorPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  stickerSheet: {
    height: 350,
    backgroundColor: "#FFFDFC",
    borderTopWidth: 1,
    borderTopColor: "#E9D6CC",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  stickerSheetToolbar: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stickerSheetTitle: { color: C.brown, fontSize: 15, fontWeight: "600" },
  stickerSheetCancel: { color: "#D98B7D", fontSize: 22, width: 35 },
  stickerSheetConfirm: {
    color: "#D98B7D",
    fontSize: 20,
    width: 35,
    textAlign: "right",
  },
  stickerCategoryRow: { alignItems: "center", gap: 18, paddingVertical: 3 },
  stickerCategoryText: { fontSize: 15, color: "#8C7E74" },
  stickerCategoryActive: { color: C.brown, fontWeight: "700" },
  stickerSearchInput: {
    height: 32,
    borderWidth: 1,
    borderColor: "#E9D8CD",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 13,
    color: C.brown,
    marginTop: -25,
  },
  stickerGridScroll: { height: 124, flexGrow: 0, marginTop: 5 },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingBottom: 12,
  },
  stickerGridItem: {
    width: "25%",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  stickerGridEmoji: { fontSize: 36 },
  stickerSheetFooter: {
    height: 37,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stickerUndo: { color: C.brown, fontSize: 13 },
  stickerApplyButton: {
    backgroundColor: "#E9D6CC",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  stickerApplyText: { color: C.brown, fontSize: 13, fontWeight: "700" },
  stickerTray: { paddingTop: 8, paddingBottom: 8, backgroundColor: C.bg },
  stickerHint: {
    textAlign: "center",
    fontSize: 14,
    color: C.brown,
    marginBottom: 6,
    fontWeight: "700",
  },
  stickerList: { maxHeight: 126, flexGrow: 0 },
  stickerChoices: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: "center",
    gap: 9,
  },
  stickerChoice: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F4E7DF",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerChoiceText: { fontSize: 27, color: "#D96B83" },
  stickerRemove: {
    paddingHorizontal: 12,
    height: 46,
    justifyContent: "center",
  },
  stickerRemoveText: { color: C.brown, fontSize: 12 },
  decorateTabs: {
    height: 74,
    flexDirection: "row",
    backgroundColor: "#E6C9BE",
    alignItems: "stretch",
    justifyContent: "space-around",
  },
  decorateTab: { flex: 1, justifyContent: "center", alignItems: "center" },
  decorateTabText: { fontSize: 13, fontWeight: "600", color: "#FFFDF8" },
  decorateTabTextActive: { color: C.brown },
  donePill: {
    minWidth: 64,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outline,
    backgroundColor: "#F3E9DF",
    alignItems: "center",
    justifyContent: "center",
  },
  donePillText: { color: C.brown, fontSize: 12, fontWeight: "600" },
  headerActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 13,
  },
  back: {
    width: 40,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { color: C.brown, fontSize: 34, lineHeight: 39 },
  headerTitle: { color: C.brown, fontSize: 16, fontWeight: "500" },
  body: { flex: 1 },
  helper: {
    textAlign: "center",
    color: C.brown,
    fontSize: 12,
    letterSpacing: 0.2,
    marginTop: 4,
    marginBottom: 8,
  },
  rule: { height: 1, marginHorizontal: 8, backgroundColor: "#E6E0D9" },
  filterRow: {
    height: 47,
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: C.outline,
    borderRadius: 12,
    minHeight: 24,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  chipSelected: { backgroundColor: "#5C473E", borderColor: "#5C473E" },
  chipText: { color: C.brown, fontSize: 12 },
  chipTextSelected: { color: "white" },
  gallery: { flex: 1, width: "100%" },
  galleryGrid: { paddingBottom: 110 },
  filterContainer: {
    height: 47,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
  },
  galleryMessage: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  retryText: {
    color: C.brown,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  cameraTile: {
    backgroundColor: C.gray,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIcon: { color: "white", fontSize: 36 },
  cameraText: { color: "white", fontSize: 11 },
  galleryItem: { backgroundColor: "#E6DBD1" },
  fillImage: { width: "100%", height: "100%" },
  addPhoto: { flex: 1, justifyContent: "center", alignItems: "center" },
  plus: { color: C.brown, fontSize: 30 },
  addText: { color: C.brown, fontSize: 11 },
  selected: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.brown,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedText: { color: "white", fontSize: 14 },
  blankTile: {
    backgroundColor: "#EEE9E4",
    borderWidth: 0.5,
    borderColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  blankText: { color: "#B7ABA2", fontSize: 22 },
  bottomWrap: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255,248,239,0.97)",
    borderRadius: 18,
    padding: 7,
    paddingVertical: 8,
    elevation: 5,
  },
  action: {
    height: 58,
    borderRadius: 14,
    backgroundColor: C.brown,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "white", fontSize: 14, fontWeight: "600" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  info: {
    color: C.brown,
    textAlign: "center",
    fontSize: 13,
    marginVertical: 18,
  },
  big: { color: C.brown, fontSize: 20, fontWeight: "700", marginBottom: 16 },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    padding: 15,
    marginBottom: 95,
  },
  ticket: {
    width: 230,
    minHeight: 340,
    backgroundColor: "#F5E9DD",
    borderWidth: 8,
    borderColor: "#CBB5A4",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketFilm: { borderColor: "#4D3A32", backgroundColor: "#EFE6DA" },
  ticketPolaroid: {
    borderColor: "white",
    backgroundColor: "white",
    paddingBottom: 35,
  },
  ticketImage: { width: "100%", height: 255 },
  photoEmpty: {
    backgroundColor: "#E0D7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: C.brown },
  ticketDetail: {
    color: C.brown,
    fontSize: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  ticketCaption: {
    color: C.brown,
    marginTop: 10,
    textAlign: "center",
    fontSize: 16,
  },
  ticketInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  ticketHeading: {
    color: C.brown,
    fontWeight: "700",
    fontSize: 20,
    marginBottom: 14,
  },
  ticketSmall: { color: C.brown, fontSize: 13, marginBottom: 12 },
  backPhotoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
  },
  backPhoto: { width: 75, height: 75 },
  frameScreen: { flex: 1 },
  framePickerArea: { marginTop: 10, paddingBottom: 98 },
  frameVerticalList: { maxHeight: 185 },
  frameVerticalScroll: { paddingHorizontal: 22, gap: 9, paddingBottom: 10 },
  frameScroll: { paddingHorizontal: 22, paddingBottom: 110 },
  frameHelper: {
    color: C.brown,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 14,
    textAlign: "center",
    fontWeight: "700",
  },
  framePreviewArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  framePreviewLarge: { width: 250, height: 425 },
  framePreviewImageLarge: { height: 320 },
  framePreview: {
    width: 204,
    height: 348,
    borderWidth: 1,
    borderColor: "#655D57",
    borderRadius: 12,
    padding: 8,
  },
  framePreviewImage: { width: "100%", height: 256, borderRadius: 10 },
  frameMeta: {
    flexDirection: "column",
    alignItems: "flex-start",
    paddingTop: 9,
    paddingLeft: 7,
    gap: 4,
  },
  frameMetaText: { fontSize: 9, color: "#292929", letterSpacing: 0.3 },
  frameMetaInput: {
    fontSize: 14,
    color: "#292929",
    letterSpacing: 0.3,
    padding: 0,
    minHeight: 16,
    fontWeight: "500",
  },
  ticketMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  ticketMetaLabel: {
    width: 48,
    fontSize: 14,
    color: "#292929",
    letterSpacing: 0.3,
    fontWeight: "500",
  },
  ticketMetaValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: "#292929",
    letterSpacing: 0.3,
    fontWeight: "500",
  },
  frameSectionTitle: {
    color: C.brown,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
    marginHorizontal: 22,
  },
  frameSectionRule: {
    height: 1,
    backgroundColor: C.outline,
    marginBottom: 12,
    marginHorizontal: 22,
  },
  frameGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  frameOption: {
    width: "100%",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#B7A69B",
    borderRadius: 10,
    padding: 7,
    alignItems: "center",
    backgroundColor: C.white,
  },
  frameOptionSelected: { backgroundColor: "#947D6D", borderColor: "#947D6D" },
  frameSwatch: { width: 48, height: 48, borderRadius: 4 },
  frameOptionText: { color: C.brown, fontSize: 12, marginLeft: 14 },
  frameOptionTextSelected: { color: C.white },
  input: {
    marginHorizontal: 20,
    borderColor: C.outline,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: C.brown,
    marginBottom: 120,
  },
  frontPreviewCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  issuedTicketPosition: {
    alignItems: "center",
    transform: [{ translateY: -25 }],
  },
  issuedTitle: {
    position: "absolute",
    bottom: "100%",
    marginBottom: 16,
    color: C.brown,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
});
