import {
  GROUP_NAME_MAX,
  GROUP_MAX_MEMBERS,
  USER_GROUP_MAX,
  JOINT_TITLE_MAX,
  groupNameSchema,
  jointTitleSchema,
} from "@mind-do/shared";
import logo from "../../assets/images/memore/logo.png";
import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/**
 * MEMO:RE 피그마 05. GROUP 화면.
 * 기존 App.tsx의 props / DemoGroup / initialGroups 인터페이스 유지.
 * 그룹·티켓 추가와 초대 확인은 앱 안에서만 바뀌는 시연 데이터이며 서버에 저장되지 않음.
 */
export type JointTicket = {
  date: string;
  title: string;
  completed: number;
  invitees: number;
};

export type DemoGroup = {
  id: string;
  name: string;
  members: number;
  tickets: JointTicket[];
  createdAt?: string;
};

type GroupScreenProps = {
  onOpenHome: () => void;
  onOpenTickets: () => void;
  onOpenMy: () => void;
  groups: DemoGroup[];
  onGroupsChange: Dispatch<SetStateAction<DemoGroup[]>>;
};

type Page =
  | "groups"
  | "group"
  | "join"
  | "newGroup"
  | "newJoint"
  | "jointDone"
  | "duplicate"
  | "firstTicket"
  | "groupCreated"
  | "groupFail"
  | "handoffSelect"
  | "leaveOptions"
  | "leaveDone"
  | "kickSelect"
  | "kickOptions"
  | "kickDone";
type Popup =
  | "none"
  | "more"
  | "invite"
  | "leaveConfirm"
  | "handoffConfirm"
  | "participants"
  | "memberAction"
  | "kickConfirm"
  | "kickSuccess";
type RecordChoice = "keep" | "remove";
const recordChoices: RecordChoice[] = ["keep", "remove"];

const C = {
  canvas: "#FFF8EF",
  surface: "#FFFDF8",
  primary: "#352722",
  text: "#654C40",
  muted: "#987966",
  detailMuted: "#76635B",
  border: "#E8DFD6",
  pink: "#F4D9D0",
  nav: "#F0C8BE",
  button: "#60493E",
  accent: "#A25C51",
  input: "#F9F0EB",
};

// 피그마 05-1 / 05-2에 보이는 시연용 데이터. 서버 API나 실제 유저 기록이 아님.
export const initialGroups: DemoGroup[] = [
  {
    id: "figma-minddo",
    name: "마인두!",
    members: 5,
    createdAt: "2026-09-12",
    tickets: [
      { date: "2026-10-30", title: "가을 산책", completed: 5, invitees: 5 },
      { date: "2026-10-24", title: "우리의 주말", completed: 5, invitees: 5 },
    ],
  },
  {
    id: "figma-cute",
    name: "귀여운 녀석들",
    members: 3,
    createdAt: "2026-10-14",
    tickets: [],
  },
  {
    id: "figma-baseball",
    name: "야구부",
    members: 4,
    createdAt: "2025-03-27",
    tickets: [],
  },
];

const avatarColors = [
  "#F1DFD8",
  "#EADCD4",
  "#E9E2D6",
  "#E9DFE8",
  "#DEE7DA",
  "#DADDE7",
];
const avatarTextColors = [
  "#936458",
  "#946A5C",
  "#746856",
  "#806579",
  "#617354",
  "#555473",
];
const avatarLetters = ["나", "A", "B", "C", "D", "E"];
const GROUP_CAPACITY = GROUP_MAX_MEMBERS;

const DEMO_INVITE_URL = "memo.re/invite/weekend";

function dateToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function fmtDate(date: string) {
  return date.replace(/-/g, ".");
}
function validDate(text: string): string | null {
  const match = /^(\d{4})[.-](\d{2})[.-](\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function TextButton({
  text,
  onPress,
  disabled = false,
  outlined = false,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  outlined?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        outlined && styles.outlinedButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.primaryLabel, outlined && styles.outlinedLabel]}>
        {text}
      </Text>
    </Pressable>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        style={styles.formInput}
      />
    </View>
  );
}

function TicketStub({
  ticket,
  groupName,
  onPress,
}: {
  ticket: JointTicket;
  groupName: string;
  onPress: () => void;
}) {
  const mmdd = fmtDate(ticket.date).slice(5);
  const day = mmdd;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ticket.title || "제목 없음"} 공동 티켓 전체 보기`}
      onPress={onPress}
      style={({ pressed }) => [styles.ticketRow, pressed && styles.pressed]}
    >
      <View style={styles.ticketStub}>
        <Text style={styles.ticketBrand}>MEMO:RE</Text>
        <Text style={styles.ticketDay}>{day}</Text>
        <Text numberOfLines={1} style={styles.ticketGroupName}>
          {groupName}
        </Text>
        <View style={styles.ticketCutLine} />
      </View>
      <View style={styles.ticketInfo}>
        <Text style={styles.ticketDate}>{fmtDate(ticket.date)}</Text>
        <Text numberOfLines={1} style={styles.ticketDateGroup}>
          {groupName}
        </Text>
        <Text numberOfLines={2} style={styles.ticketTitle}>
          {ticket.title || "제목 없음"}
        </Text>
        <Text style={styles.ticketMore}>전체 보기 ›</Text>
      </View>
    </Pressable>
  );
}

function MemberProfiles({
  members,
  onInvite,
  letters,
}: {
  members: number;
  onInvite: () => void;
  letters?: string[];
}) {
  const currentLetters =
    letters ?? avatarLetters.slice(1, Math.min(members, GROUP_CAPACITY));
  const visibleLetters = ["나", ...currentLetters].slice(0, GROUP_CAPACITY);
  const count = visibleLetters.length;
  return (
    <View style={styles.membersWrap}>
      {visibleLetters.map((letter, i) => {
        const colorIndex = Math.max(0, avatarLetters.indexOf(letter));
        return (
          <View key={`member-${letter}`} style={styles.memberCell}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: avatarColors[colorIndex] },
                i === 0 && count < GROUP_CAPACITY && styles.myAvatar,
              ]}
            >
              <Text
                style={[
                  styles.avatarLetter,
                  { color: avatarTextColors[colorIndex] },
                ]}
              >
                {letter}
              </Text>
            </View>
            <Text style={styles.avatarCaption}>
              {i === 0 ? "나" : `멤버 ${letter}`}
            </Text>
          </View>
        );
      })}
      {count < GROUP_CAPACITY && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="초대 링크 생성"
          onPress={onInvite}
          style={({ pressed }) => [
            styles.memberCell,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.emptyAvatar}>
            <Text style={styles.plusText}>＋</Text>
          </View>
          <Text style={styles.avatarCaption}> </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function GroupScreen({
  onOpenHome,
  onOpenMy,
  groups,
  onGroupsChange: setGroups,
}: GroupScreenProps) {
  const [page, setPage] = useState<Page>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("figma-minddo");
  const [popup, setPopup] = useState<Popup>("none");
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [firstDate, setFirstDate] = useState(fmtDate(dateToday()));
  const [firstTitle, setFirstTitle] = useState("");
  const [createdGroup, setCreatedGroup] = useState<DemoGroup | null>(null);
  const [jointDate, setJointDate] = useState(fmtDate(dateToday()));
  const [jointTitle, setJointTitle] = useState("");
  const [selectedJointMembers, setSelectedJointMembers] = useState<string[]>(
    [],
  );
  const [pendingJointMembers, setPendingJointMembers] = useState<string[]>([]);
  const [duplicateDate, setDuplicateDate] = useState("");
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [leaveRecordChoice, setLeaveRecordChoice] =
    useState<RecordChoice>("keep");
  const [kickRecordChoice, setKickRecordChoice] =
    useState<RecordChoice>("keep");
  const [selectedKickMember, setSelectedKickMember] = useState<string | null>(
    null,
  );
  const [memberTab, setMemberTab] = useState<"active" | "removed">("active");
  const [groupLeaders, setGroupLeaders] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((group) => [group.id, "나"])),
  );
  const [selectedSuccessor, setSelectedSuccessor] = useState<string | null>(
    null,
  );
  const [newLeaderName, setNewLeaderName] = useState<string | null>(null);
  const memberMenuAnchors = useRef<Record<string, View | null>>({});
  const [memberMenuPosition, setMemberMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const { width: windowWidth } = useWindowDimensions();
  const safeInsets = useSafeAreaInsets();
  // 내보낸 멤버 표시는 그룹별로 기억하여 이후 상세 화면에서 같은 멤버를 다시 노출하지 않음.
  // 실제 계정·초대 정보가 아닌 현재 실행 중인 시연 전용 상태.
  const [removedMembersByGroup, setRemovedMembersByGroup] = useState<
    Record<string, string[]>
  >({});

  const selectedGroup =
    groups.find((g) => g.id === selectedGroupId) ?? groups[0];
  const currentMemberLetters = useMemo(() => {
    if (!selectedGroup) return [];
    const removed = removedMembersByGroup[selectedGroup.id] ?? [];
    const availableBeforeRemoval = Math.min(
      GROUP_CAPACITY - 1,
      Math.max(0, selectedGroup.members - 1 + removed.length),
    );
    return avatarLetters
      .slice(1, availableBeforeRemoval + 1)
      .filter((letter) => !removed.includes(letter));
  }, [selectedGroup, removedMembersByGroup]);
  const sortedTickets = useMemo(() => {
    const tickets = selectedGroup?.tickets || [];
    return [...tickets]
      .filter((t) => !monthFilter || t.date.startsWith(monthFilter))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedGroup, monthFilter]);
  const availableMonths = useMemo(
    () =>
      Array.from(
        new Set((selectedGroup?.tickets || []).map((t) => t.date.slice(0, 7))),
      ).sort((a, b) => b.localeCompare(a)),
    [selectedGroup],
  );

  function openGroup(id: string) {
    setSelectedGroupId(id);
    setMonthFilter(null);
    setPopup("none");
    setPage("group");
  }
  function back() {
    if (popup !== "none") {
      setPopup("none");
      return;
    }
    if (page === "groups") {
      onOpenHome();
      return;
    }
    if (page === "newGroup" || page === "group") {
      setPage("groups");
      return;
    }
    if (page === "firstTicket") {
      setPage("newGroup");
      return;
    }
    if (page === "groupCreated" || page === "groupFail") {
      setPage("groups");
      return;
    }
    if (page === "jointDone") {
      setPage("group");
      return;
    }
    if (page === "handoffSelect") {
      setPage("group");
      return;
    }
    if (page === "duplicate") {
      setPage("newJoint");
      return;
    }
    if (page === "kickOptions") {
      setPage("kickSelect");
      return;
    }
    if (page === "kickSelect" || page === "leaveOptions") {
      setPage("group");
      return;
    }
    if (page === "leaveDone" || page === "kickDone") {
      setPage("groups");
      return;
    }
    setPage("group");
  }
  function getDate(raw: string): string | null {
    const date = validDate(raw);
    if (!date) {
      Alert.alert("날짜 확인", "날짜를 YYYY.MM.DD 형식으로 입력해 주세요.");
      return null;
    }
    if (date > dateToday()) {
      Alert.alert("미래 날짜는 선택할 수 없어요");
      return null;
    }
    return date;
  }
  function newGroup() {
    if (groups.length >= USER_GROUP_MAX) {
      Alert.alert(
        "그룹 수 제한",
        `기본 그룹을 제외하고 최대 ${USER_GROUP_MAX}개까지 참여할 수 있어요.`,
      );
      return;
    }
    setGroupName("");
    setFirstDate(fmtDate(dateToday()));
    setFirstTitle("");
    setCreatedGroup(null);
    setPage("newGroup");
  }
  function startFirstTicket() {
    const name = groupName.trim();
    if (!groupNameSchema.safeParse(name).success) {
      Alert.alert(
        "그룹 이름을 확인해 주세요",
        `그룹 이름은 1~${GROUP_NAME_MAX}자까지 입력할 수 있어요.`,
      );
      return;
    }
    setPage("firstTicket");
  }
  function createGroup() {
    const date = getDate(firstDate);
    if (!date || createdGroup) return;
    const name = groupNameSchema.safeParse(groupName);
    const title = jointTitleSchema.safeParse(firstTitle);
    if (!name.success || !title.success) {
      Alert.alert("입력 확인", "그룹 이름과 제목을 확인해 주세요.");
      return;
    }
    if (groups.length >= USER_GROUP_MAX) {
      setPage("groupFail");
      return;
    }
    const item: DemoGroup = {
      id: `local-${Date.now()}`,
      name: name.data,
      createdAt: dateToday(),
      members: 1,
      tickets: [{ date, title: title.data, completed: 0, invitees: 1 }],
    };
    setGroups((old) => [...old, item]);
    setCreatedGroup(item);
    setPage("groupCreated");
  }
  function createJoint() {
    if (!selectedGroup) return;
    const date = getDate(jointDate);
    if (!date) return;
    const title = jointTitleSchema.safeParse(jointTitle);
    if (!title.success) {
      Alert.alert(
        "제목 확인",
        `제목은 최대 ${JOINT_TITLE_MAX}자까지 입력할 수 있어요.`,
      );
      return;
    }
    if (selectedGroup.tickets.some((t) => t.date === date)) {
      setDuplicateDate(date);
      setPage("duplicate");
      return;
    }
    const item: JointTicket = {
      date,
      title: title.data,
      completed: 0,
      invitees: selectedJointMembers.length + 1,
    };
    setGroups((old) =>
      old.map((g) =>
        g.id === selectedGroup.id ? { ...g, tickets: [item, ...g.tickets] } : g,
      ),
    );
    setMonthFilter(null);
    setPage("jointDone");
  }
  function startNewJoint() {
    setJointDate(fmtDate(dateToday()));
    setJointTitle("");
    setSelectedJointMembers([]);
    setPage("newJoint");
  }
  function openParticipants() {
    setPendingJointMembers(selectedJointMembers);
    setPopup("participants");
  }
  function toggleJointMember(letter: string) {
    setPendingJointMembers((old) =>
      old.includes(letter)
        ? old.filter((item) => item !== letter)
        : [...old, letter],
    );
  }
  function pickMonth() {
    Alert.alert("월별 보기", "표시할 월을 선택해 주세요.", [
      { text: "전체", onPress: () => setMonthFilter(null) },
      ...availableMonths.slice(0, 5).map((month) => ({
        text: fmtDate(month),
        onPress: () => setMonthFilter(month),
      })),
      { text: "취소", style: "cancel" as const },
    ]);
  }
  function joinDemo() {
    if (!selectedGroup) return;
    if (selectedGroup.members >= GROUP_CAPACITY) {
      Alert.alert(
        "참여할 수 없어요",
        `그룹 정원은 최대 ${GROUP_CAPACITY}명이에요.`,
      );
      return;
    }
    if (joinedIds.includes(selectedGroup.id)) {
      Alert.alert("이미 참여한 그룹이에요");
      setPage("group");
      return;
    }
    setGroups((old) =>
      old.map((g) =>
        g.id === selectedGroup.id
          ? { ...g, members: Math.min(GROUP_CAPACITY, g.members + 1) }
          : g,
      ),
    );
    setJoinedIds((old) => [...old, selectedGroup.id]);
    setPopup("none");
    setPage("group");
    Alert.alert(
      "참여 시연 완료",
      "그룹 인원이 화면에서만 1명 늘어났어요. 실제 계정 초대는 진행되지 않았습니다.",
    );
  }
  async function shareInvite() {
    // Figma의 memo.re/invite/weekend는 예시 주소. 실제 초대 URL로 오인하지 않도록 명시.
    try {
      await Share.share({
        message: `[MEMO:RE 화면 시연] ${selectedGroup?.name || "그룹"} 초대 화면입니다.\n예시 주소: ${DEMO_INVITE_URL}\n※ 서버에서 실제 발급된 링크가 아닙니다.`,
      });
    } catch {
      Alert.alert("공유하기 오류", "기기의 공유 기능을 실행하지 못했어요.");
    }
  }
  function handleTicketPress() {
    Alert.alert(
      "공동 티켓",
      "이번 05 화면에서는 티켓 목록까지만 구현했어요. 공동 티켓 상세 화면은 06 디자인이 완성되면 연결합니다.",
    );
  }
  function startLeave() {
    setPopup("none");
    setLeaveRecordChoice("keep");
    setNewLeaderName(null);
    if (!selectedGroup || (groupLeaders[selectedGroup.id] ?? "나") !== "나") {
      setPage("leaveOptions");
      return;
    }
    if (currentMemberLetters.length === 0) {
      Alert.alert(
        "그룹장을 위임할 수 없어요",
        "그룹을 나가기 전에 위임할 다른 멤버가 필요해요.",
      );
      return;
    }
    setSelectedSuccessor(null);
    setPage("handoffSelect");
  }
  function confirmHandoff() {
    if (
      !selectedGroup ||
      !selectedSuccessor ||
      !currentMemberLetters.includes(selectedSuccessor)
    )
      return;
    setGroupLeaders((old) => ({
      ...old,
      [selectedGroup.id]: selectedSuccessor,
    }));
    setNewLeaderName(`멤버 ${selectedSuccessor}`);
    setPopup("none");
    finishLeave();
  }
  function finishLeave() {
    if (!selectedGroup) return;
    // 기록 유지/제거 선택은 UI 시연용이며 개인 티켓 원본은 수정하지 않음.
    // 서버 API 연결 전이므로 현재 앱 화면의 그룹 목록만 변경.
    setGroups((old) => old.filter((group) => group.id !== selectedGroup.id));
    setPopup("none");
    setPage("leaveDone");
  }
  function startKick() {
    setPopup("none");
    if (currentMemberLetters.length === 0) {
      Alert.alert("내보낼 멤버가 없어요", "현재 그룹에는 다른 멤버가 없어요.");
      return;
    }
    setSelectedKickMember(null);
    setKickRecordChoice("keep");
    setMemberTab("active");
    setPage("kickSelect");
  }
  function finishKick() {
    if (
      !selectedGroup ||
      !selectedKickMember ||
      !currentMemberLetters.includes(selectedKickMember)
    )
      return;
    const id = selectedGroup.id;
    const letter = selectedKickMember;
    // 피그마 05 화면 시연: 인원/프로필만 로컬에서 갱신하며 실제 내보내기 API는 호출하지 않음.
    setGroups((old) =>
      old.map((group) =>
        group.id === id
          ? { ...group, members: Math.max(1, group.members - 1) }
          : group,
      ),
    );
    setRemovedMembersByGroup((old) => ({
      ...old,
      [id]: [...(old[id] ?? []), letter],
    }));
    setPopup("kickSuccess");
  }

  const countText = `(${groups.length}/${USER_GROUP_MAX})`;
  const isDetail = page === "group";
  const isForm =
    page === "newGroup" ||
    page === "firstTicket" ||
    page === "newJoint" ||
    page === "duplicate";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {page === "groups" ? (
          <>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.homeContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.homeTop}>
                <Image
                  source={logo}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="MEMO:RE 로고"
                />
              </View>
              <View style={styles.personalCard}>
                <Text style={styles.personalTitle}>다인의 기록</Text>
                <Text style={styles.personalSub}>멤버 1명</Text>
              </View>
              <View style={styles.groupSectionHeader}>
                <Text style={styles.sectionHeading}>나의 그룹</Text>
                <Text style={styles.sectionHeading}>{countText}</Text>
              </View>
              <View style={styles.groupCards}>
                {groups.map((group) => (
                  <Pressable
                    key={group.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${group.name} 그룹 상세`}
                    onPress={() => openGroup(group.id)}
                    style={({ pressed }) => [
                      styles.groupCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text numberOfLines={1} style={styles.groupCardTitle}>
                      {group.name}
                    </Text>
                    <View style={styles.groupCardMeta}>
                      <Text style={styles.groupCardDate}>
                        {fmtDate(
                          group.createdAt ||
                            group.tickets[0]?.date ||
                            dateToday(),
                        )}
                      </Text>
                      <Text style={styles.groupCardDate}>
                        ({Math.min(group.members, GROUP_CAPACITY)}/
                        {GROUP_CAPACITY})
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {groups.length === 0 && (
                  <Text style={styles.hintText}>
                    아직 그룹이 없어요. 새 그룹을 만들어 보세요.
                  </Text>
                )}
              </View>
            </ScrollView>
            <View style={styles.homeAction}>
              <TextButton
                text="새 그룹 만들기"
                onPress={newGroup}
                disabled={groups.length >= USER_GROUP_MAX}
              />
            </View>
            <View style={styles.bottomNav}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="홈"
                onPress={onOpenHome}
                style={styles.tab}
              >
                <Text style={styles.tabText}>Home</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹"
                accessibilityState={{ selected: true }}
                style={styles.tab}
              >
                <Text style={styles.tabActive}>Group</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="스토어"
                onPress={() =>
                  Alert.alert(
                    "스토어",
                    "스토어 화면은 이번 05 구현 범위에 포함되지 않았어요.",
                  )
                }
                style={styles.tab}
              >
                <Text style={styles.tabText}>Store</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="마이"
                onPress={onOpenMy}
                style={styles.tab}
              >
                <Text style={styles.tabText}>My</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.detailHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="뒤로가기"
                onPress={back}
                style={styles.backBox}
              >
                <Text style={styles.backLabel}>‹</Text>
              </Pressable>
              <Text numberOfLines={1} style={styles.detailHeaderTitle}>
                {isDetail || page === "newJoint" || page === "jointDone"
                  ? selectedGroup?.name || "그룹"
                  : page === "kickSelect"
                    ? "멤버 관리"
                    : page === "handoffSelect"
                      ? "그룹장 권한 넘기기"
                      : ""}
              </Text>
              {isDetail ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="그룹 더보기"
                  onPress={() => setPopup(popup === "more" ? "none" : "more")}
                  style={styles.ellipsisBox}
                >
                  <Text style={styles.ellipsis}>•••</Text>
                </Pressable>
              ) : (
                <View style={styles.ellipsisBox} />
              )}
            </View>

            {isDetail && selectedGroup ? (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.memberSection}>
                  <View style={styles.inlineTitle}>
                    <Text style={styles.detailSectionTitle}>그룹 참여자</Text>
                    <Text style={styles.sectionCount}>
                      {Math.min(selectedGroup.members, GROUP_CAPACITY)}/
                      {GROUP_CAPACITY}
                    </Text>
                  </View>
                  <MemberProfiles
                    members={selectedGroup.members}
                    letters={currentMemberLetters}
                    onInvite={() => setPopup("invite")}
                  />
                </View>
                <View style={styles.ticketSection}>
                  <Text style={styles.detailSectionTitle}>공동 티켓</Text>
                  <View style={styles.filterRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="전체"
                      onPress={() => setMonthFilter(null)}
                      style={[
                        styles.filterButton,
                        !monthFilter && styles.filterActive,
                      ]}
                    >
                      <Text style={styles.filterText}>전체</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="월별 보기"
                      onPress={pickMonth}
                      style={[
                        styles.filterButton,
                        styles.monthButton,
                        monthFilter !== null && styles.filterActive,
                      ]}
                    >
                      <Text style={styles.filterText}>
                        {monthFilter ? fmtDate(monthFilter) : "월별 보기"} ▾
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.ticketList}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="새 공동 티켓 만들기"
                    onPress={startNewJoint}
                    style={({ pressed }) => [
                      styles.createTicketRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.ticketPlus}>＋</Text>
                    <Text style={styles.createTicketLabel}>
                      새 공동 티켓 만들기
                    </Text>
                  </Pressable>
                  {sortedTickets.map((ticket) => (
                    <TicketStub
                      key={`${ticket.date}-${ticket.title}`}
                      ticket={ticket}
                      groupName={selectedGroup.name}
                      onPress={handleTicketPress}
                    />
                  ))}
                  {sortedTickets.length === 0 && (
                    <Text style={styles.noTicketText}>
                      표시할 공동 티켓이 없어요.
                    </Text>
                  )}
                </View>
              </ScrollView>
            ) : page === "join" ? (
              <>
                <View style={styles.joinBody}>
                  <Text style={styles.joinHeading}>
                    {selectedGroup?.name || "마인두!"}에 초대받았어요
                  </Text>
                  <Text style={styles.joinSubtitle}>
                    비공개 그룹 · 멤버 {selectedGroup?.members || 3}명
                  </Text>
                </View>
                <View style={styles.formBottom}>
                  <TextButton text="그룹 참여하기" onPress={joinDemo} />
                </View>
              </>
            ) : page === "kickSelect" ? (
              <>
                <ScrollView
                  style={styles.flex}
                  contentContainerStyle={styles.memberManageContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.memberTabs}>
                    <Pressable
                      onPress={() => setMemberTab("active")}
                      style={[
                        styles.memberTab,
                        memberTab === "active" && styles.memberTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberTabText,
                          memberTab === "active" && styles.memberTabTextActive,
                        ]}
                      >
                        참여자 · {currentMemberLetters.length + 1}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setMemberTab("removed")}
                      style={[
                        styles.memberTab,
                        memberTab === "removed" && styles.memberTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberTabText,
                          memberTab === "removed" && styles.memberTabTextActive,
                        ]}
                      >
                        탈퇴 멤버 ·{" "}
                        {removedMembersByGroup[selectedGroup?.id ?? ""]
                          ?.length ?? 0}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.memberManageList}>
                    {memberTab === "active"
                      ? currentMemberLetters.map((letter) => (
                          <View
                            key={`member-${letter}`}
                            style={styles.managedMemberRow}
                          >
                            <View
                              style={[styles.jointAvatar, styles.managedAvatar]}
                            >
                              <Text style={styles.jointAvatarText}>
                                {letter}
                              </Text>
                            </View>
                            <View style={styles.managedMemberInfo}>
                              <Text style={styles.memberManageText}>
                                멤버 {letter}
                              </Text>
                              <Text style={styles.managedMemberDate}>
                                2026.11.09
                              </Text>
                            </View>
                            <Pressable
                              ref={(node) => {
                                memberMenuAnchors.current[letter] = node;
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`멤버 ${letter} 관리`}
                              onPress={() => {
                                setSelectedKickMember(letter);
                                memberMenuAnchors.current[
                                  letter
                                ]?.measureInWindow((x, y, width, height) => {
                                  const left = Math.max(
                                    8,
                                    Math.min(
                                      windowWidth - 188,
                                      x + width - 180,
                                    ),
                                  );
                                  setMemberMenuPosition({
                                    top: y + height - safeInsets.top + 4,
                                    left,
                                  });
                                  setPopup("memberAction");
                                });
                              }}
                              style={styles.managedMemberMenu}
                            >
                              <Text style={styles.memberManageDots}>⋮</Text>
                            </Pressable>
                          </View>
                        ))
                      : (
                          removedMembersByGroup[selectedGroup?.id ?? ""] ?? []
                        ).map((letter) => (
                          <View
                            key={`removed-${letter}`}
                            style={styles.managedMemberRow}
                          >
                            <View
                              style={[styles.jointAvatar, styles.managedAvatar]}
                            >
                              <Text style={styles.jointAvatarText}>
                                {letter}
                              </Text>
                            </View>
                            <View style={styles.managedMemberInfo}>
                              <Text style={styles.memberManageText}>
                                멤버 {letter}
                              </Text>
                              <Text style={styles.managedMemberDate}>
                                탈퇴한 멤버
                              </Text>
                            </View>
                          </View>
                        ))}
                  </View>
                </ScrollView>
              </>
            ) : page === "handoffSelect" ? (
              <>
                <ScrollView
                  style={styles.flex}
                  contentContainerStyle={styles.memberManageContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.handoffDescription}>
                    그룹장이 나가려면 다른 멤버에게 그룹장 권한을 넘겨야 해요.
                  </Text>
                  <View style={styles.memberManageList}>
                    {currentMemberLetters.map((letter) => {
                      const selected = selectedSuccessor === letter;
                      return (
                        <Pressable
                          key={`successor-${letter}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setSelectedSuccessor(letter)}
                          style={[
                            styles.managedMemberRow,
                            selected && styles.memberManageSelected,
                          ]}
                        >
                          <View
                            style={[styles.jointAvatar, styles.managedAvatar]}
                          >
                            <Text style={styles.jointAvatarText}>{letter}</Text>
                          </View>
                          <View style={styles.managedMemberInfo}>
                            <Text style={styles.memberManageText}>
                              멤버 {letter}
                            </Text>
                            <Text style={styles.managedMemberDate}>
                              2026.11.09
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
                <View style={styles.formBottom}>
                  <TextButton
                    text="선택 완료"
                    onPress={() => setPopup("handoffConfirm")}
                    disabled={!selectedSuccessor}
                  />
                </View>
              </>
            ) : page === "leaveOptions" || page === "kickOptions" ? (
              <>
                <ScrollView
                  style={styles.flex}
                  contentContainerStyle={styles.decisionContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.decisionHeading}>
                    {page === "leaveOptions"
                      ? "그룹에서 나갈까요?"
                      : `멤버 ${selectedKickMember || ""} 님을 내보낼까요?`}
                  </Text>
                  <View style={styles.decisionOptions}>
                    {recordChoices.map((choice) => {
                      const isLeave = page === "leaveOptions";
                      const selected =
                        (isLeave ? leaveRecordChoice : kickRecordChoice) ===
                        choice;
                      const title = isLeave
                        ? choice === "keep"
                          ? "그룹에 내 기록 남겨두기"
                          : "그룹에서 내 기록 제거"
                        : choice === "keep"
                          ? "그룹 기록에 남기기"
                          : "그룹 기록에서 제거";
                      const description =
                        choice === "keep"
                          ? "그룹에 개인 티켓 연결 유지"
                          : "그룹에서 멤버의 개인 티켓 제거";
                      return (
                        <Pressable
                          key={choice}
                          accessibilityRole="radio"
                          accessibilityLabel={`${title}, ${description}`}
                          accessibilityState={{ selected }}
                          onPress={() =>
                            isLeave
                              ? setLeaveRecordChoice(choice)
                              : setKickRecordChoice(choice)
                          }
                          style={({ pressed }) => [
                            styles.decisionOption,
                            selected && styles.decisionOptionSelected,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.decisionOptionTitle}>
                            {title}
                          </Text>
                          <Text style={styles.decisionOptionSubtitle}>
                            {description}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.decisionNote}>
                    그룹 기록에서 제거하더라도 멤버의 개인 티켓은 해당 멤버의
                    개인 티켓 보관함에 유지돼요.
                  </Text>
                </ScrollView>
                <View style={styles.decisionFooter}>
                  <Text style={styles.decisionWarning}>
                    ※ {page === "leaveOptions" ? "나가기" : "내보내기"} 이후에는
                    변경할 수 없어요
                  </Text>
                  <TextButton
                    text={page === "leaveOptions" ? "나가기" : "내보내기"}
                    onPress={page === "leaveOptions" ? finishLeave : finishKick}
                  />
                </View>
              </>
            ) : page === "leaveDone" || page === "kickDone" ? (
              <>
                <View style={styles.finishedContent}>
                  <Text style={styles.finishedHeading}>bye bye</Text>
                  {newLeaderName && page === "leaveDone" ? (
                    <View style={styles.newLeaderBlock}>
                      <Text style={styles.finishedDescription}>
                        새로운 그룹장
                      </Text>
                      <View style={styles.newLeaderAvatar}>
                        <Text style={styles.newLeaderInitial}>
                          {selectedSuccessor}
                        </Text>
                      </View>
                      <Text style={styles.newLeaderLabel}>{newLeaderName}</Text>
                    </View>
                  ) : (
                    <Text style={styles.finishedDescription}>
                      {page === "leaveDone"
                        ? "나가기가 완료되었어요."
                        : "내보내기가 완료되었어요."}
                    </Text>
                  )}
                </View>
                <View style={styles.formBottom}>
                  <TextButton
                    text="그룹 목록으로"
                    onPress={() => {
                      setNewLeaderName(null);
                      setPage("groups");
                    }}
                  />
                </View>
              </>
            ) : page === "jointDone" && selectedGroup ? (
              <>
                <View style={[styles.formContent, styles.createdContent]}>
                  <Text style={styles.formHeading}>{selectedGroup.name}</Text>
                  <View style={styles.createdCenter}>
                    <Text style={styles.jointDoneHeading}>
                      공동 티켓 발권 완료
                    </Text>
                    <View style={styles.createdPreview}>
                      <Text
                        style={[styles.ticketBrand, styles.createdTicketBrand]}
                      >
                        MEMO:RE
                      </Text>
                      <Text style={styles.createdTicketDate}>
                        {fmtDate(validDate(jointDate) || dateToday()).slice(5)}
                      </Text>
                      <Text numberOfLines={2} style={styles.createdTicketTitle}>
                        {jointTitle.trim()}
                      </Text>
                      <View style={styles.createdTicketPerforation} />
                    </View>
                    <Text style={styles.createdCaption}>
                      {selectedGroup.name}의 공동 티켓을 만들었어요!
                    </Text>
                  </View>
                </View>
                <View style={[styles.formBottom, styles.createdActions]}>
                  <TextButton
                    text="나의 티켓 만들기"
                    onPress={() => setPage("group")}
                  />
                  <TextButton
                    text="나가기"
                    outlined
                    onPress={() => setPage("group")}
                  />
                </View>
              </>
            ) : page === "groupCreated" && createdGroup ? (
              <>
                <View style={[styles.formContent, styles.createdContent]}>
                  <Text style={styles.formHeading}>첫 공동 티켓 만들기</Text>
                  <View style={styles.createdCenter}>
                    <View style={styles.createdPreview}>
                      <Text
                        style={[styles.ticketBrand, styles.createdTicketBrand]}
                      >
                        MEMO:RE
                      </Text>
                      <Text style={styles.createdTicketDate}>
                        {fmtDate(createdGroup.tickets[0].date).slice(5)}
                      </Text>
                      <Text numberOfLines={2} style={styles.createdTicketTitle}>
                        {createdGroup.tickets[0].title}
                      </Text>
                      <View style={styles.createdTicketPerforation} />
                    </View>
                    <Text style={styles.createdCaption}>
                      그룹의 첫 공동 티켓을 만들었어요!
                    </Text>
                  </View>
                </View>
                <View style={[styles.formBottom, styles.createdActions]}>
                  <TextButton
                    text="나의 그룹 살펴보기"
                    onPress={() => openGroup(createdGroup.id)}
                  />
                  <TextButton
                    text="나가기"
                    outlined
                    onPress={() => setPage("groups")}
                  />
                </View>
              </>
            ) : page === "groupFail" ? (
              <>
                <View style={styles.finishedContent}>
                  <Text style={styles.finishedHeading}>
                    그룹을 만들지 못했어요
                  </Text>
                  <Text
                    style={styles.finishedDescription}
                  >{`기본 그룹을 제외하고 최대 ${USER_GROUP_MAX}개까지 참여할 수 있어요.`}</Text>
                </View>
                <View style={styles.formBottom}>
                  <TextButton
                    text="그룹 목록으로"
                    onPress={() => setPage("groups")}
                  />
                </View>
              </>
            ) : isForm ? (
              <>
                <ScrollView
                  style={styles.flex}
                  contentContainerStyle={styles.formContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {page !== "newJoint" && (
                    <Text style={styles.formHeading}>
                      {page === "newGroup"
                        ? "새 그룹 만들기"
                        : page === "firstTicket"
                          ? "첫 공동 티켓 만들기"
                          : "이미 기록이 있는 날짜예요"}
                    </Text>
                  )}
                  {page === "newGroup" && (
                    <View style={styles.formStack}>
                      <FormInput
                        label={`그룹 이름 · 최대 ${GROUP_NAME_MAX}자`}
                        value={groupName}
                        onChangeText={setGroupName}
                        placeholder="그룹 이름"
                        maxLength={GROUP_NAME_MAX}
                      />
                    </View>
                  )}
                  {page === "firstTicket" && (
                    <View style={styles.formStack}>
                      <FormInput
                        label="날짜"
                        value={firstDate}
                        onChangeText={setFirstDate}
                        placeholder="YYYY.MM.DD"
                      />
                      <FormInput
                        label={`제목 · 선택 · 최대 ${JOINT_TITLE_MAX}자`}
                        value={firstTitle}
                        onChangeText={setFirstTitle}
                        placeholder="제목"
                        maxLength={JOINT_TITLE_MAX}
                      />
                    </View>
                  )}
                  {page === "newJoint" && (
                    <View style={styles.formStack}>
                      <FormInput
                        label="날짜"
                        value={jointDate}
                        onChangeText={setJointDate}
                        placeholder="YYYY.MM.DD"
                      />
                      <FormInput
                        label={`제목 · 선택 · 최대 ${JOINT_TITLE_MAX}자`}
                        value={jointTitle}
                        onChangeText={setJointTitle}
                        placeholder="제목"
                        maxLength={JOINT_TITLE_MAX}
                      />
                      <Text style={styles.formLabel}>참여 멤버</Text>
                      <View style={styles.jointMemberSummary}>
                        <View style={styles.jointAvatar}>
                          <Text style={styles.jointAvatarText}>나</Text>
                        </View>
                        {selectedJointMembers.map((letter) => (
                          <View key={letter} style={styles.jointAvatar}>
                            <Text style={styles.jointAvatarText}>{letter}</Text>
                          </View>
                        ))}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="티켓 참여 멤버 추가"
                          onPress={openParticipants}
                          style={styles.addJointMember}
                        >
                          <Text style={styles.addJointMemberText}>
                            ＋ 멤버 추가하기
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                  {page === "duplicate" && (
                    <Text style={styles.hintText}>
                      {fmtDate(duplicateDate)} 날짜에 공동 티켓이 이미 있어요.
                      같은 날짜에 중복 생성할 수 없어요.
                    </Text>
                  )}
                </ScrollView>
                <View style={styles.formBottom}>
                  {page === "newGroup" && (
                    <TextButton
                      text="다음"
                      onPress={startFirstTicket}
                      disabled={!groupName.trim()}
                    />
                  )}
                  {page === "firstTicket" && (
                    <TextButton text="공동 티켓 만들기" onPress={createGroup} />
                  )}
                  {page === "newJoint" && (
                    <TextButton text="다음으로" onPress={createJoint} />
                  )}
                  {page === "duplicate" && (
                    <TextButton
                      text="날짜 다시 선택"
                      onPress={() => setPage("newJoint")}
                    />
                  )}
                </View>
              </>
            ) : (
              <View style={styles.flex} />
            )}
          </>
        )}

        {(popup === "more" || popup === "leaveConfirm") && isDetail && (
          <View style={styles.popLayer} pointerEvents="box-none">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPopup("none")}
              accessibilityLabel="더보기 메뉴 닫기"
            />
            <View style={styles.moreMenu}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹 멤버 관리"
                onPress={() => {
                  startKick();
                }}
                style={styles.moreMenuItem}
              >
                <Text style={styles.moreMenuText}>그룹 멤버 관리</Text>
              </Pressable>
              <View style={styles.moreDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹에서 나가기"
                onPress={() => {
                  setPopup("leaveConfirm");
                }}
                style={styles.moreMenuItem}
              >
                <Text style={styles.leaveText}>그룹에서 나가기</Text>
              </Pressable>
            </View>
          </View>
        )}
        {popup === "leaveConfirm" && isDetail && (
          <View style={styles.inviteOverlay}>
            <Pressable
              onPress={() => setPopup("more")}
              style={StyleSheet.absoluteFill}
              accessibilityLabel="그룹 나가기 확인 닫기"
            />
            <View style={styles.leaveDialog}>
              <Text style={styles.leaveDialogHeading}>그룹을 나갈까요?</Text>
              <Text style={styles.leaveDialogDescription}>
                내 티켓은 개인 보관함에서 계속 볼 수 있어요.
              </Text>
              <TextButton text="그룹 나가기" onPress={startLeave} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="취소"
                onPress={() => setPopup("none")}
                style={styles.closeDialog}
              >
                <Text style={styles.closeDialogText}>취소</Text>
              </Pressable>
            </View>
          </View>
        )}
        {popup === "handoffConfirm" &&
          page === "handoffSelect" &&
          selectedSuccessor && (
            <View style={styles.inviteOverlay}>
              <Pressable
                onPress={() => setPopup("none")}
                style={StyleSheet.absoluteFill}
                accessibilityLabel="그룹장 위임 확인 닫기"
              />
              <View style={styles.leaveDialog}>
                <Text style={styles.leaveDialogHeading}>
                  멤버 {selectedSuccessor} 님을 그룹장으로 선정할까요?
                </Text>
                <Text style={styles.leaveDialogDescription}>
                  선정한 멤버에게 그룹장 권한을 넘긴 뒤 그룹에서 나가요.
                </Text>
                <View style={styles.handoffDialogActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="취소"
                    onPress={() => setPopup("none")}
                    style={({ pressed }) => [
                      styles.handoffActionButton,
                      styles.handoffCancel,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.handoffCancelLabel}>취소</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="확인"
                    onPress={confirmHandoff}
                    style={({ pressed }) => [
                      styles.handoffActionButton,
                      styles.handoffConfirm,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.handoffConfirmLabel}>확인</Text>
                  </Pressable>
                </View>
                <Text style={styles.decisionWarning}>
                  ※ 그룹을 나간 뒤에는 변경할 수 없어요
                </Text>
              </View>
            </View>
          )}
        {popup === "invite" && isDetail && (
          <View style={styles.inviteOverlay}>
            <Pressable
              onPress={() => setPopup("none")}
              style={StyleSheet.absoluteFill}
              accessibilityLabel="초대 링크 팝업 닫기"
            />
            <View style={styles.inviteDialog}>
              <Text style={styles.inviteHeading}>초대 링크 생성 완료!</Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="초대받은 화면 미리보기"
                onPress={() => {
                  setPopup("none");
                  setPage("join");
                }}
              >
                <Text style={styles.inviteUrl}>{DEMO_INVITE_URL}</Text>
              </Pressable>
              <TextButton text="공유하기" onPress={shareInvite} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                onPress={() => setPopup("none")}
                style={styles.closeDialog}
              >
                <Text style={styles.closeDialogText}>닫기</Text>
              </Pressable>
            </View>
          </View>
        )}
        {popup === "participants" && page === "newJoint" && (
          <View style={styles.inviteOverlay}>
            <Pressable
              onPress={() => setPopup("none")}
              style={StyleSheet.absoluteFill}
              accessibilityLabel="참여 멤버 선택 닫기"
            />
            <View style={styles.participantDialog}>
              <Text style={styles.inviteHeading}>티켓 참여 멤버 추가</Text>
              <Text style={styles.inviteUrl}>
                이 티켓에 함께할 멤버를 선택해 주세요.
              </Text>
              <View style={styles.participantList}>
                {currentMemberLetters.map((letter) => {
                  const selected = pendingJointMembers.includes(letter);
                  return (
                    <Pressable
                      key={letter}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => toggleJointMember(letter)}
                      style={[
                        styles.participantRow,
                        selected && styles.participantSelected,
                      ]}
                    >
                      <View
                        style={[styles.jointAvatar, styles.participantAvatar]}
                      >
                        <Text style={styles.jointAvatarText}>{letter}</Text>
                      </View>
                      <Text style={styles.memberManageText}>멤버 {letter}</Text>
                      <Text style={styles.participantCheck}>
                        {selected ? "✓" : ""}
                      </Text>
                    </Pressable>
                  );
                })}
                {currentMemberLetters.length === 0 && (
                  <Text style={styles.hintText}>
                    추가 가능한 멤버가 없어요.
                  </Text>
                )}
              </View>
              <TextButton
                text="확인"
                onPress={() => {
                  setSelectedJointMembers(pendingJointMembers);
                  setPopup("none");
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="취소"
                onPress={() => setPopup("none")}
                style={styles.closeDialog}
              >
                <Text style={styles.closeDialogText}>취소</Text>
              </Pressable>
            </View>
          </View>
        )}
        {popup === "memberAction" &&
          selectedKickMember &&
          page === "kickSelect" && (
            <View style={styles.memberMenuOverlay}>
              <Pressable
                onPress={() => setPopup("none")}
                style={StyleSheet.absoluteFill}
                accessibilityLabel="멤버 메뉴 닫기"
              />
              <View style={[styles.memberActionMenu, memberMenuPosition]}>
                <Pressable
                  onPress={() => {
                    setKickRecordChoice("keep");
                    setPopup("kickConfirm");
                  }}
                  style={styles.memberActionButton}
                >
                  <Text style={styles.leaveText}>그룹에서 멤버 삭제</Text>
                </Pressable>
              </View>
            </View>
          )}
        {popup === "kickSuccess" && (
          <View style={styles.inviteOverlay}>
            <Pressable
              onPress={() => {
                setPopup("none");
                setPage("group");
              }}
              style={StyleSheet.absoluteFill}
              accessibilityLabel="완료 팝업 닫기"
            />
            <View style={styles.inviteDialog}>
              <Text style={styles.inviteHeading}>삭제가 완료되었어요.</Text>
              <Text style={styles.inviteUrl}>
                멤버가 그룹에서 삭제되었어요.
              </Text>
              <TextButton
                text="확인"
                onPress={() => {
                  setPopup("none");
                  setPage("group");
                }}
              />
            </View>
          </View>
        )}
        {popup === "kickConfirm" && selectedKickMember && (
          <View style={styles.inviteOverlay}>
            <Pressable
              onPress={() => setPopup("none")}
              style={StyleSheet.absoluteFill}
              accessibilityLabel="멤버 삭제 확인 닫기"
            />
            <View style={styles.leaveDialog}>
              <Text style={styles.leaveDialogHeading}>
                그룹에서 멤버를 삭제할까요?
              </Text>
              <Text style={styles.leaveDialogDescription}>
                멤버 {selectedKickMember} 님을 그룹에서 삭제합니다.
              </Text>
              <View style={styles.decisionOptions}>
                {recordChoices.map((choice) => {
                  const selected = kickRecordChoice === choice;
                  return (
                    <Pressable
                      key={choice}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setKickRecordChoice(choice)}
                      style={[
                        styles.decisionOption,
                        selected && styles.decisionOptionSelected,
                      ]}
                    >
                      <Text style={styles.decisionOptionTitle}>
                        {choice === "keep"
                          ? "그룹 기록에 남기기"
                          : "그룹 기록에서 제거"}
                      </Text>
                      <Text style={styles.decisionOptionSubtitle}>
                        {choice === "keep"
                          ? "멤버의 개인 티켓을 그룹에 유지"
                          : "그룹에서 멤버의 티켓 연결 제거"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextButton text="삭제하기" onPress={finishKick} />
              <Pressable
                onPress={() => setPopup("none")}
                style={styles.closeDialog}
              >
                <Text style={styles.closeDialogText}>취소</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  handoffDescription: {
    color: C.detailMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  handoffDialogActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  handoffActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  handoffCancel: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  handoffConfirm: { backgroundColor: C.button },
  handoffCancelLabel: { color: C.text, fontSize: 14, fontWeight: "600" },
  handoffConfirmLabel: { color: C.surface, fontSize: 14, fontWeight: "600" },
  newLeaderBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  newLeaderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  newLeaderInitial: { color: C.muted, fontSize: 28, fontWeight: "400" },
  newLeaderLabel: { color: C.detailMuted, fontSize: 12 },
  jointMemberSummary: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  jointAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.pink,
  },
  jointAvatarText: { color: C.text, fontSize: 11, fontWeight: "600" },
  addJointMember: {
    minHeight: 36,
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: C.surface,
  },
  addJointMemberText: { color: C.text, fontSize: 12 },
  jointDoneHeading: { color: C.text, fontSize: 16, marginBottom: 16 },
  participantDialog: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 19,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 12,
    elevation: 12,
    shadowColor: "#44322A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 13,
  },
  participantList: { gap: 4 },
  participantRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
  },
  participantSelected: { borderColor: C.button, backgroundColor: "#F9E9E2" },
  participantAvatar: { width: 28, height: 28 },
  participantCheck: { marginLeft: "auto", color: C.button, fontWeight: "700" },
  memberTabs: {
    flexDirection: "row",
    height: 38,
    borderRadius: 12,
    padding: 3,
    backgroundColor: C.pink,
  },
  memberTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  memberTabActive: { backgroundColor: C.button },
  memberTabText: { color: C.text, fontSize: 11, fontWeight: "500" },
  memberTabTextActive: { color: C.surface },
  managedMemberRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    borderRadius: 13,
  },
  managedAvatar: { width: 32, height: 32, borderRadius: 16 },
  managedMemberInfo: { flex: 1, gap: 3 },
  managedMemberDate: { color: C.muted, fontSize: 10 },
  managedMemberMenu: {
    width: 32,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  memberActionMenu: {
    position: "absolute",
    width: 180,
    borderRadius: 12,
    padding: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 10,
    shadowColor: "#44322A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  memberMenuOverlay: { ...StyleSheet.absoluteFill, zIndex: 30 },
  memberActionButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  createdContent: { flex: 1, gap: 0 },
  createdCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  createdPreview: {
    alignSelf: "center",
    width: 164,
    height: 270,
    marginTop: 0,
    marginBottom: 0,
    padding: 20,
    justifyContent: "flex-start",
    gap: 34,
    backgroundColor: "#F1E5E0",
    borderRadius: 11,
    overflow: "hidden",
  },
  createdTicketBrand: { fontSize: 10, lineHeight: 14, letterSpacing: 0.8 },
  createdTicketDate: {
    marginTop: 16,
    color: C.primary,
    fontSize: 31,
    lineHeight: 40,
  },
  createdTicketTitle: { color: C.detailMuted, fontSize: 16, lineHeight: 22 },
  createdTicketPerforation: {
    position: "absolute",
    right: 6,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBA9A0",
  },
  createdCaption: {
    textAlign: "center",
    color: C.detailMuted,
    fontSize: 14,
    marginTop: 38,
  },
  createdActions: {
    marginTop: "auto",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
  },
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: C.canvas },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  homeTop: {
    height: 61,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 9,
  },
  logo: { width: 100, height: 50 },
  homeContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 26,
  },
  personalCard: {
    width: "100%",
    minHeight: 74,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  personalTitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    color: C.text,
  },
  personalSub: { fontSize: 12, lineHeight: 16, color: C.muted },
  groupSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 16,
  },
  sectionHeading: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  groupCards: { gap: 16 },
  groupCard: {
    width: "100%",
    minHeight: 74,
    borderRadius: 12,
    backgroundColor: C.pink,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  groupCardTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  groupCardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupCardDate: { color: C.muted, fontSize: 12, lineHeight: 16 },
  homeAction: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: C.button,
  },
  primaryLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: C.surface,
    fontWeight: "500",
    textAlign: "center",
  },
  outlinedButton: {
    borderColor: C.border,
    borderWidth: 1,
    backgroundColor: C.surface,
  },
  outlinedLabel: { color: C.text },
  bottomNav: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.nav,
    paddingHorizontal: 27,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", height: 60 },
  tabText: { fontSize: 14, color: "#080808", lineHeight: 20 },
  tabActive: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.22)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 3,
  },
  detailHeader: {
    height: 56,
    marginBottom: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backLabel: { fontSize: 27, color: C.primary, lineHeight: 32, marginTop: -3 },
  detailHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    color: C.primary,
  },
  ellipsisBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ellipsis: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.detailMuted,
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  memberSection: { gap: 10 },
  inlineTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    color: C.primary,
  },
  sectionCount: { fontSize: 12, color: C.detailMuted },
  membersWrap: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  memberCell: { width: 40, alignItems: "center", gap: 4 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  myAvatar: { borderColor: C.accent, borderWidth: 2 },
  avatarLetter: { fontSize: 13, fontWeight: "700" },
  avatarCaption: {
    fontSize: 10,
    color: C.detailMuted,
    textAlign: "center",
    width: 49,
    lineHeight: 13,
  },
  emptyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: C.border,
    borderWidth: 1,
    borderStyle: "dashed",
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: { fontSize: 23, color: C.detailMuted, lineHeight: 28 },
  ticketSection: { gap: 8 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterButton: {
    height: 34,
    minWidth: 65,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    backgroundColor: C.surface,
  },
  filterActive: { backgroundColor: "#F4E5DF" },
  monthButton: { minWidth: 100 },
  filterText: { color: "#533832", fontSize: 12, fontWeight: "700" },
  ticketList: { gap: 12 },
  createTicketRow: {
    height: 55,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.border,
    backgroundColor: C.surface,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 14,
  },
  ticketPlus: { fontSize: 25, color: C.detailMuted, lineHeight: 30 },
  createTicketLabel: { color: C.primary, fontWeight: "700", fontSize: 14 },
  ticketRow: {
    minHeight: 130,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderColor: C.border,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  ticketStub: {
    width: 54,
    height: 108,
    borderRadius: 8,
    backgroundColor: "#F4E5DF",
    overflow: "hidden",
    paddingLeft: 5,
    paddingTop: 10,
    position: "relative",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  ticketBrand: {
    color: C.accent,
    fontSize: 7,
    letterSpacing: 0.5,
    lineHeight: 10,
  },
  ticketDay: { color: C.primary, fontSize: 13, lineHeight: 20 },
  ticketGroupName: {
    color: C.detailMuted,
    fontSize: 8,
    lineHeight: 12,
    width: 44,
  },
  ticketCutLine: {
    position: "absolute",
    right: 2,
    top: 10,
    height: 92,
    width: 1,
    borderStyle: "dashed",
    borderColor: C.accent,
    borderRightWidth: 1,
    opacity: 0.5,
  },
  ticketInfo: { flex: 1, gap: 3, justifyContent: "center" },
  ticketDate: { fontSize: 12, lineHeight: 16, color: C.text },
  ticketDateGroup: { fontSize: 12, lineHeight: 16, color: C.text },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    color: C.primary,
  },
  ticketMore: { fontSize: 12, lineHeight: 16, color: C.accent },
  noTicketText: { fontSize: 12, color: C.detailMuted, padding: 12 },
  hintText: { fontSize: 12, lineHeight: 19, color: C.detailMuted },
  joinBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  joinHeading: {
    fontSize: 26,
    fontWeight: "500",
    color: C.primary,
    lineHeight: 36,
  },
  joinSubtitle: { fontSize: 13, lineHeight: 20, color: C.detailMuted },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 30,
    gap: 25,
  },
  formHeading: {
    fontSize: 24,
    color: C.primary,
    lineHeight: 32,
    fontWeight: "600",
  },
  formStack: { gap: 18 },
  formLabel: { fontSize: 14, color: C.primary, fontWeight: "500" },
  formInput: {
    height: 51,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    color: C.primary,
    paddingHorizontal: 15,
    fontSize: 14,
  },
  formBottom: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  popLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
  moreMenu: {
    position: "absolute",
    top: 36,
    right: 22,
    width: 160,
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: "#4A342B",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  moreMenuItem: { height: 35, alignItems: "center", justifyContent: "center" },
  moreMenuText: { color: C.text, fontSize: 12, fontWeight: "500" },
  leaveText: { color: "#C87968", fontSize: 12, fontWeight: "500" },
  moreDivider: { backgroundColor: C.border, height: 1, marginHorizontal: 18 },
  inviteOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 25,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(52,39,33,0.08)",
  },
  inviteDialog: {
    backgroundColor: C.surface,
    borderRadius: 16,
    minHeight: 214,
    paddingHorizontal: 19,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 12,
    elevation: 12,
    shadowColor: "#44322A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    transform: [{ translateY: -50 }],
  },
  inviteHeading: {
    color: C.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  inviteUrl: { color: C.detailMuted, fontSize: 14, lineHeight: 20 },
  closeDialog: { height: 52, alignItems: "center", justifyContent: "center" },
  closeDialogText: { fontSize: 14, color: C.text, fontWeight: "500" },
  // 05. GROUP / 나가기 · 멤버 내보내기
  memberManageContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 26,
    gap: 14,
  },
  memberManageLabel: {
    color: C.button,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  memberManageList: { gap: 14 },
  memberManageRow: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  memberManageSelected: { backgroundColor: "#F0C8BE", borderColor: C.border },
  memberManageText: {
    color: C.primary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  memberManageDots: { color: C.detailMuted, fontSize: 20, fontWeight: "700" },
  decisionContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  decisionHeading: {
    fontSize: 26,
    lineHeight: 36,
    fontWeight: "500",
    color: C.button,
  },
  decisionOptions: { gap: 14 },
  decisionOption: {
    minHeight: 77,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  decisionOptionSelected: { backgroundColor: "#F9E9E2", borderColor: C.button },
  decisionOptionTitle: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  decisionOptionSubtitle: {
    color: C.detailMuted,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  decisionNote: {
    color: C.detailMuted,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  decisionFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 20,
    backgroundColor: C.canvas,
  },
  decisionWarning: {
    color: "#CF897C",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    letterSpacing: 0.4,
  },
  finishedContent: { flex: 1, paddingTop: 16, paddingHorizontal: 20, gap: 14 },
  finishedHeading: {
    color: C.primary,
    fontSize: 26,
    fontWeight: "500",
    lineHeight: 36,
  },
  finishedDescription: {
    color: C.detailMuted,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  leaveDialog: {
    backgroundColor: C.surface,
    borderRadius: 17,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 12,
    gap: 12,
    elevation: 12,
    shadowColor: "#44322A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    transform: [{ translateY: -14 }],
  },
  leaveDialogHeading: {
    color: C.primary,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  leaveDialogDescription: {
    color: C.detailMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
