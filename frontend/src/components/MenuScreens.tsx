import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
  background: "#FFF8EF",
  surface: "#FFFDF8",
  primary: "#654C40",
  secondary: "#987966",
  accent: "#CF897C",
  soft: "#F0C8BE",
  line: "#E8D8CA",
  white: "#FFFFFF",
};

function MenuHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={uiStyles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="이전 화면"
        onPress={onBack}
        style={uiStyles.backButton}
      >
        <Text style={uiStyles.backArrow}>‹</Text>
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
    height: 74,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  backArrow: { fontSize: 26, color: C.secondary, marginTop: -3 },
  title: { fontSize: 16, color: C.primary, fontWeight: "600" },
  actionButton: {
    minHeight: 48,
    backgroundColor: C.primary,
    borderRadius: 7,
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
    backgroundColor: "#F1E4D7",
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
    <KeyboardAvoidingView style={supportStyles.fill} behavior="padding">
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
              placeholderTextColor="#B59A89"
              value={title}
              onChangeText={setTitle}
              autoCorrect={false}
            />
            <FieldTitle>문의 내용</FieldTitle>
            <TextInput
              accessibilityLabel="문의 내용 입력"
              style={supportStyles.contentInput}
              placeholder="내용을 입력해주세요."
              placeholderTextColor="#B59A89"
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
  tabText: { fontSize: 13, color: "#D7BFB2" },
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

type MenuPage =
  | "menu"
  | "settings"
  | "imageSettings"
  | "faq"
  | "inquiry"
  | "notice"
  | "withdraw"
  | "withdrawComplete";

type Confirmation = "logout" | "withdraw" | null;

type MenuExperienceProps = {
  visible: boolean;
  onClose: () => void;
  onLogout?: () => void;
};

// 기존 HomeScreen에서 쓸 수 있는 메뉴 화면입니다. 서버 API를 임의로 만들지 않습니다.
export default function MenuExperience({
  visible,
  onClose,
  onLogout,
}: MenuExperienceProps) {
  const [page, setPage] = useState<MenuPage>("menu");
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [inquiries, setInquiries] =
    useState<PreviewInquiry[]>(exampleInquiries);
  const { width: screenWidth } = useWindowDimensions();
  const [rendered, setRendered] = useState(false);
  const slideX = useRef(new Animated.Value(-screenWidth)).current;

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
    setPage("menu");
    onClose();
  }

  function back() {
    if (confirmation) {
      setConfirmation(null);
    } else if (page === "withdrawComplete") {
      setPage("menu");
    } else if (page === "menu") {
      closeMenu();
    } else {
      setPage("menu");
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

  function currentPage() {
    switch (page) {
      case "menu":
        return menuRoot();
      case "settings":
        return simplePage("환경 설정");
      case "imageSettings":
        return simplePage(
          "이미지 저장 설정",
          "이미지 저장 설정 화면은 상세 기획 확정 후 연결할 예정이에요.",
        );
      case "faq":
        return simplePage("자주 묻는 질문", "아직 등록된 질문이 없습니다.");
      case "notice":
        return simplePage("공지사항", "아직 등록된 공지사항이 없습니다.");
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
            {confirmation !== null && (
              <View style={menuStyles.overlay}>
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
                      style={[menuStyles.dialogButton, menuStyles.cancelButton]}
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
  slidePanel: { flex: 1, width: "100%", backgroundColor: C.background },
  safeArea: { flex: 1, backgroundColor: C.background },
  page: { flex: 1, width: "100%", maxWidth: 420, alignSelf: "center" },
  fill: { flex: 1, backgroundColor: C.background },
  closeButton: {
    marginTop: 32,
    marginLeft: 31,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 27, color: C.secondary, fontWeight: "500" },
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
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
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
  cancelButton: { backgroundColor: "#E6E4E3" },
  confirmButton: { backgroundColor: "#E8C9C0" },
  dialogButtonText: { color: C.primary, fontSize: 12, fontWeight: "600" },
});
