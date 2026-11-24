import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// MENU / 설정·문의 / 계정 화면을 한 파일에서 관리합니다.
// 이 파일은 기존 화면 시연용이며, 문의 접수·로그아웃·회원 탈퇴 API는 아직 연결되지 않았습니다.

const C = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  primary: "#282B33",
  secondary: "#767A85",
  accent: "#0750ED",
  soft: "#EAF0FF",
  line: "#DFE5F0",
  white: "#FFFFFF",
};
const menuBackIcon = {
  uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAM9JREFUeAHtlaEOwjAQhq9oAgaBmOMxEAyCIRlheiS4EQxiGBQvQMJj8AA8BALJm6zdpo+1EnO9bs3M/qSpufu/u+baCqwFHjUAz+oBfgCqqCDeX+B8vZOxbIA23yUZvD9fULKkE5AhqUoMoxQnsxWG2xRzWZA51gAXc2uAq7kVoIm5FeBwujmba5FTlKvK7EIvAXxRFeiqF9HRdLGsu5Cq5SNqCrEeU1cI66K5QFiAf0icZGQ8+y0aj4bwej5gs55DEEzJeGHa8Kj+R+se8AOqMJSwLSNYTAAAAABJRU5ErkJggg==",
} as const;
const menuChevronIcon = {
  uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAKJJREFUeAHd1D0OgjAAhuGvDOqgCV5FZ+PC6BHcPZOrjq5ushhn3SQwwQ3K3wBTKYxAoYWy8B7gSdqvKWE8aMiApqaHHC9AGCUYBdEwwe3xwvX+lMZaoa25gXXcczCVxoRHsw47JazzslWw3tXqWJbnw6BmZBhkf36w318+wBqX8wmr5UIdqiMmX1OUoQMRQuWDVEGqmKC/6zNKYyYbme83UgDo1ZoztcP63wAAAABJRU5ErkJggg==",
} as const;

function MenuHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={uiStyles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="이전 화면"
        onPress={onBack}
        style={uiStyles.backButton}
      >
        <Image
          source={menuBackIcon}
          style={uiStyles.backIcon}
          resizeMode="contain"
        />
      </Pressable>
      <Text accessibilityRole="header" style={uiStyles.title}>
        {title}
      </Text>
    </View>
  );
}

function MenuActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={uiStyles.actionButton}
    >
      <Text style={uiStyles.actionText}>{label}</Text>
    </Pressable>
  );
}

function MenuCompleteState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={uiStyles.complete}>
      <View style={uiStyles.checkCircle}>
        <Text style={uiStyles.check}>✓</Text>
      </View>
      <Text style={uiStyles.completeTitle}>{title}</Text>
      <Text style={uiStyles.completeDescription}>{description}</Text>
    </View>
  );
}

const uiStyles = StyleSheet.create({
  header: {
    height: 54,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 24,
    top: 15,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { width: 24, height: 24 },
  title: {
    fontSize: 16,
    color: C.primary,
    fontWeight: "500",
    textAlign: "center",
  },
  actionButton: {
    minHeight: 48,
    backgroundColor: C.accent,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { fontSize: 14, color: C.white, fontWeight: "600" },
  complete: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  checkCircle: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  check: { fontSize: 39, color: C.accent, fontWeight: "300" },
  completeTitle: { fontSize: 20, color: C.primary, fontWeight: "600" },
  completeDescription: {
    color: C.secondary,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 21,
    marginTop: 13,
  },
});

type MenuAccountProps = {
  mode: "withdraw" | "complete";
  onBack: () => void;
  onConfirm: () => void;
};

function MenuAccountScreen({ mode, onBack, onConfirm }: MenuAccountProps) {
  if (mode === "complete") {
    return (
      <View style={accountStyles.fill}>
        <MenuHeader title="회원 탈퇴" onBack={onBack} />
        <MenuCompleteState
          title="회원 탈퇴 완료"
          description={
            "디자인 확인용 화면입니다.\n실제 계정은 삭제되지 않았어요."
          }
        />
      </View>
    );
  }

  return (
    <View style={accountStyles.fill}>
      <MenuHeader title="회원 탈퇴" onBack={onBack} />
      <ScrollView
        style={accountStyles.fill}
        contentContainerStyle={accountStyles.scrollContent}
      >
        <View style={accountStyles.warningHeading}>
          <Text style={accountStyles.warningHeadingText}>
            탈퇴 후에는 회원 정보, 발권 티켓, 구매 내역, 게시물, 댓글 등 모든
            활동 정보가 삭제될 수 있습니다.
          </Text>
        </View>
        <View style={accountStyles.sectionLabel}>
          <View style={accountStyles.dot} />
          <Text style={accountStyles.sectionLabelText}>
            서비스 이용을 종료할 예정이세요?
          </Text>
        </View>
        <View style={accountStyles.sectionBody}>
          <Text style={accountStyles.explanation}>
            서비스 탈퇴 시 계정 데이터를 복구할 수 없을 수 있습니다. 더 나은
            서비스를 제공하기 위해 노력하겠습니다.
          </Text>
          <Text style={accountStyles.previewExplanation}>
            현재는 화면 시연 단계로, 실제 탈퇴·데이터 삭제 기능이 연결되어 있지
            않습니다.
          </Text>
        </View>
      </ScrollView>
      <View style={accountStyles.bottomArea}>
        <MenuActionButton label="회원 탈퇴" onPress={onConfirm} />
      </View>
    </View>
  );
}

const accountStyles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.background },
  scrollContent: { flexGrow: 1 },
  warningHeading: {
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderBottomColor: C.line,
    borderBottomWidth: 1,
  },
  warningHeadingText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 23,
  },
  sectionLabel: {
    height: 51,
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 19,
    borderBottomColor: C.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 7, height: 7, backgroundColor: C.accent, borderRadius: 4 },
  sectionLabelText: { color: C.primary, fontSize: 13, fontWeight: "600" },
  sectionBody: {
    backgroundColor: C.surface,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 25,
    minHeight: 150,
  },
  explanation: { color: C.secondary, fontSize: 13, lineHeight: 22 },
  previewExplanation: {
    color: C.secondary,
    fontSize: 11,
    lineHeight: 19,
    marginTop: 18,
  },
  bottomArea: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
});

// API가 연결되기 전 메뉴 화면 동작 확인에만 사용하는 데이터입니다.
type PreviewInquiry = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  answer: string | null;
  answeredAt: string | null;
  example: boolean;
};

const exampleInquiries: PreviewInquiry[] = [
  {
    id: "example-1",
    title: "결제 관련 문의",
    content: "서비스 결제 관련 내용을 확인하고 싶어요.",
    createdAt: "2026년 10월 15일",
    answer:
      "문의 주신 내용을 확인했습니다. 도움이 필요하시면 다시 문의해 주세요.",
    answeredAt: "2026년 10월 20일",
    example: true,
  },
  {
    id: "example-2",
    title: "이미지 저장 관련 문의",
    content: "이미지를 저장하는 방법을 알고 싶어요.",
    createdAt: "2026년 10월 15일",
    answer: null,
    answeredAt: null,
    example: true,
  },
];

type MenuSupportProps = {
  onBack: () => void;
  records: PreviewInquiry[];
  onAddPreview: (record: PreviewInquiry) => void;
};

type Tab = "write" | "history";

function readableDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function FieldTitle({ children }: { children: string }) {
  return (
    <View style={supportStyles.fieldTitle}>
      <View style={supportStyles.dot} />
      <Text style={supportStyles.fieldTitleText}>{children}</Text>
    </View>
  );
}

function MenuSupportScreen({
  onBack,
  records,
  onAddPreview,
}: MenuSupportProps) {
  const [tab, setTab] = useState<Tab>("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<PreviewInquiry | null>(null);
  const [completed, setCompleted] = useState(false);

  function back() {
    if (completed) {
      setCompleted(false);
      setTab("history");
    } else if (selected) {
      setSelected(null);
    } else {
      onBack();
    }
  }

  function previewSubmit() {
    if (!title.trim() || !content.trim()) {
      Alert.alert("입력 확인", "문의 제목과 문의 내용을 모두 입력해 주세요.");
      return;
    }
    Keyboard.dismiss();
    Alert.alert(
      "문의 화면 시연",
      "아직 문의 API가 연결되지 않았어요. 실제 접수 없이 화면에서만 문의 작성 결과를 확인할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "미리보기 저장",
          onPress: () => {
            onAddPreview({
              id: `preview-${Date.now()}`,
              title: title.trim(),
              content: content.trim(),
              createdAt: readableDate(new Date()),
              answer: null,
              answeredAt: null,
              example: false,
            });
            setTitle("");
            setContent("");
            setCompleted(true);
          },
        },
      ],
    );
  }

  if (completed) {
    return (
      <View style={supportStyles.fill}>
        <MenuHeader title="1:1 문의하기" onBack={back} />
        <MenuCompleteState
          title="문의 접수 완료"
          description={
            "화면 시연용 완료 안내입니다.\n실제 문의는 서버에 접수되지 않았어요."
          }
        />
      </View>
    );
  }

  if (selected) {
    return (
      <View style={supportStyles.fill}>
        <MenuHeader title="1:1 문의하기" onBack={back} />
        <View style={supportStyles.tabs}>
          <TabButton
            label="문의하기"
            selected={false}
            onPress={() => {
              setSelected(null);
              setTab("write");
            }}
          />
          <TabButton
            label="문의내역확인"
            selected
            onPress={() => setSelected(null)}
          />
        </View>
        <ScrollView
          style={supportStyles.fill}
          contentContainerStyle={supportStyles.detailScroll}
        >
          {selected.example && (
            <Text style={supportStyles.previewNotice}>
              디자인 확인용 예시 문의입니다.
            </Text>
          )}
          {!selected.example && (
            <Text style={supportStyles.previewNotice}>
              이 기기 화면에서만 만든 임시 문의입니다.
            </Text>
          )}
          <FieldTitle>문의 제목</FieldTitle>
          <View style={supportStyles.detailBody}>
            <Text style={supportStyles.detailText}>{selected.title}</Text>
          </View>
          <FieldTitle>문의 내용</FieldTitle>
          <View style={[supportStyles.detailBody, supportStyles.longBody]}>
            <Text style={supportStyles.detailText}>{selected.content}</Text>
          </View>
          <Text style={supportStyles.detailDate}>
            문의 날짜 : {selected.createdAt}
          </Text>
          <FieldTitle>문의 답변</FieldTitle>
          <View style={[supportStyles.detailBody, supportStyles.longBody]}>
            <Text style={supportStyles.detailText}>
              {selected.answer ?? "답변 대기 중입니다."}
            </Text>
          </View>
          {selected.answeredAt && (
            <Text style={supportStyles.detailDate}>
              답변 날짜 : {selected.answeredAt}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={supportStyles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <MenuHeader title="1:1 문의하기" onBack={back} />
      <View style={supportStyles.tabs}>
        <TabButton
          label="문의하기"
          selected={tab === "write"}
          onPress={() => setTab("write")}
        />
        <TabButton
          label="문의내역확인"
          selected={tab === "history"}
          onPress={() => setTab("history")}
        />
      </View>
      {tab === "write" ? (
        <>
          <ScrollView
            style={supportStyles.fill}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={supportStyles.formScroll}
          >
            <FieldTitle>문의 제목</FieldTitle>
            <TextInput
              accessibilityLabel="문의 제목 입력"
              style={supportStyles.titleInput}
              placeholder="제목을 입력해주세요."
              placeholderTextColor={C.secondary}
              value={title}
              onChangeText={setTitle}
              autoCorrect={false}
            />
            <FieldTitle>문의 내용</FieldTitle>
            <TextInput
              accessibilityLabel="문의 내용 입력"
              style={supportStyles.contentInput}
              placeholder="내용을 입력해주세요."
              placeholderTextColor={C.secondary}
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
              multiline
            />
            <Text style={supportStyles.previewNotice}>
              현재는 화면 시연 단계이며, 실제 문의는 접수되지 않습니다.
            </Text>
          </ScrollView>
          <View style={supportStyles.buttonBottom}>
            <MenuActionButton label="문의하기" onPress={previewSubmit} />
          </View>
        </>
      ) : (
        <ScrollView
          style={supportStyles.fill}
          contentContainerStyle={supportStyles.historyScroll}
        >
          <Text style={supportStyles.previewNotice}>
            예시와 임시 문의만 표시됩니다. 서버 문의 내역이 아니에요.
          </Text>
          {records.length === 0 ? (
            <Text style={supportStyles.emptyText}>
              아직 문의 내역이 없어요.
            </Text>
          ) : (
            records.map((record) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${record.title}, ${record.answer ? "답변 완료" : "답변 대기"}`}
                onPress={() => setSelected(record)}
                key={record.id}
                style={supportStyles.historyRow}
              >
                <View style={supportStyles.historyTextWrap}>
                  <Text style={supportStyles.historyTitle} numberOfLines={1}>
                    {record.title}
                  </Text>
                  <Text style={supportStyles.historyDate}>
                    {record.createdAt}
                    {record.example ? " · 예시" : " · 임시"}
                  </Text>
                </View>
                <Text
                  style={[
                    supportStyles.historyStatus,
                    record.answer && supportStyles.answered,
                  ]}
                >
                  {record.answer ? "답변 완료" : "답변 대기"}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function TabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        supportStyles.tabButton,
        selected && supportStyles.tabButtonSelected,
      ]}
    >
      <Text
        style={[
          supportStyles.tabText,
          selected && supportStyles.tabTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const supportStyles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.background },
  tabs: {
    height: 49,
    flexDirection: "row",
    borderBottomColor: C.line,
    borderBottomWidth: 1,
  },
  tabButton: { width: "50%", alignItems: "center", justifyContent: "center" },
  tabButtonSelected: { borderBottomWidth: 2, borderBottomColor: C.primary },
  tabText: { fontSize: 13, color: C.secondary },
  tabTextSelected: { color: C.primary, fontWeight: "600" },
  formScroll: { flexGrow: 1 },
  fieldTitle: {
    height: 49,
    backgroundColor: C.background,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 9,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  fieldTitleText: { fontSize: 13, color: C.primary, fontWeight: "600" },
  titleInput: {
    backgroundColor: C.surface,
    minHeight: 59,
    paddingHorizontal: 22,
    fontSize: 13,
    color: C.primary,
  },
  contentInput: {
    backgroundColor: C.surface,
    height: 195,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    fontSize: 13,
    color: C.primary,
  },
  buttonBottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: C.background,
  },
  previewNotice: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    color: C.secondary,
    fontSize: 11,
    lineHeight: 17,
  },
  historyScroll: { paddingBottom: 32 },
  historyRow: {
    flexDirection: "row",
    minHeight: 74,
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: C.surface,
    borderBottomColor: C.line,
    borderBottomWidth: 1,
  },
  historyTextWrap: { flex: 1, paddingRight: 16 },
  historyTitle: { fontSize: 13, color: C.primary, marginBottom: 5 },
  historyDate: { fontSize: 11, color: C.secondary },
  historyStatus: { fontSize: 11, color: C.secondary },
  answered: { color: C.primary, fontWeight: "600" },
  emptyText: {
    marginTop: 60,
    textAlign: "center",
    fontSize: 13,
    color: C.secondary,
  },
  detailScroll: { flexGrow: 1, paddingBottom: 30 },
  detailBody: {
    backgroundColor: C.surface,
    minHeight: 67,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  longBody: { minHeight: 170, justifyContent: "flex-start", paddingTop: 20 },
  detailText: { fontSize: 13, lineHeight: 22, color: C.primary },
  detailDate: {
    textAlign: "right",
    paddingHorizontal: 20,
    paddingTop: 13,
    paddingBottom: 20,
    fontSize: 11,
    color: C.secondary,
  },
});

export type MenuRoute =
  | "settings"
  | "imageSettings"
  | "subscription"
  | "faq"
  | "inquiry"
  | "notice"
  | "withdraw"
  | "logout";

type MenuPage =
  | "menu"
  | MenuRoute
  | "paymentHistory"
  | "purchasedDesigns"
  | "withdrawComplete";

type Confirmation = "logout" | "withdraw" | null;
type InfoDialog = { title: string; message: string };
type FaqCategory = "전체" | "티켓" | "그룹" | "결제";
type HistoryCategory = "전체" | "구독" | "디자인";
type PurchaseRecord = {
  title: string;
  category: "구독" | "디자인";
  detail: string;
  date: string;
};
type NotificationSettingKey =
  "groupTicketInvites" | "inquiryReplies" | "marketing";
type NotificationSettings = Record<NotificationSettingKey, boolean>;

const NOTIFICATION_SETTINGS_KEY = "@memore/notification_settings_v1";
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  groupTicketInvites: true,
  inquiryReplies: true,
  marketing: true,
};
const FAQ_ENTRIES: {
  category: Exclude<FaqCategory, "전체">;
  question: string;
  answer: string;
}[] = [
  {
    category: "티켓",
    question: "티켓은 어떻게 만드나요?",
    answer:
      "날짜를 선택한 뒤 사진과 제목, 참여 멤버를 입력하고 티켓을 발권해 주세요.",
  },
  {
    category: "그룹",
    question: "그룹은 몇 개까지 참여할 수 있나요?",
    answer: "그룹 정원은 6명이며, 최대 4개 그룹에 참여할 수 있어요.",
  },
  {
    category: "그룹",
    question: "탈퇴한 그룹의 티켓도 볼 수 있나요?",
    answer:
      "탈퇴한 그룹의 티켓은 개인 보관함에서 볼 수 있지만, 탈퇴한 그룹으로 이동할 수는 없어요.",
  },
  {
    category: "결제",
    question: "VIP에서 어떤 디자인을 사용할 수 있나요?",
    answer:
      "VIP 구독 중에는 VIP 디자인에 포함된 스티커와 폰트를 사용할 수 있어요.",
  },
  {
    category: "결제",
    question: "구매한 디자인이 보이지 않아요.",
    answer:
      "구독 및 구매 화면에서 구매 복원을 눌러 주세요. 결제에 사용한 스토어 계정도 확인해 주세요.",
  },
];
const PURCHASE_HISTORY: PurchaseRecord[] = [
  {
    title: "MEMO:RE VIP",
    category: "구독",
    detail: "구독 갱신",
    date: "2026.10.20",
  },
  {
    title: "소프트 리본",
    category: "디자인",
    detail: "₩2,900",
    date: "2026.10.20",
  },
  {
    title: "로즈 스티커",
    category: "디자인",
    detail: "₩1,900",
    date: "2026.10.18",
  },
];

type MenuExperienceProps = {
  visible: boolean;
  onClose: () => void;
  onLogout?: () => void;
  initialPage?: MenuRoute | "menu";
};

// 기존 HomeScreen에서 쓸 수 있는 메뉴 화면입니다. 서버 API를 임의로 만들지 않습니다.
export default function MenuExperience({
  visible,
  onClose,
  onLogout,
  initialPage = "menu",
}: MenuExperienceProps) {
  const [page, setPage] = useState<MenuPage>("menu");
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [infoDialog, setInfoDialog] = useState<InfoDialog | null>(null);
  const [faqCategory, setFaqCategory] = useState<FaqCategory>("전체");
  const [historyCategory, setHistoryCategory] =
    useState<HistoryCategory>("전체");
  const [inquiries, setInquiries] =
    useState<PreviewInquiry[]>(exampleInquiries);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const { width: screenWidth } = useWindowDimensions();
  const [rendered, setRendered] = useState(false);
  const slideX = useRef(new Animated.Value(-screenWidth)).current;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const saved: unknown = JSON.parse(raw);
        if (typeof saved !== "object" || saved === null) return;
        const values = saved as Partial<NotificationSettings>;
        setNotificationSettings({
          groupTicketInvites:
            typeof values.groupTicketInvites === "boolean"
              ? values.groupTicketInvites
              : true,
          inquiryReplies:
            typeof values.inquiryReplies === "boolean"
              ? values.inquiryReplies
              : true,
          marketing:
            typeof values.marketing === "boolean" ? values.marketing : true,
        });
      })
      .catch(() => {
        // 저장 설정을 읽지 못하면 화면 기본값을 사용합니다.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setConfirmation(initialPage === "logout" ? "logout" : null);
    setInfoDialog(null);
    setFaqCategory("전체");
    setHistoryCategory("전체");
    setPage(initialPage === "logout" ? "logout" : initialPage);
  }, [visible, initialPage]);

  // 모달을 즉시 닫지 않고, 왼쪽으로 빠지는 애니메이션 후 화면에서 내립니다.
  useEffect(() => {
    slideX.stopAnimation();
    if (visible) {
      setRendered(true);
      return;
    }
    Animated.timing(slideX, {
      toValue: -screenWidth,
      duration: 240,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRendered(false);
    });
  }, [visible, screenWidth, slideX]);

  useEffect(() => {
    if (!rendered || !visible) return;
    slideX.setValue(-screenWidth);
    Animated.timing(slideX, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [rendered, visible, screenWidth, slideX]);

  function closeMenu() {
    setConfirmation(null);
    setInfoDialog(null);
    setPage("menu");
    onClose();
  }

  function back() {
    if (infoDialog) {
      setInfoDialog(null);
      return;
    }
    if (confirmation) {
      setConfirmation(null);
      if (page === "logout") closeMenu();
    } else if (page === "paymentHistory" || page === "purchasedDesigns") {
      setPage("subscription");
    } else if (page === "withdrawComplete" || page === "menu") {
      closeMenu();
    } else {
      closeMenu();
    }
  }

  function menuEntry(title: string, target: MenuPage) {
    return (
      <Pressable
        key={title}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => setPage(target)}
        style={menuStyles.menuEntry}
      >
        <Text style={menuStyles.menuEntryText}>{title}</Text>
      </Pressable>
    );
  }

  function menuRoot() {
    return (
      <View style={menuStyles.fill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="메뉴 닫기"
          onPress={closeMenu}
          style={menuStyles.closeButton}
        >
          <Text style={menuStyles.closeText}>×</Text>
        </Pressable>
        <View style={menuStyles.menuContents}>
          <View style={menuStyles.menuGroup}>
            <Text style={menuStyles.menuGroupTitle}>편의 기능</Text>
            {menuEntry("환경 설정", "settings")}
            {menuEntry("이미지 저장 설정", "imageSettings")}
          </View>
          <View style={menuStyles.menuGroup}>
            <Text style={menuStyles.menuGroupTitle}>지원</Text>
            {menuEntry("자주 묻는 질문", "faq")}
            {menuEntry("1:1 문의하기", "inquiry")}
            {menuEntry("공지사항", "notice")}
          </View>
        </View>
        <View style={menuStyles.menuFooter}>
          <Pressable
            accessibilityRole="button"
            style={menuStyles.menuEntry}
            onPress={() => setConfirmation("logout")}
          >
            <Text style={menuStyles.menuEntryText}>로그아웃</Text>
          </Pressable>
          {menuEntry("회원 탈퇴", "withdraw")}
        </View>
      </View>
    );
  }

  function simplePage(title: string, description?: string) {
    return (
      <View style={menuStyles.fill}>
        <MenuHeader title={title} onBack={back} />
        {description && (
          <Text style={menuStyles.placeholder}>{description}</Text>
        )}
      </View>
    );
  }

  function toggleNotificationSetting(key: NotificationSettingKey) {
    const nextSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    };
    setNotificationSettings(nextSettings);
    void AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(nextSettings),
    ).catch(() => {
      Alert.alert("저장 실패", "알림 설정을 저장하지 못했어요.");
    });
  }

  function settingsPage() {
    const rows: { key: NotificationSettingKey; label: string }[] = [
      { key: "groupTicketInvites", label: "그룹·티켓 초대 알림" },
      { key: "inquiryReplies", label: "문의 답변 알림" },
      { key: "marketing", label: "마케팅 알림" },
    ];
    return (
      <View style={menuStyles.fill}>
        <MenuHeader title="환경 설정" onBack={back} />
        <View style={menuStyles.settingsList}>
          <Text style={menuStyles.settingsSectionTitle}>알림</Text>
          {rows.map(({ key, label }) => {
            const enabled = notificationSettings[key];
            return (
              <View key={key} style={menuStyles.settingsRow}>
                <Text style={menuStyles.settingsLabel}>{label}</Text>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: enabled }}
                  onPress={() => toggleNotificationSetting(key)}
                  style={[
                    menuStyles.settingsToggle,
                    !enabled && menuStyles.settingsToggleOff,
                  ]}
                >
                  <View
                    style={[
                      menuStyles.settingsToggleKnob,
                      enabled && menuStyles.settingsToggleKnobOn,
                    ]}
                  />
                </Pressable>
              </View>
            );
          })}
          <View style={menuStyles.settingsVersionRow}>
            <View style={menuStyles.settingsVersionText}>
              <Text style={menuStyles.settingsLabel}>앱 버전</Text>
              <Text style={menuStyles.settingsVersionValue}>1.0.0</Text>
            </View>
            <Image
              source={menuChevronIcon}
              style={menuStyles.settingsChevron}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    );
  }

  function showInfoDialog(title: string, message: string) {
    setInfoDialog({ title, message });
  }

  function subscriptionPage() {
    return (
      <View style={menuStyles.fill}>
        <MenuHeader title="구독 및 구매" onBack={back} />
        <ScrollView
          style={menuStyles.fill}
          contentContainerStyle={menuStyles.subscriptionContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={menuStyles.subscriptionStatus}>
            <Text style={menuStyles.subscriptionBrand}>MEMO:RE VIP</Text>
            <Text style={menuStyles.subscriptionTitle}>구독 중</Text>
            <Text style={menuStyles.subscriptionNextDate}>
              다음 결제일 2026.12.20
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                showInfoDialog(
                  "구독 관리",
                  "구독 변경 및 해지는 App Store 또는 Google Play의 구독 관리에서 진행해요.",
                )
              }
              style={menuStyles.subscriptionManage}
            >
              <Text style={menuStyles.subscriptionManageText}>구독 관리 →</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPage("purchasedDesigns")}
            style={menuStyles.subscriptionRow}
          >
            <View style={menuStyles.subscriptionRowText}>
              <Text style={menuStyles.settingsLabel}>구매한 디자인</Text>
              <Text style={menuStyles.settingsVersionValue}>
                스티커 · 프레임 · 폰트
              </Text>
            </View>
            <Image
              source={menuChevronIcon}
              style={menuStyles.settingsChevron}
              resizeMode="contain"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setHistoryCategory("전체");
              setPage("paymentHistory");
            }}
            style={menuStyles.subscriptionRow}
          >
            <Text style={menuStyles.settingsLabel}>결제 내역</Text>
            <Image
              source={menuChevronIcon}
              style={menuStyles.settingsChevron}
              resizeMode="contain"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              showInfoDialog(
                "구매 복원",
                "이전에 구매한 디자인을 확인하려면 결제에 사용한 스토어 계정으로 구매 복원을 진행해 주세요.",
              )
            }
            style={menuStyles.subscriptionRow}
          >
            <Text style={menuStyles.settingsLabel}>구매 복원</Text>
            <Image
              source={menuChevronIcon}
              style={menuStyles.settingsChevron}
              resizeMode="contain"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              showInfoDialog(
                "환불 안내",
                "환불은 결제한 App Store 또는 Google Play의 구매 내역에서 신청해 주세요.",
              )
            }
            style={menuStyles.refundButton}
          >
            <Text style={menuStyles.refundButtonText}>환불 안내</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  function paymentHistoryPage() {
    const categories: HistoryCategory[] = ["전체", "구독", "디자인"];
    const records = PURCHASE_HISTORY.filter(
      (record) =>
        historyCategory === "전체" || record.category === historyCategory,
    );
    return (
      <View style={menuStyles.fill}>
        <MenuHeader title="결제 내역" onBack={back} />
        <ScrollView
          style={menuStyles.fill}
          contentContainerStyle={menuStyles.historyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={menuStyles.filterTabs}>
            {categories.map((category) => {
              const selected = category === historyCategory;
              return (
                <Pressable
                  key={category}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setHistoryCategory(category)}
                  style={menuStyles.filterTab}
                >
                  <Text
                    style={[
                      menuStyles.filterTabText,
                      selected && menuStyles.filterTabTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                  {selected && <View style={menuStyles.filterIndicator} />}
                </Pressable>
              );
            })}
          </View>
          <View style={menuStyles.historyRows}>
            {records.map((record) => (
              <Pressable
                key={`${record.title}-${record.date}`}
                accessibilityRole="button"
                onPress={() =>
                  showInfoDialog(
                    record.title,
                    `${record.date} · ${record.detail}`,
                  )
                }
                style={menuStyles.historyRow}
              >
                <View style={menuStyles.subscriptionRowText}>
                  <Text style={menuStyles.settingsLabel}>{record.title}</Text>
                  <Text style={menuStyles.settingsVersionValue}>
                    {record.date} · {record.detail}
                  </Text>
                </View>
                <Image
                  source={menuChevronIcon}
                  style={menuStyles.settingsChevron}
                  resizeMode="contain"
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  function purchasedDesignsPage() {
    const designs = PURCHASE_HISTORY.filter(
      (record) => record.category === "디자인",
    );
    return (
      <View style={menuStyles.fill}>
        <MenuHeader title="구매한 디자인" onBack={back} />
        <ScrollView
          style={menuStyles.fill}
          contentContainerStyle={menuStyles.historyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={menuStyles.historyRows}>
            {designs.map((record) => (
              <View key={record.title} style={menuStyles.historyRow}>
                <View style={menuStyles.subscriptionRowText}>
                  <Text style={menuStyles.settingsLabel}>{record.title}</Text>
                  <Text style={menuStyles.settingsVersionValue}>
                    {record.date} · {record.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  function faqPage() {
    const categories: FaqCategory[] = ["전체", "티켓", "그룹", "결제"];
    const entries = FAQ_ENTRIES.filter(
      (entry) => faqCategory === "전체" || entry.category === faqCategory,
    );
    return (
      <View style={menuStyles.fill}>
        <MenuHeader title="자주 묻는 질문" onBack={back} />
        <ScrollView
          style={menuStyles.fill}
          contentContainerStyle={menuStyles.faqContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={menuStyles.filterTabs}>
            {categories.map((category) => {
              const selected = category === faqCategory;
              return (
                <Pressable
                  key={category}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setFaqCategory(category)}
                  style={menuStyles.filterTab}
                >
                  <Text
                    style={[
                      menuStyles.filterTabText,
                      selected && menuStyles.filterTabTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                  {selected && <View style={menuStyles.filterIndicator} />}
                </Pressable>
              );
            })}
          </View>
          <View style={menuStyles.faqRows}>
            {entries.map((entry) => (
              <Pressable
                key={entry.question}
                accessibilityRole="button"
                onPress={() => showInfoDialog("자주 묻는 질문", entry.answer)}
                style={menuStyles.faqRow}
              >
                <Text numberOfLines={1} style={menuStyles.faqQuestion}>
                  {entry.question}
                </Text>
                <Image
                  source={menuChevronIcon}
                  style={menuStyles.settingsChevron}
                  resizeMode="contain"
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  function currentPage() {
    switch (page) {
      case "menu":
        return menuRoot();
      case "settings":
        return settingsPage();
      case "subscription":
        return subscriptionPage();
      case "paymentHistory":
        return paymentHistoryPage();
      case "purchasedDesigns":
        return purchasedDesignsPage();
      case "imageSettings":
        return simplePage(
          "이미지 저장 설정",
          "이미지 저장 설정 화면은 상세 기획 확정 후 연결할 예정이에요.",
        );
      case "faq":
        return faqPage();
      case "notice":
        return simplePage("공지사항", "아직 등록된 공지사항이 없습니다.");
      case "logout":
        return simplePage("로그아웃");
      case "inquiry":
        return (
          <MenuSupportScreen
            onBack={back}
            records={inquiries}
            onAddPreview={(record) =>
              setInquiries((previous) => [record, ...previous])
            }
          />
        );
      case "withdraw":
        return (
          <MenuAccountScreen
            mode="withdraw"
            onBack={back}
            onConfirm={() => setConfirmation("withdraw")}
          />
        );
      case "withdrawComplete":
        return (
          <MenuAccountScreen
            mode="complete"
            onBack={back}
            onConfirm={() => {}}
          />
        );
    }
  }

  function confirm() {
    if (confirmation === "logout") {
      setConfirmation(null);
      if (!onLogout) {
        Alert.alert(
          "안내",
          "로그아웃 후 로그인 화면으로 이동하는 연결이 필요해요.",
        );
        return;
      }
      closeMenu();
      onLogout();
      return;
    }
    if (confirmation === "withdraw") {
      setConfirmation(null);
      setPage("withdrawComplete");
    }
  }

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={back}
    >
      <View style={menuStyles.modalRoot}>
        <Animated.View
          style={[
            menuStyles.slidePanel,
            { transform: [{ translateX: slideX }] },
          ]}
        >
          <SafeAreaView style={menuStyles.safeArea}>
            <View style={menuStyles.page}>{currentPage()}</View>
            {(confirmation !== null || infoDialog !== null) && (
              <View style={menuStyles.overlay}>
                {infoDialog ? (
                  <View style={menuStyles.infoDialog}>
                    <Text style={menuStyles.infoDialogTitle}>
                      {infoDialog.title}
                    </Text>
                    <Text style={menuStyles.infoDialogMessage}>
                      {infoDialog.message}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setInfoDialog(null)}
                      style={menuStyles.infoDialogPrimary}
                    >
                      <Text style={menuStyles.infoDialogPrimaryText}>확인</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setInfoDialog(null)}
                      style={menuStyles.infoDialogSecondary}
                    >
                      <Text style={menuStyles.infoDialogSecondaryText}>
                        닫기
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={menuStyles.dialog}>
                    <Text style={menuStyles.dialogText}>
                      {confirmation === "logout"
                        ? "로그아웃 하시겠습니까?"
                        : "탈퇴 후에는 소중한 추억과 회원 정보가 복구되지 않을 수 있습니다.\n\n정말로 탈퇴하시겠습니까?"}
                    </Text>
                    {confirmation === "withdraw" && (
                      <Text style={menuStyles.dialogNotice}>
                        화면 시연용으로 실제 계정은 삭제되지 않습니다.
                      </Text>
                    )}
                    <View style={menuStyles.dialogButtons}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setConfirmation(null)}
                        style={[
                          menuStyles.dialogButton,
                          menuStyles.cancelButton,
                        ]}
                      >
                        <Text style={menuStyles.dialogButtonText}>아니요</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={confirm}
                        style={[
                          menuStyles.dialogButton,
                          menuStyles.confirmButton,
                        ]}
                      >
                        <Text style={menuStyles.dialogButtonText}>예</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const menuStyles = StyleSheet.create({
  modalRoot: { flex: 1, overflow: "hidden" },
  slidePanel: { flex: 1, width: "100%", backgroundColor: C.soft },
  safeArea: { flex: 1, backgroundColor: C.soft },
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: C.background,
    borderRadius: 28,
    overflow: "hidden",
  },
  fill: { flex: 1, backgroundColor: C.background },
  closeButton: {
    marginTop: 32,
    marginLeft: 31,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 27, color: C.primary, fontWeight: "500" },
  menuContents: { marginTop: 72, marginLeft: 74, marginRight: 24, gap: 76 },
  menuGroup: { gap: 2 },
  menuGroupTitle: { color: C.secondary, fontSize: 12, marginBottom: 8 },
  menuEntry: {
    minHeight: 27,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingRight: 12,
  },
  menuEntryText: { color: C.primary, fontSize: 14, fontWeight: "400" },
  menuFooter: { marginLeft: 74, marginTop: "auto", marginBottom: 140 },
  placeholder: {
    color: C.secondary,
    fontSize: 13,
    lineHeight: 22,
    paddingHorizontal: 22,
    paddingTop: 32,
  },
  subscriptionContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 16,
  },
  subscriptionStatus: {
    width: "100%",
    paddingVertical: 12,
    gap: 8,
  },
  subscriptionBrand: { color: "#A13B32", fontSize: 11, lineHeight: 16 },
  subscriptionTitle: {
    color: C.primary,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: "500",
  },
  subscriptionNextDate: { color: "#A13B32", fontSize: 11, lineHeight: 16 },
  subscriptionManage: { alignSelf: "flex-start", paddingVertical: 1 },
  subscriptionManageText: { color: C.primary, fontSize: 14, lineHeight: 20 },
  subscriptionRow: {
    height: 64,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subscriptionRowText: { gap: 4 },
  refundButton: {
    height: 44,
    width: 150,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#C6D6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  refundButtonText: { color: C.accent, fontSize: 14, lineHeight: 20 },
  historyContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 32,
  },
  filterTabs: {
    height: 36,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  filterTab: {
    position: "relative",
    width: 56,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabText: { color: C.secondary, fontSize: 11, lineHeight: 16 },
  filterTabTextSelected: { color: C.primary },
  filterIndicator: {
    position: "absolute",
    bottom: 0,
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#FF7868",
  },
  historyRows: { gap: 16 },
  historyRow: {
    width: "100%",
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 32,
  },
  faqRows: { gap: 16 },
  faqRow: {
    width: "100%",
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: {
    flex: 1,
    marginRight: 12,
    color: C.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  settingsList: { paddingHorizontal: 24, paddingTop: 14 },
  settingsSectionTitle: {
    color: C.primary,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500",
    marginBottom: 16,
  },
  settingsRow: {
    height: 66,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsLabel: {
    color: C.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  settingsToggle: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent,
    justifyContent: "center",
  },
  settingsToggleOff: { backgroundColor: C.line },
  settingsToggleKnob: {
    position: "absolute",
    left: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.white,
  },
  settingsToggleKnobOn: { left: 21 },
  settingsVersionRow: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsVersionText: { gap: 4 },
  settingsVersionValue: { color: C.secondary, fontSize: 11, lineHeight: 16 },
  settingsChevron: { width: 18, height: 18 },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: C.soft,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  infoDialog: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    padding: 22,
    backgroundColor: C.white,
    gap: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  infoDialogTitle: {
    color: C.primary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  infoDialogMessage: {
    color: C.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  infoDialogPrimary: {
    width: 118,
    height: 44,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: C.accent,
    marginTop: 2,
  },
  infoDialogPrimaryText: { color: C.white, fontSize: 13, lineHeight: 19 },
  infoDialogSecondary: {
    width: 118,
    height: 44,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
  },
  infoDialogSecondaryText: { color: C.accent, fontSize: 13, lineHeight: 19 },
  dialog: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingTop: 23,
    paddingBottom: 18,
    backgroundColor: C.white,
    alignItems: "center",
  },
  dialogText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
  dialogNotice: {
    color: C.secondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 16,
  },
  dialogButtons: {
    flexDirection: "row",
    gap: 14,
    marginTop: 22,
    width: "100%",
  },
  dialogButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: { backgroundColor: C.line },
  confirmButton: { backgroundColor: C.accent },
  dialogButtonText: { color: C.primary, fontSize: 12, fontWeight: "600" },
});
