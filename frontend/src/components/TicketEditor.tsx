// 후속 Issue #25: 기존 시연용 티켓 입력을 확정된 공동·개인 티켓 구조로 교체한다.
import {
  createTicketSchema,
  TICKET_TITLE_MAX,
  TICKET_LOCATION_MAX,
  PERSONAL_TICKET_MEMO_MAX,
  MOOD_PROMPT_MAX,
  PHOTO_UPLOAD_MAX_COUNT,
  type AiDraft,
} from "@mind-do/shared";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
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
import Constants, { ExecutionEnvironment } from "expo-constants";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library/legacy";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError, createAiDrafts, issueTicket } from "../lib/api";
import { PHOTO_TOO_LARGE, uploadTicketPhotos } from "../lib/photo-upload";
import TicketRenderer from "./TicketRenderer";
import {
  issueTicketOnce,
  loadFrontDraft,
  saveFrontDraft,
  type FrontDraft,
  type IssuedTicket,
} from "../storage/issued-tickets";

// JPEG·PNG는 원본 URI를 유지하고, HEIC·HEIF만 JPEG 파일로 변환합니다.
type PhotoSource = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};
type PhotoFormat = "jpeg" | "png" | "heic" | "unsupported";

class PhotoPreparationError extends Error {}

function photoExtension(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return /\.([a-z0-9]+)(?:[?#]|$)/i.exec(value)?.[1]?.toLowerCase();
}

function photoFormat(source: PhotoSource): PhotoFormat {
  const mime = source.mimeType?.toLowerCase().trim();
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpeg";
  if (mime === "image/png") return "png";
  if (mime === "image/heic" || mime === "image/heif") return "heic";
  if (mime && mime !== "application/octet-stream") return "unsupported";

  const ext = photoExtension(source.uri) ?? photoExtension(source.fileName);
  if (ext === "jpg" || ext === "jpeg") return "jpeg";
  if (ext === "png") return "png";
  if (ext === "heic" || ext === "heif") return "heic";
  return "unsupported";
}

// Expo Go에서 실행 중인지. Expo Go(안드로이드)는 사진첩 전체 읽기(expo-media-library)를 막아서
// 앱 안 사진 격자 화면이 열리지 않는다
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function prepareSelectedPhoto(source: PhotoSource): Promise<string> {
  const format = photoFormat(source);
  if (format === "unsupported") {
    throw new PhotoPreparationError(
      "JPEG, PNG 또는 HEIC 사진만 선택할 수 있어요.",
    );
  }
  if (format !== "heic") return source.uri;
  if (!source.uri.startsWith("file://")) {
    throw new PhotoPreparationError(
      "사진 원본을 불러올 수 없어요. 시스템 갤러리에서 다시 선택해 주세요.",
    );
  }

  const context = ImageManipulator.manipulate(source.uri);
  const image = await context.renderAsync();
  const jpeg = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.9,
  });
  return jpeg.uri;
}

function showPhotoSelectionError(error: unknown): void {
  Alert.alert(
    "사진 선택 오류",
    error instanceof PhotoPreparationError
      ? error.message
      : "사진을 불러오거나 JPEG로 변환하지 못했어요. 다시 선택해 주세요.",
  );
}

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
  | "issuing"
  | "issued"
  | "archive"
  | "error";

const C = {
  bg: "#FFF8EF",
  brown: "#654C40",
  outline: "#987966",
  accent: "#CF897C",
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
  frontPreview: "티켓 확인",
  backEdit: "뒷면 문구",
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
  selectedPhotos?: string[];
  photoOrientation?: "landscape" | "portrait";
  showOrientationSymbol?: boolean;
  frame: number;
  front: string | null;
  ticketTitle: string;
  ticketDate: string;
  ticketPlace: string;
  decorateWidth?: number;
  stickers?: PlacedSticker[];
  onStickerMove?: (id: number, x: number, y: number) => void;
  previewOnly?: boolean;
  // 서버 AI 초안. 있으면 사진 영역을 frame번 초안의 디자인으로 그린다
  drafts?: AiDraft[] | null;
  setTicketTitle: React.Dispatch<React.SetStateAction<string>>;
  setTicketPlace: React.Dispatch<React.SetStateAction<string>>;
};

const FramePreview = ({
  editable = false,
  ticketFont = "sans-serif",
  selectedPhotos,
  photoOrientation = "landscape",
  showOrientationSymbol = false,
  decorateWidth,
  stickers = [],
  onStickerMove,
  previewOnly = false,
  drafts = null,
  frame,
  front,
  ticketTitle,
  ticketDate,
  ticketPlace,
  setTicketTitle,
  setTicketPlace,
}: FramePreviewProps) => {
  // Figma 기준 티켓은 전체 320×128(2.5:1)이고, 왼쪽 64px은 티켓 정보,
  // 오른쪽 256px은 사진 아트 영역입니다. 화면 폭에 맞춰 같은 비율로 축소합니다.
  const ticketWidth = decorateWidth ?? 320;
  const scale = ticketWidth / 320;
  const ticketHeight = ticketWidth * (128 / 320);
  const stubWidth = ticketWidth * (64 / 320);
  const artWidth = ticketWidth - stubWidth;
  const previewPhotos = (
    selectedPhotos?.length ? selectedPhotos : front ? [front] : []
  ).slice(0, 3);
  const stubTextStyle = { fontFamily: ticketFont };
  const draftDesign = drafts?.[frame]?.design ?? null;
  const rendererPhotos = (
    selectedPhotos?.length ? selectedPhotos : front ? [front] : []
  ).map((uri) => ({ uri }));
  // Figma Photo Pass 2.5 기본 배치: 왼쪽 큰 사진, 오른쪽 위 사진, 중앙 아래 겹친 사진.
  // Collage 변형은 흰 테두리가 있는 별도 배치로 보여 줍니다.
  const naturalPositions = [
    { left: 0, top: 0, width: 0.64, height: 0.92 },
    { left: 0.48, top: -0.03, width: 0.56, height: 0.85 },
    { left: 0.26, top: 0.39, width: 0.52, height: 0.67 },
  ];
  const collagePositions = [
    { left: 0.02, top: 0.03, width: 0.63, height: 0.91 },
    { left: 0.49, top: 0.02, width: 0.51, height: 0.85 },
    { left: 0.22, top: 0.42, width: 0.58, height: 0.61 },
  ];
  const collage = frame === 1;
  const imagePositions = collage ? collagePositions : naturalPositions;
  const artCanvasWidth =
    photoOrientation === "portrait" ? ticketHeight : artWidth;
  const artCanvasHeight =
    photoOrientation === "portrait" ? artWidth : ticketHeight;

  return (
    <View
      style={[
        styles.ticketPass,
        {
          width: ticketWidth,
          height: ticketHeight,
          borderRadius: 10 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.ticketPassStub,
          {
            width: stubWidth,
            height: ticketHeight,
            padding: 8 * scale,
            backgroundColor: "#F0C8BE",
          },
        ]}
      >
        <Text
          style={[
            styles.ticketPassBrand,
            { fontSize: 8 * scale, lineHeight: 11 * scale },
          ]}
        >
          MEMO:RE
        </Text>
        {editable ? (
          <TextInput
            style={[
              styles.ticketPassTitle,
              stubTextStyle,
              {
                fontSize: 11 * scale,
                lineHeight: 14 * scale,
                minHeight: 24 * scale,
              },
            ]}
            value={ticketTitle}
            onChangeText={setTicketTitle}
            onBlur={() =>
              setTicketTitle((value) =>
                Array.from(value).slice(0, TICKET_TITLE_MAX).join(""),
              )
            }
            placeholder="티켓 제목"
            placeholderTextColor="#654C40"
            accessibilityLabel={`티켓 제목 입력 (최대 ${TICKET_TITLE_MAX}자)`}
            multiline
            numberOfLines={2}
          />
        ) : (
          <Text
            style={[
              styles.ticketPassTitle,
              stubTextStyle,
              {
                fontSize: 11 * scale,
                lineHeight: 14 * scale,
                minHeight: 24 * scale,
              },
            ]}
            numberOfLines={2}
          >
            {ticketTitle || "우리들의 여행"}
          </Text>
        )}
        <Text
          style={[
            styles.ticketPassDate,
            { fontSize: 8 * scale, lineHeight: 10 * scale },
          ]}
          numberOfLines={1}
        >
          {ticketDate}
        </Text>
        {editable ? (
          <TextInput
            style={[
              styles.ticketPassPlace,
              stubTextStyle,
              {
                fontSize: 10 * scale,
                lineHeight: 12 * scale,
                minHeight: 18 * scale,
              },
            ]}
            value={ticketPlace}
            onChangeText={setTicketPlace}
            onBlur={() =>
              setTicketPlace((value) =>
                Array.from(value).slice(0, TICKET_LOCATION_MAX).join(""),
              )
            }
            placeholder="장소"
            placeholderTextColor="#654C40"
            accessibilityLabel={`티켓 장소 입력 (최대 ${TICKET_LOCATION_MAX}자)`}
            multiline
            numberOfLines={2}
          />
        ) : (
          <Text
            style={[
              styles.ticketPassPlace,
              stubTextStyle,
              {
                fontSize: 10 * scale,
                lineHeight: 12 * scale,
                minHeight: 18 * scale,
              },
            ]}
            numberOfLines={2}
          >
            {ticketPlace}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.ticketPassArt,
          {
            width: artWidth,
            height: ticketHeight,
            borderTopRightRadius: 10 * scale,
            borderBottomRightRadius: 10 * scale,
          },
        ]}
      >
        {draftDesign && (
          <View pointerEvents="none" style={styles.rendererOverlay}>
            <TicketRenderer
              photos={rendererPhotos}
              design={draftDesign}
              width={artWidth}
            />
          </View>
        )}
        <View
          style={[
            styles.ticketPassArtCanvas,
            photoOrientation === "portrait" &&
              !showOrientationSymbol &&
              styles.ticketPassArtCanvasPortrait,
            { width: artCanvasWidth, height: artCanvasHeight },
          ]}
        >
          {previewPhotos.length > 0 ? (
            previewPhotos.length === 1 ? (
              <Image
                source={{ uri: previewPhotos[0] }}
                style={styles.ticketPassSinglePhoto}
                resizeMode="cover"
              />
            ) : (
              previewPhotos.map((uri, index) => {
                const position = imagePositions[index];
                return (
                  <Image
                    key={`${index}-${uri}`}
                    source={{ uri }}
                    style={[
                      styles.ticketPassCollagePhoto,
                      {
                        left: position.left * artCanvasWidth,
                        top: position.top * artCanvasHeight,
                        width: position.width * artCanvasWidth,
                        height: position.height * artCanvasHeight,
                        borderWidth: collage ? 3 * scale : 0,
                        borderRadius: (collage ? 3 : 12) * scale,
                        zIndex: index + 1,
                      },
                    ]}
                    resizeMode="cover"
                  />
                );
              })
            )
          ) : showOrientationSymbol ? (
            <View style={styles.ticketPassEmpty}>
              <View
                style={[
                  styles.ticketPassPersonSymbol,
                  photoOrientation === "portrait" &&
                    styles.ticketPassPersonSymbolPortrait,
                ]}
              >
                <View
                  style={[
                    styles.ticketPassSymbolHead,
                    {
                      width: 22 * scale,
                      height: 22 * scale,
                      borderRadius: 11 * scale,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.ticketPassSymbolBody,
                    {
                      width: 50 * scale,
                      height: 18 * scale,
                      marginTop: 4 * scale,
                      borderTopLeftRadius: 25 * scale,
                      borderTopRightRadius: 25 * scale,
                    },
                  ]}
                />
              </View>
            </View>
          ) : (
            <View style={styles.ticketPassEmpty}>
              <Text style={styles.muted}>선택한 사진</Text>
            </View>
          )}

          <View
            pointerEvents="none"
            style={[
              styles.ticketPassWash,
              {
                opacity: previewPhotos.length > 0 ? (collage ? 0.16 : 0.08) : 0,
              },
            ]}
          />
          {!showOrientationSymbol && (
            <Text
              pointerEvents="none"
              style={[
                styles.ticketPassPhotoDate,
                {
                  fontSize: 8 * scale,
                  lineHeight: 10 * scale,
                  left: 8 * scale,
                  bottom: 4 * scale,
                },
              ]}
              numberOfLines={1}
            >
              {ticketDate}
            </Text>
          )}
        </View>
        {!showOrientationSymbol && stickers.length > 0 && (
          <View
            pointerEvents="box-none"
            style={[
              styles.stickerOverlayCanvas,
              { width: artWidth, height: ticketHeight },
            ]}
          >
            {stickers.map((item) =>
              previewOnly ? (
                <View
                  key={item.id}
                  pointerEvents="none"
                  style={[
                    styles.placedSticker,
                    {
                      left: item.x * Math.max(0, artWidth - 36),
                      top: item.y * Math.max(0, ticketHeight - 36),
                    },
                  ]}
                >
                  <Text style={styles.placedStickerText}>{item.symbol}</Text>
                </View>
              ) : (
                <DraggableSticker
                  key={item.id}
                  item={item}
                  imageWidth={artWidth}
                  imageHeight={ticketHeight}
                  onMove={onStickerMove ?? (() => {})}
                />
              ),
            )}
          </View>
        )}
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.ticketPassPerforation,
          {
            left: stubWidth - 0.5 * scale,
            top: 8 * scale,
            height: ticketHeight - 16 * scale,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ticketPassPunchHole,
          {
            left: stubWidth - 5 * scale,
            top: -5 * scale,
            width: 10 * scale,
            height: 10 * scale,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ticketPassPunchHole,
          {
            left: stubWidth - 5 * scale,
            bottom: -5 * scale,
            width: 10 * scale,
            height: 10 * scale,
          },
        ]}
      />
    </View>
  );
};

// 개인 티켓 뒷면은 메모 텍스트만 표시합니다.
function BackTicketContent({
  text,
  date,
  color,
  onMore,
}: {
  text: string;
  date: string;
  color: string;
  onMore: () => void;
}) {
  const shortened = Array.from(text).length > 34;
  return (
    <View style={[styles.backTicketInner, { backgroundColor: color }]}>
      <Text style={styles.backTicketLogo}>MEMO:RE</Text>
      <View style={styles.backTicketRule} />
      <View style={styles.backMemoOnlyTextWrap}>
        <Text style={styles.backMemoOnlyText} numberOfLines={shortened ? 3 : 5}>
          {text || "이날의 기억을 적어 주세요"}
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
      <Text style={styles.backTicketDate}>{date}</Text>
    </View>
  );
}
// 달력에서 이미 발권된 티켓을 앞/뒷면 그대로 보여주는 읽기 전용 미리보기입니다.
// 기존 앞면/뒷면 미리보기 컴포넌트를 재사용하여 발권 화면과 디자인이 달라지지 않게 합니다.
export function IssuedTicketFlipPreview({
  ticket,
  showingBack,
  ticketWidth,
  onMore,
}: {
  ticket: IssuedTicket;
  showingBack: boolean;
  ticketWidth: number;
  onMore: () => void;
}) {
  const safeFrame = Math.max(0, Math.min(FRAMES.length - 1, ticket.frame ?? 0));
  if (showingBack) {
    const color = ticket.backColor ?? "#F2E8DC";
    return (
      <View
        style={[
          styles.reviewBackShell,
          {
            width: ticketWidth,
            height: ticketWidth * (128 / 320),
            backgroundColor: color,
          },
        ]}
      >
        <BackTicketContent
          text={ticket.memo ?? ""}
          date={(ticket.visitDate ?? "").replace(/-/g, ".")}
          color={color}
          onMore={onMore}
        />
      </View>
    );
  }
  return (
    <FramePreview
      previewOnly
      ticketFont={ticket.ticketFont ?? "sans-serif"}
      decorateWidth={ticketWidth}
      photoOrientation={ticket.photoOrientation ?? "landscape"}
      stickers={ticket.placedStickers ?? []}
      frame={safeFrame}
      front={ticket.front ?? null}
      selectedPhotos={
        ticket.front
          ? [ticket.front, ...(ticket.backs ?? [])].slice(
              0,
              PHOTO_UPLOAD_MAX_COUNT,
            )
          : []
      }
      ticketTitle={ticket.title ?? ""}
      ticketDate={(ticket.visitDate ?? "").replace(/-/g, ".")}
      ticketPlace={ticket.location ?? ""}
      setTicketTitle={() => {}}
      setTicketPlace={() => {}}
    />
  );
}

type TicketCreationScreenProps = {
  onBackHome: () => void;
  selectedVisitDate?: string;
  originGroupName?: string;
  originGroupId?: string;
  originJointTitle?: string;
  onTicketIssued?: (ticket: IssuedTicket) => void;
  onOpenGroupTickets?: () => void;
  issuedTicket?: IssuedTicket | null;
  onCreateNew?: () => void;
  // 서버 공동 티켓의 내 슬롯을 채울 때. 있으면 사진 업로드 → AI 초안 → 저장을 서버로 한다
  sharedTicketId?: number;
  onServerTicketIssued?: () => void;
};

// 서버 오류 코드를 사용자 안내 문구로 바꾼다
function serverTicketErrorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "";
  switch (code) {
    case PHOTO_TOO_LARGE:
      return "사진 용량이 너무 커요. 다른 사진을 선택해 주세요.";
    case "AI_DRAFT_ALREADY_GENERATED":
      return "AI 초안은 한 사람당 한 번만 만들 수 있어요.";
    case "TICKET_ALREADY_COMPLETED":
      return "이 공동 티켓에는 이미 내 티켓이 있어요.";
    case "NETWORK_ERROR":
      return "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.";
    case "UNAUTHORIZED":
    case "ACCESS_TOKEN_EXPIRED":
      return "로그인이 만료됐어요. 다시 로그인해 주세요.";
    default:
      return "잠시 후 다시 시도해 주세요.";
  }
}

export default function TicketCreationScreen({
  onBackHome,
  selectedVisitDate,
  originGroupName,
  originJointTitle,
  originGroupId,
  issuedTicket = null,
  onCreateNew,
  onTicketIssued,
  onOpenGroupTickets,
  sharedTicketId,
  onServerTicketIssued,
}: TicketCreationScreenProps) {
  const { width, height } = useWindowDimensions();
  // Figma의 완성 티켓 320×128(2.5:1)을 화면 폭과 세로 공간에 맞춰 표시합니다.
  const decorateWidth = Math.max(
    150,
    Math.min(390, width - 10, (height - 250) * (320 / 128)),
  );
  const dispenserTicketWidth = Math.min(320, width - 48);
  const dispenserTicketHeight = dispenserTicketWidth * (128 / 320);
  const ticketExitProgress = useRef(new Animated.Value(0)).current;
  const ticketIssueLock = useRef(false);
  // 스티커 선택 패널이 열리면 티켓이 패널과 겹치지 않도록 축소합니다.
  const stickerEditWidth = Math.max(
    120,
    Math.min(decorateWidth, (height - 460) * (320 / 128)),
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
  const workflowStage =
    step === "photos"
      ? 0
      : step === "frames" || step === "frameConfirm"
        ? 1
        : step === "decorate" || step === "stickers" || step === "stickerPlace"
          ? 2
          : 3;
  const [front, setFront] = useState<string | null>(null);
  const [memoryPhotos, setMemoryPhotos] = useState<string[]>([]);
  // 서버 모드: 올린 사진의 키와 AI 초안. 사진이 바뀌지 않았으면 다시 부르지 않는다(AI 초안은 1인 1회)
  const serverMode = sharedTicketId !== undefined;
  const [aiDrafts, setAiDrafts] = useState<AiDraft[] | null>(null);
  const [draftPhotoKeys, setDraftPhotoKeys] = useState<string[] | null>(null);
  const [draftPhotosSignature, setDraftPhotosSignature] = useState("");
  const [preparingDrafts, setPreparingDrafts] = useState(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [photoChangeVisible, setPhotoChangeVisible] = useState(false);
  const [returnToPhotoChange, setReturnToPhotoChange] = useState(false);
  const [photoOrientation, setPhotoOrientation] = useState<
    "landscape" | "portrait"
  >("landscape");
  const [backs, setBacks] = useState<string[]>([]);
  const [frame, setFrame] = useState(0);
  const [frameChosen, setFrameChosen] = useState(false);
  const [sticker, setSticker] = useState("");
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [stickerCategory, setStickerCategory] = useState("최근");
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
  const [ticketTitle, setTicketTitle] = useState(
    originJointTitle?.trim() ?? "",
  );
  const [ticketDate, setTicketDate] = useState(
    selectedVisitDate ? selectedVisitDate.replace(/-/g, ".") : "",
  );
  const [ticketPlace, setTicketPlace] = useState(originGroupName?.trim() ?? "");
  const [backText, setBackText] = useState("");
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
    if (!front) {
      Alert.alert("임시저장", "먼저 앞면 사진을 선택해 주세요.");
      return;
    }
    const draft: FrontDraft = {
      backs,
      photoOrientation,
      front,
      frame,
      frameChosen,
      sticker,
      placedStickers,
      caption,
      ticketFont,
      title: ticketTitle,
      visitDate: ticketDate,
      location: ticketPlace,
      savedAt: new Date().toISOString(),
    };
    setDraftSaving(true);
    try {
      await saveFrontDraft(draft, FRAMES.length);
      setSavedDraft(draft);
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
    const photos = savedDraft.front
      ? [savedDraft.front, ...(savedDraft.backs ?? [])]
      : [];
    setMemoryPhotos(photos);
    setBacks(savedDraft.backs ?? []);
    setPhotoOrientation(savedDraft.photoOrientation ?? "landscape");
    setSelectedMemoryIds(photos.map((_, index) => `draft-${index}`));
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
    setTicketTitle(savedDraft.title);
    setTicketDate(savedDraft.visitDate);
    setTicketPlace(savedDraft.location);
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
        "사진을 불러오지 못했어요. Android 앱 빌드와 사진 권한을 확인해 주세요.",
      );
    } finally {
      galleryBusy.current = false;
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (step === "photos" && galleryPhotos.length === 0) {
      void loadGallery();
    }
  }, [step]);

  const go = (s: Step) => setStep(s);
  const back = () => {
    if (step === "photos") {
      // 초안은 서버에 저장되지 않고, 일반 사용자는 다시 받을 수 없다 (AI 초안 생성 명세 5절)
      if (serverMode && aiDrafts) {
        Alert.alert(
          "나가면 AI 초안이 사라져요",
          "AI 초안은 한 번만 만들 수 있어서 다시 받을 수 없어요. 나갈까요?",
          [
            { text: "취소", style: "cancel" },
            { text: "나가기", style: "destructive", onPress: onBackHome },
          ],
        );
        return;
      }
      onBackHome();
      return;
    }
    if (step === "frontPreview") {
      go("backEdit");
      return;
    }
    if (step === "backEdit") {
      go(serverMode ? "frameConfirm" : "decorate");
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

  // Android의 getAssetInfoAsync는 사진 위치(EXIF) 권한까지 요구할 수 있어,
  // 사진 선택에 필요한 URI·파일명은 getAssetsAsync가 준 값을 그대로 사용합니다.
  // iOS는 ph:// URI를 이미지 변환기에 전달할 수 없어서 로컬 파일 URI를 별도로 구합니다.
  const selectGalleryPhoto = async (asset: MediaLibrary.Asset) => {
    try {
      const existingIndex = selectedMemoryIds.indexOf(asset.id);
      if (existingIndex >= 0) {
        const nextIds = selectedMemoryIds.filter((id) => id !== asset.id);
        const nextPhotos = memoryPhotos.filter(
          (_, index) => index !== existingIndex,
        );
        setSelectedMemoryIds(nextIds);
        setMemoryPhotos(nextPhotos);
        setFront(nextPhotos[0] ?? null);
        setBacks(nextPhotos.slice(1));
        return;
      }
      if (memoryPhotos.length >= PHOTO_UPLOAD_MAX_COUNT) {
        Alert.alert(
          `사진은 최대 ${PHOTO_UPLOAD_MAX_COUNT}장까지 선택할 수 있어요.`,
        );
        return;
      }
      let uri = asset.uri;
      if (Platform.OS === "ios") {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        uri = info.localUri ?? info.uri;
      }
      if (!uri.startsWith("file://")) {
        throw new PhotoPreparationError(
          "사진 원본을 불러올 수 없어요. 시스템 갤러리에서 다시 선택해 주세요.",
        );
      }
      const normalizedUri = await prepareSelectedPhoto({
        uri,
        fileName: asset.filename,
      });
      const nextPhotos = [...memoryPhotos, normalizedUri];
      setMemoryPhotos(nextPhotos);
      setSelectedMemoryIds([...selectedMemoryIds, asset.id]);
      setFront(nextPhotos[0] ?? null);
      setBacks(nextPhotos.slice(1));
    } catch (error) {
      showPhotoSelectionError(error);
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
      if (result.canceled || !result.assets[0]) return;
      const uri = await prepareSelectedPhoto(result.assets[0]);
      if (memoryPhotos.length >= PHOTO_UPLOAD_MAX_COUNT) {
        Alert.alert(
          `사진은 최대 ${PHOTO_UPLOAD_MAX_COUNT}장까지 선택할 수 있어요.`,
        );
        return;
      }
      const nextPhotos = [...memoryPhotos, uri];
      setMemoryPhotos(nextPhotos);
      setSelectedMemoryIds([...selectedMemoryIds, `camera-${Date.now()}`]);
      setFront(nextPhotos[0] ?? null);
      setBacks(nextPhotos.slice(1));
    } catch (error) {
      showPhotoSelectionError(error);
    }
  };

  // Expo Go(안드로이드)는 사진첩 전체 읽기(expo-media-library)를 막아서 위 격자가 열리지 않는다.
  // 그때 안드로이드 기본 사진 선택 창으로 고른다 (권한 없이 동작, 고른 순서 유지)
  const pickFromSystemLibrary = async () => {
    const remaining = PHOTO_UPLOAD_MAX_COUNT - memoryPhotos.length;
    if (remaining <= 0) {
      Alert.alert(
        `사진은 최대 ${PHOTO_UPLOAD_MAX_COUNT}장까지 선택할 수 있어요.`,
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: remaining,
        quality: 0.9,
      });
      if (result.canceled) return;
      const picked = await Promise.all(
        result.assets.slice(0, remaining).map(prepareSelectedPhoto),
      );
      const nextPhotos = [...memoryPhotos, ...picked];
      setMemoryPhotos(nextPhotos);
      setSelectedMemoryIds([
        ...selectedMemoryIds,
        ...picked.map((_, index) => `library-${Date.now()}-${index}`),
      ]);
      setFront(nextPhotos[0] ?? null);
      setBacks(nextPhotos.slice(1));
      closePhotoPicker();
    } catch (error) {
      showPhotoSelectionError(error);
    }
  };

  // 빈 사진 칸: 실제 앱은 원래대로 앱 안 사진 격자 화면을 연다.
  // Expo Go에서만 사진 앱(기본 선택 창)·카메라 중에서 고르게 한다 (중간 발표 시연용)
  // 후속 Issue #93: 실제 앱 빌드에서 격자 화면이 사진첩을 불러오는지 확인되면 Expo Go 분기를 지운다
  const openPhotoPicker = () => {
    if (!IS_EXPO_GO) {
      setPhotoPickerVisible(true);
      return;
    }
    choosePhotoSource();
  };

  const choosePhotoSource = () => {
    Alert.alert("사진 추가", undefined, [
      { text: "취소", style: "cancel" },
      { text: "촬영하기", onPress: () => void shoot() },
      {
        text: "사진 앱에서 고르기",
        onPress: () => void pickFromSystemLibrary(),
      },
    ]);
  };

  const closePhotoPicker = () => {
    setPhotoPickerVisible(false);
    if (returnToPhotoChange) {
      setPhotoChangeVisible(true);
      setReturnToPhotoChange(false);
    }
  };

  const nextFromPhotos = () => {
    if (memoryPhotos.length === 0 || !front) {
      Alert.alert("사진 선택", "추억 사진을 한 장 이상 선택해 주세요.");
      return;
    }
    if (serverMode) {
      void prepareServerDrafts();
      return;
    }
    setFrameChosen(true);
    go("frames");
  };

  const prepareServerDrafts = async () => {
    if (sharedTicketId === undefined || preparingDrafts) return;
    const signature = memoryPhotos.join("|");
    if (aiDrafts && signature === draftPhotosSignature) {
      setFrameChosen(true);
      go("frames");
      return;
    }
    setPreparingDrafts(true);
    try {
      const photoKeys = await uploadTicketPhotos(sharedTicketId, memoryPhotos);
      // 초안을 받은 뒤 사진만 바꾼 경우: AI를 다시 부르지 않고 같은 디자인에 사진만 바꾼다 (AI 초안 생성 명세 5절)
      if (!aiDrafts) {
        const moodPrompt = caption.trim();
        const { drafts } = await createAiDrafts(sharedTicketId, {
          photoKeys,
          ...(moodPrompt ? { moodPrompt } : {}),
        });
        setAiDrafts(drafts);
        setFrame(0);
      }
      setDraftPhotoKeys(photoKeys);
      setDraftPhotosSignature(signature);
      setFrameChosen(true);
      go("frames");
    } catch (error) {
      Alert.alert("AI 초안을 만들지 못했어요", serverTicketErrorMessage(error));
    } finally {
      setPreparingDrafts(false);
    }
  };
  // 1-2-3 프레임 선택 화면 전용 미리보기. 이후 꾸미기 화면의 Ticket은 유지합니다.

  const FrameSelection = ({ confirmed = false }: { confirmed?: boolean }) => (
    <View style={styles.frameScreen}>
      <Text style={styles.frameHelper}>
        사진 조합을 확인하고 마음에 드는 디자인을 선택해 주세요.
      </Text>
      <View style={styles.framePreviewArea}>
        <FramePreview
          drafts={aiDrafts}
          ticketFont={ticketFont}
          decorateWidth={Math.max(150, Math.min(390, width - 16))}
          frame={frame}
          front={front}
          selectedPhotos={memoryPhotos}
          photoOrientation={photoOrientation}
          ticketTitle={ticketTitle}
          ticketDate={ticketDate}
          ticketPlace={ticketPlace}
          setTicketTitle={setTicketTitle}
          setTicketPlace={setTicketPlace}
        />
      </View>
      <View style={styles.framePickerArea}>
        <View style={styles.designPickerHeading}>
          <Text style={styles.frameSectionTitle}>티켓 디자인</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              // 후속 Issue #93: VIP 재생성(그룹별 하루 3회)이 생기면 남은 횟수에 따라 서버에 다시 요청한다
              if (serverMode) {
                Alert.alert(
                  "다시 만들기",
                  "AI 초안은 한 사람당 한 번만 만들 수 있어요. 01~03 중에서 골라 주세요.",
                );
                return;
              }
              const next = (frame + 1 + Math.floor(Math.random() * 2)) % 3;
              setFrame(next);
              setFrameChosen(true);
              go("frameConfirm");
            }}
          >
            <Text style={styles.redoDesignText}>다시 만들기</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.designOptions}
        >
          {FRAMES.slice(0, 3).map((item, index) => (
            <Pressable
              key={`${item.name}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`디자인 ${index + 1} 선택`}
              accessibilityState={{ selected: frameChosen && frame === index }}
              onPress={() => {
                setFrame(index);
                setFrameChosen(true);
                if (!confirmed) go("frameConfirm");
              }}
              style={[
                styles.designOption,
                frameChosen && frame === index && styles.designOptionSelected,
              ]}
            >
              <View style={styles.designThumbnail}>
                <FramePreview
                  drafts={aiDrafts}
                  previewOnly
                  decorateWidth={108}
                  frame={index}
                  front={front}
                  selectedPhotos={memoryPhotos}
                  photoOrientation={photoOrientation}
                  ticketTitle={ticketTitle}
                  ticketDate={ticketDate}
                  ticketPlace={ticketPlace}
                  setTicketTitle={setTicketTitle}
                  setTicketPlace={setTicketPlace}
                />
              </View>
              <Text
                style={[
                  styles.designOptionText,
                  frameChosen &&
                    frame === index &&
                    styles.designOptionTextSelected,
                ]}
              >
                {String(index + 1).padStart(2, "0")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {(confirmed || frameChosen) && (
        <Action
          label="이 디자인 선택"
          // 후속 Issue #93: 서버 디자인 형식이 스티커·글자를 받게 되면(지금 0개만 허용) 서버 모드에서도 꾸미기로 보낸다
          onPress={() => go(serverMode ? "backEdit" : "decorate")}
        />
      )}
    </View>
  );

  const Action = ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <View style={styles.bottomWrap}>
      <Pressable style={styles.action} onPress={onPress}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </View>
  );
  const [issuingTicket, setIssuingTicket] = useState(false);
  const [issueFailed, setIssueFailed] = useState(false);
  const [, setIssuedSnapshot] = useState<IssuedTicket | null>(null);

  const resetTicket = () => {
    setFront(null);
    setMemoryPhotos([]);
    setSelectedMemoryIds([]);
    setPhotoOrientation("landscape");
    setBacks([]);
    setFrame(0);
    setFrameChosen(false);
    setSticker("");
    setPlacedStickers([]);
    stickerId.current = 0;
    setCaption("");
    setTicketFont("sans-serif");
    setTicketTitle("");
    setTicketPlace("");
    setBackText("");
    setTicketDate(
      selectedVisitDate ? selectedVisitDate.replace(/-/g, ".") : "",
    );
    setIssuedSnapshot(null);
    setStep("photos");
    if (onCreateNew) onCreateNew();
    else {
      onBackHome();
    }
  };

  const validateIssueInput = () => {
    if (serverMode) {
      if (Array.from(backText.trim()).length > PERSONAL_TICKET_MEMO_MAX) {
        Alert.alert(
          "뒷면 문구 확인",
          `뒷면 문구는 최대 ${PERSONAL_TICKET_MEMO_MAX}자까지 입력할 수 있어요.`,
        );
        return false;
      }
      return true;
    }
    const date = ticketDate.trim();
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
      Alert.alert("날짜 확인", "먼저 달력에서 티켓 날짜를 선택해 주세요.");
      return false;
    }
    // 그룹 개인 티켓에는 장소 입력란이 없으므로 기존 일반 티켓의 필수 장소 검증을 적용하지 않습니다.
    const input = createTicketSchema
      .pick({ title: true, visitDate: true })
      .safeParse({
        title: ticketTitle,
        visitDate: date.replaceAll(".", "-"),
      });
    if (!input.success) {
      Alert.alert("입력 확인", "제목과 달력에서 선택한 날짜를 확인해 주세요.");
      return false;
    }
    if (Array.from(backText.trim()).length > PERSONAL_TICKET_MEMO_MAX) {
      Alert.alert(
        "뒷면 문구 확인",
        `뒷면 문구는 최대 ${PERSONAL_TICKET_MEMO_MAX}자까지 입력할 수 있어요.`,
      );
      return false;
    }
    return true;
  };

  const finishIssuing = async () => {
    if (issuingTicket) return;
    const date = ticketDate.trim();
    setIssuingTicket(true);
    try {
      if (sharedTicketId !== undefined) {
        const design = aiDrafts?.[frame]?.design;
        if (!design || !draftPhotoKeys) throw new Error("NO_DRAFT");
        const memo = backText.trim();
        await issueTicket(sharedTicketId, {
          photoKeys: draftPhotoKeys,
          ...(memo ? { memo } : {}),
          design,
        });
        onServerTicketIssued?.();
        return;
      }
      const snapshot: IssuedTicket = {
        visitDate: date.replaceAll(".", "-"),
        photoOrientation,
        front,
        backs,
        frame,
        placedStickers,
        caption,
        sticker,
        ticketFont,
        title: ticketTitle,
        location: ticketPlace.trim() || originGroupName?.trim() || "",
        backStyle: 0,
        memo: backText.trim(),
        backColor: "#F2E8DC",
        issuedAt: new Date().toISOString(),
      };
      const created = await issueTicketOnce(snapshot);
      if (!created) {
        Alert.alert(
          "이미 발권한 날짜",
          "이 날짜에는 이미 티켓이 있어요. 달력에서 기존 티켓을 확인해 주세요.",
        );
        onBackHome();
        return;
      }
      setIssuedSnapshot(snapshot);
      if (originGroupId) onTicketIssued?.(snapshot);
      go("issued");
    } catch (error) {
      setIssueFailed(true);
      Alert.alert(
        "발권 실패",
        serverMode
          ? serverTicketErrorMessage(error)
          : "티켓을 저장하지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      setIssuingTicket(false);
      ticketIssueLock.current = false;
    }
  };

  const startTicketIssuing = () => {
    if (ticketIssueLock.current || issuingTicket) return;
    if (!validateIssueInput()) return;
    ticketIssueLock.current = true;
    setIssueFailed(false);
    ticketExitProgress.setValue(0);
    go("issuing");
    Animated.timing(ticketExitProgress, {
      toValue: 1,
      duration: 1900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) void finishIssuing();
      else ticketIssueLock.current = false;
    });
  };

  const content = () => {
    switch (step) {
      case "photos":
        return (
          <View style={styles.creationStart}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.creationStartContent}
            >
              <Text style={styles.creationTitle}>내 티켓 만들기</Text>
              <View style={styles.creationProgress}>
                {[0, 1, 2, 3].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.creationProgressSegment,
                      index <= workflowStage && styles.creationProgressActive,
                    ]}
                  />
                ))}
              </View>

              <View
                style={[styles.creationSection, styles.creationPhotoSection]}
              >
                <View
                  style={[
                    styles.creationSectionHeading,
                    styles.creationPhotoHeading,
                  ]}
                >
                  <Text style={styles.creationLabel}>
                    추억 사진 (최대 {PHOTO_UPLOAD_MAX_COUNT}장)
                  </Text>
                </View>
                <View style={styles.memoryPhotoRow}>
                  {[0, 1, 2, 3].map((slot) => {
                    const uri = memoryPhotos[slot];
                    if (uri) {
                      return (
                        <View
                          key={`${slot}-${uri}`}
                          style={styles.memoryPhotoWrap}
                        >
                          <Image
                            source={{ uri }}
                            style={styles.memoryPhoto}
                            resizeMode="cover"
                          />
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`사진 ${slot + 1} 삭제`}
                            onPress={() => {
                              const nextPhotos = memoryPhotos.filter(
                                (_, i) => i !== slot,
                              );
                              const nextIds = selectedMemoryIds.filter(
                                (_, i) => i !== slot,
                              );
                              setMemoryPhotos(nextPhotos);
                              setSelectedMemoryIds(nextIds);
                              setFront(nextPhotos[0] ?? null);
                              setBacks(nextPhotos.slice(1));
                            }}
                            style={styles.removeMemoryPhoto}
                          >
                            <Text style={styles.removeMemoryPhotoText}>×</Text>
                          </Pressable>
                        </View>
                      );
                    }
                    return (
                      <Pressable
                        key={`empty-photo-${slot}`}
                        accessibilityRole="button"
                        accessibilityLabel={`추억 사진 ${slot + 1} 추가`}
                        onPress={openPhotoPicker}
                        style={[
                          styles.addMemoryPhoto,
                          memoryPhotos.length === 0 &&
                            slot === 0 &&
                            styles.addMemoryPhotoActive,
                        ]}
                      >
                        <Text style={styles.addMemoryPhotoPlus}>＋</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.creationSection,
                  styles.creationOrientationSection,
                ]}
              >
                <View style={styles.orientationChoices}>
                  {(
                    [
                      { key: "landscape", label: "가로형" },
                      { key: "portrait", label: "세로형" },
                    ] as const
                  ).map((option) => (
                    <Pressable
                      key={option.key}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: photoOrientation === option.key,
                      }}
                      onPress={() => setPhotoOrientation(option.key)}
                      style={[
                        styles.orientationCard,
                        photoOrientation === option.key &&
                          styles.orientationCardSelected,
                      ]}
                    >
                      <FramePreview
                        drafts={aiDrafts}
                        previewOnly
                        decorateWidth={130}
                        frame={0}
                        front={null}
                        selectedPhotos={[]}
                        photoOrientation={option.key}
                        showOrientationSymbol
                        ticketTitle={ticketTitle}
                        ticketDate={ticketDate}
                        ticketPlace={ticketPlace}
                        setTicketTitle={setTicketTitle}
                        setTicketPlace={setTicketPlace}
                      />
                      <View style={styles.orientationChoiceLabel}>
                        <Text style={styles.orientationRadio}>
                          {photoOrientation === option.key ? "●" : "○"}
                        </Text>
                        <Text style={styles.orientationLabel}>
                          {option.label}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.creationSection}>
                <View style={styles.creationSectionHeading}>
                  <Text style={styles.creationLabel}>티켓 분위기 (선택)</Text>
                  <Text style={styles.creationCount}>
                    {Array.from(caption).length}/{MOOD_PROMPT_MAX}
                  </Text>
                </View>
                <Text style={styles.captionUsageHint}>
                  티켓 제목과 별도로 저장해 두었다가 템플릿 생성에 사용해요.
                </Text>
                <TextInput
                  accessibilityLabel={`AI 템플릿용 티켓 분위기 입력, 최대 ${MOOD_PROMPT_MAX}자`}
                  style={styles.creationMessageInput}
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={MOOD_PROMPT_MAX}
                  placeholder="예: 따뜻한 노을빛 여행 / 세련된 전시회 기록"
                  placeholderTextColor="#A99A90"
                  textAlignVertical="top"
                  returnKeyType="done"
                />
              </View>

              {!draftLoading && savedDraft && (
                <Pressable
                  style={styles.resumeDraftLink}
                  onPress={restoreDraft}
                >
                  <Text style={styles.resumeDraftText}>
                    임시 저장한 티켓 이어서 편집하기 →
                  </Text>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="초안 만들기"
                accessibilityState={{
                  disabled: memoryPhotos.length === 0,
                }}
                disabled={memoryPhotos.length === 0 || preparingDrafts}
                onPress={nextFromPhotos}
                style={[
                  styles.action,
                  styles.creationActionButton,
                  styles.creationInlineAction,
                  memoryPhotos.length === 0 && styles.creationActionDisabled,
                ]}
              >
                <Text style={styles.creationActionText}>
                  {preparingDrafts ? "AI 초안 만드는 중..." : "초안 만들기"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        );
      case "frames":
        return <FrameSelection />;
      case "frameConfirm":
        return <FrameSelection confirmed />;
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
                drafts={aiDrafts}
                ticketFont={ticketFont}
                decorateWidth={decorateWidth}
                stickers={placedStickers}
                onStickerMove={moveSticker}
                frame={frame}
                front={front}
                selectedPhotos={memoryPhotos}
                photoOrientation={photoOrientation}
                ticketTitle={ticketTitle}
                ticketDate={ticketDate}
                ticketPlace={ticketPlace}
                setTicketTitle={setTicketTitle}
                setTicketPlace={setTicketPlace}
              />
            </View>
            {!keyboardVisible && (
              <View style={styles.decorateTabs}>
                {(
                  [
                    { label: "사진 변경", target: "changePhoto" },
                    { label: "스티커", target: "stickers" },
                  ] as const
                ).map((item) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole="tab"
                    accessibilityState={{
                      selected:
                        item.target ===
                        (step === "stickerPlace" ? "stickers" : "changePhoto"),
                    }}
                    style={styles.decorateTab}
                    onPress={() =>
                      item.target === "changePhoto"
                        ? setPhotoChangeVisible(true)
                        : go(item.target)
                    }
                  >
                    <Text
                      style={[
                        styles.decorateTabText,
                        item.target ===
                          (step === "stickerPlace"
                            ? "stickers"
                            : "changePhoto") && styles.decorateTabTextActive,
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
                drafts={aiDrafts}
                ticketFont={ticketFont}
                decorateWidth={stickerEditWidth}
                stickers={placedStickers}
                onStickerMove={moveSticker}
                frame={frame}
                front={front}
                selectedPhotos={memoryPhotos}
                photoOrientation={photoOrientation}
                ticketTitle={ticketTitle}
                ticketDate={ticketDate}
                ticketPlace={ticketPlace}
                setTicketTitle={setTicketTitle}
                setTicketPlace={setTicketPlace}
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
                <View style={styles.stickerToolbarSpacer} />
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
                ).map((item, index) => (
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
            </View>
            <View style={styles.decorateTabs}>
              {(
                [
                  { label: "사진 변경", target: "changePhoto" },
                  { label: "스티커", target: "stickers" },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: item.target === "stickers" }}
                  style={styles.decorateTab}
                  onPress={() =>
                    item.target === "changePhoto"
                      ? setPhotoChangeVisible(true)
                      : go(item.target)
                  }
                >
                  <Text
                    style={[
                      styles.decorateTabText,
                      item.target === "stickers" &&
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
      case "text":
        return (
          <View style={styles.decorateScreen}>
            <View style={styles.decoratePreviewArea}>
              <FramePreview
                drafts={aiDrafts}
                ticketFont={ticketFont}
                decorateWidth={decorateWidth}
                stickers={placedStickers}
                onStickerMove={moveSticker}
                frame={frame}
                front={front}
                selectedPhotos={memoryPhotos}
                photoOrientation={photoOrientation}
                ticketTitle={ticketTitle}
                ticketDate={ticketDate}
                ticketPlace={ticketPlace}
                setTicketTitle={setTicketTitle}
                setTicketPlace={setTicketPlace}
              />
            </View>
            <View style={styles.decorateTabs}>
              {(
                [
                  { label: "사진 변경", target: "changePhoto" },
                  { label: "스티커", target: "stickers" },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.label}
                  style={styles.decorateTab}
                  onPress={() =>
                    item.target === "changePhoto"
                      ? setPhotoChangeVisible(true)
                      : go(item.target)
                  }
                >
                  <Text
                    style={[
                      styles.decorateTabText,
                      item.target === "stickers" &&
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
                  drafts={aiDrafts}
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
                  selectedPhotos={memoryPhotos}
                  photoOrientation={photoOrientation}
                  ticketTitle={ticketTitle}
                  ticketDate={ticketDate}
                  ticketPlace={ticketPlace}
                  setTicketTitle={setTicketTitle}
                  setTicketPlace={setTicketPlace}
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
                      value={ticketTitle}
                      onChangeText={setTicketTitle}
                      maxLength={TICKET_TITLE_MAX}
                      onBlur={() =>
                        setTicketTitle((value) =>
                          Array.from(value).slice(0, TICKET_TITLE_MAX).join(""),
                        )
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
                      {ticketDate || "달력 연동 예정"}
                    </Text>
                  </View>
                  <View style={styles.textFieldRow}>
                    <Text style={styles.textFieldLabel}>PLACE</Text>
                    <TextInput
                      style={styles.textFieldInput}
                      value={ticketPlace}
                      onChangeText={setTicketPlace}
                      maxLength={TICKET_LOCATION_MAX}
                      onBlur={() =>
                        setTicketPlace((value) =>
                          Array.from(value)
                            .slice(0, TICKET_LOCATION_MAX)
                            .join(""),
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
      case "backEdit":
        return (
          <View style={styles.backMemoScreen}>
            <View style={styles.backMemoPreviewArea}>
              <View
                style={[
                  styles.backMemoTicket,
                  {
                    width: decorateWidth,
                    height: decorateWidth * (128 / 320),
                  },
                ]}
              >
                <Text style={styles.backMemoPreviewText}>
                  {backText || "뒷면 문구가 여기에 표시돼요"}
                </Text>
              </View>
            </View>
            <View style={styles.backMemoEditor}>
              <View style={styles.backMemoHeading}>
                <Text style={styles.backMemoLabel}>뒷면 문구</Text>
                <Text style={styles.backMemoCount}>
                  {Array.from(backText.trim()).length}/
                  {PERSONAL_TICKET_MEMO_MAX}자
                </Text>
              </View>
              <TextInput
                accessibilityLabel="티켓 뒷면 문구 입력"
                style={styles.backMemoInput}
                multiline
                maxLength={PERSONAL_TICKET_MEMO_MAX}
                value={backText}
                onChangeText={setBackText}
                placeholder="티켓 뒷면에 남길 문구를 적어 주세요"
                placeholderTextColor="#987966"
                textAlignVertical="top"
              />
            </View>
          </View>
        );
      case "frontPreview":
        return (
          <>
            <ScrollView
              style={styles.ticketReviewScroll}
              contentContainerStyle={styles.ticketReviewContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.ticketReviewItem}>
                <Text style={styles.ticketReviewLabel}>앞면</Text>
                <FramePreview
                  drafts={aiDrafts}
                  previewOnly
                  ticketFont={ticketFont}
                  decorateWidth={Math.min(decorateWidth, width - 32)}
                  stickers={placedStickers}
                  frame={frame}
                  front={front}
                  selectedPhotos={memoryPhotos}
                  photoOrientation={photoOrientation}
                  ticketTitle={ticketTitle}
                  ticketDate={ticketDate}
                  ticketPlace={ticketPlace}
                  setTicketTitle={setTicketTitle}
                  setTicketPlace={setTicketPlace}
                />
              </View>
              <View style={styles.ticketReviewItem}>
                <Text style={styles.ticketReviewLabel}>뒷면</Text>
                <View
                  style={[
                    styles.backMemoTicket,
                    styles.ticketReviewBack,
                    {
                      width: Math.min(decorateWidth, width - 32),
                      height: Math.min(decorateWidth, width - 32) * (128 / 320),
                    },
                  ]}
                >
                  <Text style={styles.backMemoPreviewText}>
                    {backText || "뒷면 문구가 없어요"}
                  </Text>
                </View>
              </View>
            </ScrollView>
            <Action label="티켓 발권하기  →" onPress={startTicketIssuing} />
          </>
        );
      case "issuing":
        return (
          <View style={styles.dispenserScreen}>
            <View style={styles.dispenserBrand}>
              <Text style={styles.dispenserLogo}>MEMO:RE</Text>
              <Text style={styles.dispenserTagline}>MEMORY · TICKET</Text>
            </View>
            <View style={styles.dispenserAssembly}>
              <View style={styles.dispenserSlot} />
              <View
                style={[
                  styles.dispenserOutput,
                  {
                    width: dispenserTicketWidth,
                    height: dispenserTicketHeight + 8,
                  },
                ]}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateY: ticketExitProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-dispenserTicketHeight - 8, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <FramePreview
                    drafts={aiDrafts}
                    previewOnly
                    ticketFont={ticketFont}
                    decorateWidth={dispenserTicketWidth}
                    stickers={placedStickers}
                    frame={frame}
                    front={front}
                    selectedPhotos={memoryPhotos}
                    photoOrientation={photoOrientation}
                    ticketTitle={ticketTitle}
                    ticketDate={ticketDate}
                    ticketPlace={ticketPlace}
                    setTicketTitle={setTicketTitle}
                    setTicketPlace={setTicketPlace}
                  />
                </Animated.View>
              </View>
            </View>
            <Text style={styles.dispenserStatus}>
              {issueFailed ? "발권에 실패했어요" : "티켓을 인쇄하고 있어요..."}
            </Text>
            {issueFailed && (
              <Pressable
                style={styles.dispenserRetry}
                onPress={startTicketIssuing}
              >
                <Text style={styles.dispenserRetryText}>다시 발권하기</Text>
              </Pressable>
            )}
          </View>
        );
      case "issued":
        return (
          <View style={styles.dispenserScreen}>
            <View style={styles.dispenserBrand}>
              <Text style={styles.dispenserLogo}>MEMO:RE</Text>
              <Text style={styles.dispenserTagline}>MEMORY · TICKET</Text>
            </View>
            <View style={styles.dispenserAssembly}>
              <View style={styles.dispenserSlot} />
              <View
                style={[
                  styles.dispenserOutput,
                  { width: dispenserTicketWidth },
                ]}
              >
                <FramePreview
                  drafts={aiDrafts}
                  previewOnly
                  ticketFont={ticketFont}
                  decorateWidth={dispenserTicketWidth}
                  stickers={placedStickers}
                  frame={frame}
                  front={front}
                  selectedPhotos={memoryPhotos}
                  photoOrientation={photoOrientation}
                  ticketTitle={ticketTitle}
                  ticketDate={ticketDate}
                  ticketPlace={ticketPlace}
                  setTicketTitle={setTicketTitle}
                  setTicketPlace={setTicketPlace}
                />
              </View>
            </View>
            <Text style={styles.dispenserComplete}>티켓 발권 완료!</Text>
            <Action
              label="오늘의 티켓 보러가기  →"
              onPress={() =>
                originGroupId && onOpenGroupTickets
                  ? onOpenGroupTickets()
                  : go("archive")
              }
            />
          </View>
        );
      case "archive":
        return (
          <>
            <View style={styles.center}>
              <View style={styles.archiveTicketOffset}>
                <FramePreview
                  drafts={aiDrafts}
                  previewOnly
                  ticketFont={ticketFont}
                  decorateWidth={decorateWidth}
                  stickers={placedStickers}
                  frame={frame}
                  front={front}
                  selectedPhotos={memoryPhotos}
                  photoOrientation={photoOrientation}
                  ticketTitle={ticketTitle}
                  ticketDate={ticketDate}
                  ticketPlace={ticketPlace}
                  setTicketTitle={setTicketTitle}
                  setTicketPlace={setTicketPlace}
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
            <Action label="다시 시도하기" onPress={() => go("frontPreview")} />
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
        <View style={styles.header}>
          <Pressable onPress={onBackHome} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>발권한 티켓</Text>
        </View>
        <View style={styles.center}>
          <FramePreview
            drafts={aiDrafts}
            previewOnly
            ticketFont={issuedTicket.ticketFont}
            decorateWidth={decorateWidth}
            stickers={issuedTicket.placedStickers}
            frame={readOnlyFrame}
            front={issuedTicket.front}
            selectedPhotos={
              issuedTicket.front
                ? [issuedTicket.front, ...(issuedTicket.backs ?? [])].slice(
                    0,
                    4,
                  )
                : []
            }
            ticketTitle={issuedTicket.title}
            ticketDate={issuedTicket.visitDate}
            ticketPlace={issuedTicket.location}
            setTicketTitle={setTicketTitle}
            setTicketPlace={setTicketPlace}
          />
          <Text style={styles.info}>
            발권 완료 · 수정할 수 없는 티켓입니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Modal
        visible={photoChangeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoChangeVisible(false)}
      >
        <View style={styles.photoChangeShade}>
          <View style={styles.photoChangeCard}>
            <Text style={styles.photoChangeTitle}>사진 변경</Text>
            <View style={styles.photoChangeRow}>
              {memoryPhotos.map((uri, index) => (
                <View
                  key={`${uri}-${index}`}
                  style={styles.photoChangeThumbWrap}
                >
                  <Image
                    source={{ uri }}
                    style={styles.photoChangeThumb}
                    resizeMode="cover"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`사진 ${index + 1} 삭제`}
                    style={styles.photoChangeRemove}
                    onPress={() => {
                      const nextPhotos = memoryPhotos.filter(
                        (_, i) => i !== index,
                      );
                      const nextIds = selectedMemoryIds.filter(
                        (_, i) => i !== index,
                      );
                      setMemoryPhotos(nextPhotos);
                      setSelectedMemoryIds(nextIds);
                      setFront(nextPhotos[0] ?? null);
                      setBacks(nextPhotos.slice(1));
                    }}
                  >
                    <Text style={styles.photoChangeRemoveText}>×</Text>
                  </Pressable>
                </View>
              ))}
              {memoryPhotos.length < PHOTO_UPLOAD_MAX_COUNT && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="사진 추가"
                  style={styles.photoChangeAdd}
                  onPress={() => {
                    setPhotoChangeVisible(false);
                    setReturnToPhotoChange(true);
                    setPhotoPickerVisible(true);
                    if (galleryPhotos.length === 0) void loadGallery();
                  }}
                >
                  <Text style={styles.photoChangeAddText}>＋</Text>
                </Pressable>
              )}
            </View>
            <Pressable
              style={styles.photoChangeConfirm}
              onPress={() => setPhotoChangeVisible(false)}
            >
              <Text style={styles.photoChangeConfirmText}>선택 완료</Text>
            </Pressable>
            <Pressable
              style={styles.photoChangeCancel}
              onPress={() => setPhotoChangeVisible(false)}
            >
              <Text style={styles.photoChangeCancelText}>취소</Text>
            </Pressable>
          </View>
          {/* 사진 팝업이 열린 동안에도 하단 탭에서 바로 다른 꾸미기 도구로 이동할 수 있습니다. */}
          <View style={styles.photoChangeTabOverlay}>
            {(
              [
                { label: "사진 변경", target: "changePhoto" },
                { label: "스티커", target: "stickers" },
              ] as const
            ).map((item) => {
              const selected =
                step === "stickers" || step === "stickerPlace"
                  ? item.target === "stickers"
                  : item.target === "changePhoto";
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={styles.decorateTab}
                  onPress={() => {
                    setPhotoChangeVisible(false);
                    if (item.target === "changePhoto") return;
                    Keyboard.dismiss();
                    go(item.target);
                  }}
                >
                  <Text
                    style={[
                      styles.decorateTabText,
                      selected && styles.decorateTabTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
      <Modal
        visible={photoPickerVisible}
        animationType="slide"
        onRequestClose={closePhotoPicker}
      >
        <SafeAreaView style={styles.photoPickerRoot}>
          <View style={styles.photoPickerHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 선택 닫기"
              onPress={closePhotoPicker}
              style={styles.photoPickerClose}
            >
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <Text style={styles.photoPickerTitle}>추억 사진 선택</Text>
            <Text style={styles.photoPickerCount}>
              {memoryPhotos.length}/{PHOTO_UPLOAD_MAX_COUNT}
            </Text>
          </View>
          <FlatList
            style={styles.photoPickerList}
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
                  onPress={() => void shoot()}
                >
                  <Text style={styles.cameraIcon}>◎</Text>
                  <Text style={styles.cameraText}>촬영하기</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.galleryItem, { width: cell, height: cell }]}
                  onPress={() => {
                    if ("filename" in item) void selectGalleryPhoto(item);
                  }}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.fillImage}
                    resizeMode="cover"
                  />
                  {selectedMemoryIds.includes(item.id) && (
                    <View style={styles.selected}>
                      <Text style={styles.selectedText}>
                        {selectedMemoryIds.indexOf(item.id) + 1}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )
            }
            ListFooterComponent={
              galleryError ? (
                <View style={styles.galleryMessage}>
                  <Text style={styles.info}>{galleryError}</Text>
                  <Pressable onPress={() => void pickFromSystemLibrary()}>
                    <Text style={styles.retryText}>사진 앱에서 고르기</Text>
                  </Pressable>
                  <Pressable onPress={() => void loadGallery()}>
                    <Text style={styles.retryText}>다시 시도</Text>
                  </Pressable>
                </View>
              ) : galleryLoading ? (
                <Text style={styles.info}>사진을 불러오는 중이에요...</Text>
              ) : galleryPhotos.length === 0 ? (
                <Text style={styles.info}>기기에 저장된 사진이 없어요.</Text>
              ) : null
            }
          />
          <View style={styles.photoPickerFooter}>
            <Pressable style={styles.action} onPress={closePhotoPicker}>
              <Text style={styles.actionText}>선택 완료</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
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
        <View
          style={[styles.header, step === "photos" && styles.creationHeader]}
        >
          <Pressable
            onPress={back}
            style={[styles.back, step === "photos" && styles.creationBack]}
          >
            <Text
              style={[
                styles.backText,
                step === "photos" && styles.creationBackText,
              ]}
            >
              ‹
            </Text>
          </Pressable>
          <Text
            style={[
              styles.headerTitle,
              step === "photos" && styles.creationHeaderTitle,
            ]}
          >
            {step === "photos"
              ? ticketDate
                ? `${Number(ticketDate.slice(5, 7))}월 ${Number(ticketDate.slice(8, 10))}일`
                : "날짜 선택"
              : step === "decorate" ||
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
              step === "textInput" ||
              step === "backEdit") && (
              <Pressable
                style={styles.donePill}
                onPress={() => {
                  Keyboard.dismiss();
                  go(step === "backEdit" ? "frontPreview" : "backEdit");
                }}
                accessibilityRole="button"
                accessibilityLabel="티켓 꾸미기 완료"
              >
                <Text style={styles.donePillText}>완료</Text>
              </Pressable>
            )}
          </View>
        </View>
        {step !== "photos" &&
          step !== "issued" &&
          step !== "archive" &&
          step !== "error" && (
            <View
              accessibilityLabel={`티켓 만들기 ${workflowStage + 1}단계 중 4단계`}
              style={styles.workflowProgress}
            >
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.creationProgressSegment,
                    index <= workflowStage && styles.creationProgressActive,
                  ]}
                />
              ))}
            </View>
          )}
        <View style={styles.body}>{content()}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  // AI 초안 디자인을 기존 사진 영역 위에 덮어 그린다
  rendererOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 100,
    elevation: 100,
  },
  creationStart: { flex: 1, backgroundColor: C.bg },
  creationStartContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  creationTitle: {
    color: "#352722",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    letterSpacing: 0.15,
    marginBottom: 14,
  },
  creationProgress: { flexDirection: "row", gap: 8, marginBottom: 14 },
  workflowProgress: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 12,
  },
  ticketReviewScroll: { flex: 1 },
  ticketReviewContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 92,
  },
  ticketReviewItem: { alignItems: "center", gap: 6 },
  ticketReviewLabel: {
    alignSelf: "flex-start",
    color: C.brown,
    fontSize: 12,
    fontWeight: "600",
  },
  ticketReviewBack: { backgroundColor: "#F2E8DC" },
  creationProgressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#E8DFD6",
  },
  creationProgressActive: { backgroundColor: C.outline },
  creationSection: {},
  creationPhotoSection: { marginBottom: 14 },
  creationOrientationSection: { marginBottom: 14 },
  creationSectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  creationPhotoHeading: { marginBottom: 14 },
  creationLabel: {
    color: "#352722",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0.4,
  },
  creationCount: { color: C.outline, fontSize: 12, lineHeight: 16 },
  captionUsageHint: {
    color: C.brown,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  memoryPhotoRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  memoryPhotoWrap: {
    width: 74,
    height: 74,
    position: "relative",
    flexShrink: 0,
  },
  memoryPhoto: { width: "100%", height: "100%", borderRadius: 10 },
  removeMemoryPhoto: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(53,39,34,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeMemoryPhotoText: { color: "#FFFFFF", fontSize: 14, lineHeight: 16 },
  addMemoryPhoto: {
    width: 74,
    height: 74,
    flexShrink: 0,
    borderRadius: 10,
    backgroundColor: "#FFFDF8",
    alignItems: "center",
    justifyContent: "center",
  },
  addMemoryPhotoActive: {
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: "#F0C8BE",
  },
  addMemoryPhotoPlus: { color: C.brown, fontSize: 22, lineHeight: 28 },
  orientationChoices: { flexDirection: "row", gap: 12 },
  orientationCard: {
    flex: 1,
    height: 112,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    backgroundColor: "#FFFDF8",
    alignItems: "center",
    padding: 12,
  },
  orientationCardSelected: {
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: "#FFFDF8",
  },
  orientationChoiceLabel: {
    width: 130,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  orientationLabel: {
    color: C.brown,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  orientationRadio: { color: C.brown, fontSize: 14, lineHeight: 20 },
  creationMessageInput: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    backgroundColor: "#FFFDF8",
    color: C.brown,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  resumeDraftLink: { alignSelf: "flex-start", paddingVertical: 5 },
  resumeDraftText: {
    color: C.outline,
    fontSize: 10,
    textDecorationLine: "underline",
  },
  creationInlineAction: {
    height: 52,
    borderRadius: 10,
    marginTop: 14,
    marginBottom: 0,
  },
  creationActionButton: { backgroundColor: C.accent },
  creationActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "400" },
  creationActionDisabled: { backgroundColor: "#E8DFD6" },
  actionDisabled: { backgroundColor: "#E3DED8" },
  photoChangeShade: {
    flex: 1,
    backgroundColor: "rgba(45, 34, 28, 0.28)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  photoChangeTabOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-around",
    backgroundColor: "#E6C9BE",
    opacity: 0.72,
  },
  photoChangeCard: {
    backgroundColor: "#FFFDFC",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  photoChangeTitle: {
    color: C.brown,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  photoChangeRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  photoChangeThumbWrap: { width: 54, height: 60, position: "relative" },
  photoChangeThumb: { width: "100%", height: "100%", borderRadius: 7 },
  photoChangeRemove: {
    position: "absolute",
    right: -5,
    top: -5,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: C.brown,
    alignItems: "center",
    justifyContent: "center",
  },
  photoChangeRemoveText: { color: C.white, fontSize: 13, lineHeight: 15 },
  photoChangeAdd: {
    width: 54,
    height: 60,
    borderWidth: 1,
    borderColor: "#E9D8CD",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  photoChangeAddText: { color: C.outline, fontSize: 25, lineHeight: 29 },
  photoChangeConfirm: {
    height: 44,
    marginTop: 13,
    borderRadius: 8,
    backgroundColor: "#C58F80",
    alignItems: "center",
    justifyContent: "center",
  },
  photoChangeConfirmText: { color: C.white, fontSize: 13, fontWeight: "700" },
  photoChangeCancel: { alignItems: "center", paddingTop: 9, paddingBottom: 1 },
  photoChangeCancelText: { color: C.brown, fontSize: 12 },
  photoPickerRoot: { flex: 1, backgroundColor: C.bg },
  photoPickerHeader: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E8D8CA",
  },
  photoPickerClose: {
    width: 42,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPickerTitle: {
    flex: 1,
    color: C.brown,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  photoPickerCount: {
    width: 42,
    color: C.outline,
    fontSize: 11,
    textAlign: "right",
  },
  photoPickerList: { flex: 1 },
  photoPickerFooter: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  designPickerHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 7,
  },
  redoDesignText: {
    color: C.brown,
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  designOptions: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 2,
    gap: 4,
    paddingBottom: 8,
  },
  designOption: {
    width: 116,
    height: 88,
    alignItems: "center",
    paddingTop: 6,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 9,
  },
  designOptionSelected: { borderColor: C.accent, backgroundColor: "#F8E9E3" },
  designThumbnail: {
    width: 108,
    height: 44,
    overflow: "hidden",
    borderRadius: 4,
  },
  designOptionText: {
    width: 108,
    color: C.outline,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },
  designOptionTextSelected: { color: C.brown, fontWeight: "700" },
  photoComposition: {
    width: "100%",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    overflow: "hidden",
    borderRadius: 10,
  },
  photoCompositionPortrait: { flexDirection: "column" },
  compositionPhoto: { width: "49%", height: "49%", backgroundColor: "#E8D8CA" },
  compositionPhotoSingle: { width: "100%", height: "100%" },
  compositionPhotoHalf: { width: "49%", height: "100%" },
  compositionPhotoTallHalf: { width: "100%", height: "49%" },
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
  backMemoOnlyTextWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  backMemoOnlyText: {
    color: "#654C40",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
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
  backMemoScreen: { flex: 1, backgroundColor: C.bg },
  backMemoPreviewArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backMemoTicket: {
    backgroundColor: "#F2E8DC",
    borderWidth: 1,
    borderColor: "#E8D8CA",
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  backMemoPreviewText: {
    color: C.brown,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  backMemoEditor: { paddingHorizontal: 20, paddingBottom: 18 },
  backMemoHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backMemoLabel: { color: C.brown, fontSize: 14, fontWeight: "600" },
  backMemoCount: { color: C.outline, fontSize: 12 },
  backMemoInput: {
    minHeight: 112,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    borderRadius: 10,
    backgroundColor: "#FFFDF8",
    color: C.brown,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  stickerOverlayCanvas: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    zIndex: 20,
  },
  placedSticker: {
    position: "absolute",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    // 사진 레이어가 zIndex를 사용하므로 스티커는 사진 위에 렌더링합니다.
    zIndex: 20,
    elevation: 10,
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
    height: 205,
    backgroundColor: "#FFFDFC",
    borderTopWidth: 1,
    borderTopColor: "#E9D6CC",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  stickerSheetToolbar: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stickerToolbarSpacer: { flex: 1 },
  stickerSheetTitle: { color: C.brown, fontSize: 15, fontWeight: "600" },
  stickerSheetCancel: { color: "#D98B7D", fontSize: 22, width: 35 },
  stickerSheetConfirm: {
    color: "#D98B7D",
    fontSize: 20,
    width: 35,
    textAlign: "right",
  },
  stickerCategoryRow: { alignItems: "center", gap: 18, paddingVertical: 3 },
  stickerCategoryText: { fontSize: 11, color: "#8C7E74" },
  stickerCategoryActive: { color: C.brown, fontWeight: "700" },
  stickerGridScroll: { flex: 1, marginTop: 2 },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingBottom: 12,
  },
  stickerGridItem: {
    width: "25%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  stickerGridEmoji: { fontSize: 30 },
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
  creationHeader: { height: 56, marginBottom: 10, gap: 12 },
  back: {
    width: 40,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  creationBack: {
    height: 40,
    borderWidth: 1,
    borderColor: "#E8DFD6",
    borderRadius: 12,
    backgroundColor: "#FFFDFA",
  },
  backText: { color: C.brown, fontSize: 34, lineHeight: 39 },
  creationBackText: { color: "#352722", fontSize: 24, lineHeight: 30 },
  headerTitle: { color: C.brown, fontSize: 16, fontWeight: "500" },
  creationHeaderTitle: {
    color: "#000000",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "400",
  },
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
  framePickerArea: { marginTop: 6, paddingBottom: 92 },
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
    paddingVertical: 3,
  },
  ticketPass: {
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E8D8CA",
  },
  ticketPassStub: {
    flexShrink: 0,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  ticketPassBrand: { color: C.brown, letterSpacing: 0.35, lineHeight: 11 },
  ticketPassTitle: {
    color: C.brown,
    lineHeight: 14,
    padding: 0,
    minHeight: 24,
    textAlignVertical: "top",
  },
  ticketPassDate: { color: C.brown, lineHeight: 10 },
  ticketPassPlace: {
    color: C.brown,
    lineHeight: 12,
    padding: 0,
    minHeight: 18,
    textAlignVertical: "top",
  },
  ticketPassArt: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#F5EFE5",
  },
  ticketPassArtCanvas: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F5EFE5",
  },
  ticketPassArtCanvasPortrait: { transform: [{ rotate: "90deg" }] },
  ticketPassPersonSymbol: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketPassPersonSymbolPortrait: { transform: [{ rotate: "90deg" }] },
  ticketPassSymbolHead: { backgroundColor: C.brown },
  ticketPassSymbolBody: { backgroundColor: C.brown },
  ticketPassSinglePhoto: { ...StyleSheet.absoluteFill },
  ticketPassCollagePhoto: {
    position: "absolute",
    backgroundColor: "#E8D8CA",
    borderColor: "#FFFDF8",
  },
  ticketPassEmpty: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketPassWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: C.outline,
    opacity: 0.08,
  },
  ticketPassPhotoDate: {
    position: "absolute",
    left: 8,
    bottom: 4,
    color: "#FFFDF8",
    lineHeight: 10,
    zIndex: 10,
  },
  ticketPassPerforation: {
    position: "absolute",
    top: 8,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,253,248,0.9)",
  },
  ticketPassPunchHole: {
    position: "absolute",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    backgroundColor: C.bg,
  },
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
    marginHorizontal: 5,
  },
  frameSectionRule: {
    height: 1,
    backgroundColor: C.outline,
    marginBottom: 12,
    marginHorizontal: 5,
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
  dispenserScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 72,
  },
  dispenserBrand: {
    alignItems: "center",
    marginBottom: 30,
  },
  dispenserLogo: {
    color: C.outline,
    fontFamily: "serif",
    fontSize: 27,
    fontStyle: "italic",
    letterSpacing: 1.2,
  },
  dispenserTagline: {
    color: C.brown,
    fontSize: 6,
    letterSpacing: 1.5,
    marginTop: -2,
  },
  dispenserAssembly: {
    alignItems: "center",
    width: "100%",
  },
  dispenserSlot: {
    width: "100%",
    maxWidth: 320,
    height: 8,
    borderRadius: 5,
    backgroundColor: "#49382F",
    marginBottom: 0,
    zIndex: 2,
    elevation: 4,
    shadowColor: "#372921",
    shadowOpacity: 0.28,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  dispenserOutput: {
    overflow: "hidden",
    alignItems: "center",
    paddingTop: 8,
  },
  dispenserStatus: {
    color: C.brown,
    fontSize: 13,
    marginTop: 22,
  },
  dispenserRetry: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: C.brown,
  },
  dispenserRetryText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "600",
  },
  dispenserComplete: {
    color: C.brown,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 22,
  },
});
