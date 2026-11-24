import {
  ErrorCode,
  type InviteInfoResponse,
  type SharedTicketDetailResponse,
  type SharedTicketListResponse,
  GROUP_NAME_MAX,
  USER_GROUP_MAX,
  JOINT_TITLE_MAX,
  groupNameSchema,
  jointTitleSchema,
} from "@mind-do/shared";
import logo from "../../assets/memo-re-wordmark.png";
import groupDefaultMascot from "../../assets/memo-re-mascot.png";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import * as ImagePicker from "expo-image-picker";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import TicketRenderer from "./TicketRenderer";
import SharedTicketEditor from "./SharedTicketEditor";
import {
  ApiError,
  createGroup as createServerGroup,
  createGroupInvite,
  createSharedTicket,
  getGroupDetail,
  getGroupSharedTickets,
  getInvite,
  getSharedTicketDetail,
  joinGroupByInvite,
} from "../lib/api";

export type JointTicket = {
  date: string;
  title: string;
  completed: number;
  invitees: number;
  sharedTicketId?: number;
  myStatus?: SharedTicketListResponse["sharedTickets"][number]["myStatus"];
};

function sortJointTicketsByDate(tickets: JointTicket[]): JointTicket[] {
  const dateKey = (date: string) => date.replace(/[^0-9]/g, "");
  return [...tickets].sort((a, b) =>
    dateKey(a.date).localeCompare(dateKey(b.date)),
  );
}

export type DemoGroup = {
  id: string;
  name: string;
  isDefault: boolean;
  members: number;
  maxMembers: number;
  tickets: JointTicket[];
  createdAt?: string;
  memberNames?: Record<string, string>;
};

type GroupScreenProps = {
  onOpenHome: () => void;
  onOpenMy: () => void;
  groups: DemoGroup[];
  currentUserId: number;
  onGroupsChange: Dispatch<SetStateAction<DemoGroup[]>>;
};

type Page =
  | "groups"
  | "group"
  | "join"
  | "newGroup"
  | "inviteLink"
  | "renameGroup"
  | "newJoint"
  | "jointDone"
  | "ticketMembers"
  | "ticketDetail"
  | "personalTicket"
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
const GROUP_COVER_IMAGES_KEY = "@memore/group_cover_images_v1";

const C = {
  canvas: "#FFFFFF",
  surface: "#FFFFFF",
  primary: "#2E3DB5",
  text: "#252B45",
  muted: "#7C8292",
  detailMuted: "#7C8292",
  border: "#DDE3ED",
  pink: "#F4E5DF",
  nav: "#FFFFFF",
  button: "#2E3DB5",
  accent: "#EC806F",
  input: "#F5F7FB",
};

type BottomTab = "home" | "group" | "store" | "my";
function BottomNavigation({
  activeTab,
  onSelect,
}: {
  activeTab: BottomTab;
  onSelect: (tab: BottomTab) => void;
}) {
  return (
    <View style={bottomNavStyles.outer}>
      <View style={bottomNavStyles.bar}>
        {(
          [
            { key: "home", label: "홈" },
            { key: "group", label: "그룹" },
            { key: "store", label: "스토어" },
            { key: "my", label: "마이" },
          ] as const
        ).map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeTab === tab.key }}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [
              bottomNavStyles.item,
              pressed && bottomNavStyles.pressed,
            ]}
          >
            <BottomNavIcon tab={tab.key} />
            <Text
              style={[
                bottomNavStyles.label,
                activeTab === tab.key && bottomNavStyles.activeLabel,
              ]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.key && (
              <View style={bottomNavStyles.activeMark} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function BottomNavIcon({ tab }: { tab: BottomTab }) {
  return (
    <View style={bottomNavStyles.icon}>
      {tab === "home" && (
        <>
          <View style={bottomNavStyles.homeRoof} />
          <View style={bottomNavStyles.homeBody}>
            <View style={bottomNavStyles.homeDoor} />
          </View>
        </>
      )}
      {tab === "group" && (
        <View style={bottomNavStyles.ticketIcon}>
          <View style={bottomNavStyles.ticketHoleLeft} />
          <View style={bottomNavStyles.ticketLine} />
          <View style={bottomNavStyles.ticketHoleRight} />
        </View>
      )}
      {tab === "store" && (
        <>
          <View style={bottomNavStyles.storeRoof}>
            <View style={bottomNavStyles.storeStripe} />
            <View style={bottomNavStyles.storeStripe} />
          </View>
          <View style={bottomNavStyles.storeBody}>
            <View style={bottomNavStyles.storeDoor} />
          </View>
        </>
      )}
      {tab === "my" && (
        <>
          <View style={bottomNavStyles.personHead} />
          <View style={bottomNavStyles.personBody} />
        </>
      )}
    </View>
  );
}
const bottomNavStyles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
  },
  bar: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#303CB5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  item: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 18,
  },
  pressed: { opacity: 0.65 },
  label: { color: "#7C8292", fontSize: 11, lineHeight: 14, fontWeight: "500" },
  activeLabel: { color: "#2E3DB5", fontWeight: "700" },
  activeMark: {
    position: "absolute",
    bottom: 4,
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#EC806F",
  },
  icon: {
    width: 30,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  homeRoof: {
    position: "absolute",
    top: 3,
    width: 11,
    height: 11,
    borderTopWidth: 1.8,
    borderLeftWidth: 1.8,
    borderColor: "#29211E",
    transform: [{ rotate: "45deg" }],
  },
  homeBody: {
    position: "absolute",
    bottom: 3,
    width: 14,
    height: 11,
    borderWidth: 1.8,
    borderTopWidth: 0,
    borderColor: "#29211E",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  homeDoor: {
    width: 3,
    height: 6,
    borderWidth: 1.3,
    borderBottomWidth: 0,
    borderColor: "#29211E",
  },
  ticketIcon: {
    width: 28,
    height: 18,
    borderWidth: 2,
    borderColor: "#29211E",
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketLine: {
    width: 0,
    height: 11,
    borderLeftWidth: 1.4,
    borderStyle: "dashed",
    borderColor: "#29211E",
  },
  ticketHoleLeft: {
    position: "absolute",
    left: -3,
    top: 5,
    width: 6,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  ticketHoleRight: {
    position: "absolute",
    right: -3,
    top: 5,
    width: 6,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  storeRoof: {
    position: "absolute",
    top: 3,
    width: 17,
    height: 6,
    borderWidth: 1.7,
    borderColor: "#29211E",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  storeStripe: { width: 1, height: 5, backgroundColor: "#29211E" },
  storeBody: {
    position: "absolute",
    bottom: 3,
    width: 15,
    height: 10,
    borderWidth: 1.7,
    borderTopWidth: 0,
    borderColor: "#29211E",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  storeDoor: {
    width: 4,
    height: 6,
    borderWidth: 1.3,
    borderBottomWidth: 0,
    borderColor: "#29211E",
  },
  personHead: {
    position: "absolute",
    top: 2,
    width: 7,
    height: 7,
    borderWidth: 1.7,
    borderColor: "#29211E",
    borderRadius: 4,
  },
  personBody: {
    position: "absolute",
    bottom: 2,
    width: 15,
    height: 9,
    borderWidth: 1.7,
    borderBottomWidth: 0,
    borderColor: "#29211E",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});

const avatarColors = [
  "#F2F3F6",
  "#F2F3F6",
  "#F2F3F6",
  "#F2F3F6",
  "#F2F3F6",
  "#F2F3F6",
];
const avatarTextColors = [
  "#303CB5",
  "#303CB5",
  "#303CB5",
  "#303CB5",
  "#303CB5",
  "#303CB5",
];
const avatarLetters = ["나", "A", "B", "C", "D", "E"];

function dateToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function kstDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
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
  onPress,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength?: number;
  onPress?: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.formLabel}>{label}</Text>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 달력에서 선택`}
          onPress={onPress}
          style={[styles.formInput, styles.dateInput]}
        >
          <Text style={styles.dateInputText}>{value || placeholder}</Text>
          <Text style={styles.dateInputIcon}>▦</Text>
        </Pressable>
      ) : (
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
      )}
    </View>
  );
}

function TicketStub({
  ticket,
  groupName,
  index,
  onPress,
}: {
  ticket: JointTicket;
  groupName: string;
  index: number;
  onPress: () => void;
}) {
  const [, month = "", day = ""] = ticket.date.split(/[.-]/);
  const colors = ["#E98270", "#9FD4BB", "#B39FE3"];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ticket.title || "제목 없음"} 공동 티켓 전체 보기`}
      onPress={onPress}
      style={({ pressed }) => [styles.ticketCard, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.ticketCardFace,
          { backgroundColor: colors[index % colors.length] },
        ]}
      >
        <Text style={styles.ticketCardDate}>
          {String(Number(month)).padStart(2, "0")}.
          {String(Number(day)).padStart(2, "0")}
        </Text>
        <Text numberOfLines={1} style={styles.ticketGroupName}>
          {groupName}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.ticketCardTitle}>
        {ticket.title || "제목 없음"}
      </Text>
      <Text style={styles.ticketCardParticipants}>
        참여 {ticket.invitees}명
      </Text>
    </Pressable>
  );
}

function MemberProfiles({
  members,
  maxMembers,
  onInvite,
  letters,
}: {
  members: number;
  maxMembers: number;
  onInvite: () => void;
  letters?: string[];
}) {
  const currentLetters =
    letters ?? avatarLetters.slice(1, Math.min(members, maxMembers));
  const visibleLetters = ["나", ...currentLetters].slice(0, maxMembers);
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
      {count < maxMembers && (
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
  currentUserId,
}: GroupScreenProps) {
  const [page, setPage] = useState<Page>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [popup, setPopup] = useState<Popup>("none");
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [expandedMonthYear, setExpandedMonthYear] = useState<string | null>(
    null,
  );
  const [datePickerTarget, setDatePickerTarget] = useState<
    "first" | "joint" | null
  >(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [groupName, setGroupName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [firstDate, setFirstDate] = useState(fmtDate(dateToday()));
  const [firstTitle, setFirstTitle] = useState("");
  const [createdGroup, setCreatedGroup] = useState<DemoGroup | null>(null);
  const [jointDate, setJointDate] = useState(fmtDate(dateToday()));
  const [jointTitle, setJointTitle] = useState("");
  const [selectedSlotUserId, setSelectedSlotUserId] = useState<number | null>(
    null,
  );
  const [ticketDetailShowingBack, setTicketDetailShowingBack] = useState(false);
  const [selectedJointMembers, setSelectedJointMembers] = useState<string[]>(
    [],
  );
  const [pendingJointMembers, setPendingJointMembers] = useState<string[]>([]);
  const [duplicateDate, setDuplicateDate] = useState("");
  const [invite, setInvite] = useState<{
    token: string;
    info: InviteInfoResponse;
  } | null>(null);
  const [ticketDetail, setTicketDetail] =
    useState<SharedTicketDetailResponse | null>(null);
  const requestVersion = useRef(0);
  const submitting = useRef(false);
  useEffect(
    () => () => {
      requestVersion.current += 1;
    },
    [],
  );
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
  const [groupCoverImages, setGroupCoverImages] = useState<
    Record<string, string>
  >({});
  const [newGroupCoverUri, setNewGroupCoverUri] = useState<string | null>(null);
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

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(GROUP_COVER_IMAGES_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          return;
        const images = Object.fromEntries(
          Object.entries(parsed).filter(
            ([id, uri]) => typeof id === "string" && typeof uri === "string",
          ),
        ) as Record<string, string>;
        setGroupCoverImages(images);
      })
      .catch(() => {
        // 이미지 캐시를 읽지 못해도 기본 마스코트로 그룹 목록을 표시합니다.
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedGroup =
    groups.find((g) => g.id === selectedGroupId) ?? groups[0];
  const regularGroups = groups.filter((group) => !group.isDefault);
  const defaultGroup = groups.find((group) => group.isDefault);
  const regularGroupCount = regularGroups.length;

  async function pickGroupCoverImage(): Promise<string | null> {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "사진 권한 필요",
          "그룹 이미지를 바꾸려면 사진 접근을 허용해 주세요.",
        );
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return null;
      return result.assets[0]?.uri ?? null;
    } catch {
      Alert.alert(
        "그룹 이미지 오류",
        "이미지를 불러오지 못했어요. 다시 시도해 주세요.",
      );
      return null;
    }
  }
  async function saveGroupCoverImage(groupId: string, uri: string) {
    let storedImages: Record<string, string> = {};
    try {
      const raw = await AsyncStorage.getItem(GROUP_COVER_IMAGES_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          storedImages = Object.fromEntries(
            Object.entries(parsed).filter(
              ([, value]) => typeof value === "string",
            ),
          ) as Record<string, string>;
        }
      }
    } catch {
      // 현재 메모리 값으로 저장을 계속합니다.
    }
    const nextImages = { ...storedImages, ...groupCoverImages, [groupId]: uri };
    setGroupCoverImages(nextImages);
    await AsyncStorage.setItem(
      GROUP_COVER_IMAGES_KEY,
      JSON.stringify(nextImages),
    );
  }
  async function changeGroupCover(group: DemoGroup) {
    // 고정 그룹은 그룹 목록에서 편집 가능한 이미지 카드로 표시하지 않습니다.
    if (group.isDefault) return;
    const uri = await pickGroupCoverImage();
    if (!uri) return;
    try {
      await saveGroupCoverImage(group.id, uri);
    } catch {
      Alert.alert(
        "그룹 이미지 저장 오류",
        "이미지를 저장하지 못했어요. 다시 시도해 주세요.",
      );
    }
  }
  async function chooseNewGroupCover() {
    const uri = await pickGroupCoverImage();
    if (uri) setNewGroupCoverUri(uri);
  }
  useEffect(() => {
    const hasUnsortedTickets = groups.some((group) => {
      const sorted = sortJointTicketsByDate(group.tickets);
      return group.tickets.some((ticket, index) => ticket !== sorted[index]);
    });
    if (!hasUnsortedTickets) return;
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        tickets: sortJointTicketsByDate(group.tickets),
      })),
    );
  }, [groups, setGroups]);

  const currentMemberLetters = useMemo(() => {
    if (!selectedGroup) return [];
    const removed = removedMembersByGroup[selectedGroup.id] ?? [];
    return Object.keys(selectedGroup.memberNames ?? {}).filter(
      (id) => !removed.includes(id),
    );
  }, [selectedGroup, removedMembersByGroup]);
  const groupTicketsForDisplay = useMemo(
    () => selectedGroup?.tickets ?? [],
    [selectedGroup],
  );
  const sortedTickets = useMemo(() => {
    return sortJointTicketsByDate(
      groupTicketsForDisplay.filter(
        (ticket) => !monthFilter || ticket.date.startsWith(monthFilter),
      ),
    );
  }, [groupTicketsForDisplay, monthFilter]);
  const availableMonths = useMemo(
    () =>
      Array.from(
        new Set(groupTicketsForDisplay.map((t) => t.date.slice(0, 7))),
      ).sort((a, b) => b.localeCompare(a)),
    [groupTicketsForDisplay],
  );
  const monthsByYear = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    availableMonths.forEach((month) => {
      const year = month.slice(0, 4);
      (grouped[year] ??= []).push(month);
    });
    return grouped;
  }, [availableMonths]);
  const availableYears = Object.keys(monthsByYear).sort((a, b) =>
    b.localeCompare(a),
  );
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarDaysInMonth = new Date(
    calendarYear,
    calendarMonthIndex + 1,
    0,
  ).getDate();
  const calendarFirstWeekday = new Date(
    calendarYear,
    calendarMonthIndex,
    1,
  ).getDay();
  const calendarCells: (number | null)[] = [
    ...Array.from({ length: calendarFirstWeekday }, () => null),
    ...Array.from({ length: calendarDaysInMonth }, (_, index) => index + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);
  const currentMonthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  const canAdvanceCalendar =
    calendarMonth.getTime() < currentMonthStart.getTime();

  async function loadGroup(id: number) {
    const [detail, list] = await Promise.all([
      getGroupDetail(id),
      getGroupSharedTickets(id),
    ]);
    const group: DemoGroup = {
      id: String(id),
      name: detail.name,
      isDefault: detail.isDefault,
      members: detail.memberCount,
      maxMembers: detail.maxMembers,
      createdAt: kstDate(detail.createdAt),
      memberNames: Object.fromEntries(
        detail.members
          .filter((member) => member.userId !== currentUserId)
          .map((member) => [String(member.userId), member.name]),
      ),
      tickets: list.sharedTickets.map((ticket) => ({
        date: ticket.ticketDate,
        title: ticket.title ?? "",
        completed: ticket.completedCount,
        invitees: ticket.slotCount,
        sharedTicketId: ticket.sharedTicketId,
        myStatus: ticket.myStatus,
      })),
    };
    return group;
  }

  function updateGroup(group: DemoGroup) {
    setGroups((previous) =>
      previous.some((entry) => entry.id === group.id)
        ? previous.map((entry) => (entry.id === group.id ? group : entry))
        : [...previous, group],
    );
  }

  async function openGroup(id: string) {
    const version = ++requestVersion.current;
    try {
      const group = await loadGroup(Number(id));
      if (version !== requestVersion.current) return;
      updateGroup(group);
      setSelectedGroupId(id);
      setMonthFilter(null);
      setPopup("none");
      setPage("group");
    } catch {
      if (version === requestVersion.current) {
        Alert.alert("그룹 불러오기 오류", "그룹 정보를 불러오지 못했어요.");
      }
    }
  }
  function back() {
    requestVersion.current += 1;
    if (popup !== "none") {
      setPopup("none");
      return;
    }
    if (page === "groups") {
      onOpenHome();
      return;
    }
    if (page === "newGroup" || page === "inviteLink" || page === "group") {
      setPage("groups");
      return;
    }
    if (page === "renameGroup") {
      setPage("group");
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
    if (regularGroupCount >= USER_GROUP_MAX) {
      Alert.alert(
        "그룹 수 제한",
        `기본 그룹을 제외하고 최대 ${USER_GROUP_MAX}개까지 참여할 수 있어요.`,
      );
      return;
    }
    setGroupName("");
    setNewGroupCoverUri(null);
    setFirstDate(fmtDate(dateToday()));
    setFirstTitle("");
    setCreatedGroup(null);
    setPage("newGroup");
  }
  function openInviteLink() {
    setInviteLink("");
    setPage("inviteLink");
  }
  async function confirmInviteLink() {
    if (submitting.current) return;
    const version = requestVersion.current;
    submitting.current = true;
    try {
      const link = new URL(inviteLink.trim());
      const match = /^\/invite\/([^/]+)\/?$/.exec(link.pathname);
      if (link.protocol !== "https:" || !match) {
        Alert.alert("초대 링크를 확인해 주세요");
        return;
      }
      const token = decodeURIComponent(match[1]);
      const info = await getInvite(token);
      if (version !== requestVersion.current) return;
      setInvite({ token, info });
      setPage("join");
    } catch {
      if (version === requestVersion.current)
        Alert.alert("유효한 초대 링크를 확인해 주세요");
    } finally {
      submitting.current = false;
    }
  }
  function startRenameGroup() {
    if (!selectedGroup || selectedGroup.isDefault) return;
    setGroupName(selectedGroup.name);
    setPopup("none");
    setPage("renameGroup");
  }
  function saveGroupName() {
    if (!selectedGroup) return;
    const nextName = groupNameSchema.safeParse(groupName.trim());
    if (!nextName.success) {
      Alert.alert(
        "그룹 이름을 확인해 주세요",
        `그룹 이름은 1~${GROUP_NAME_MAX}자까지 입력할 수 있어요.`,
      );
      return;
    }
    setGroups((old) =>
      old.map((group) =>
        group.id === selectedGroup.id
          ? { ...group, name: nextName.data }
          : group,
      ),
    );
    setPage("group");
  }
  async function createGroup() {
    if (createdGroup || submitting.current) return;
    const name = groupNameSchema.safeParse(groupName);
    if (!name.success) {
      Alert.alert(
        "그룹 이름을 확인해 주세요",
        `그룹 이름은 1~${GROUP_NAME_MAX}자까지 입력할 수 있어요.`,
      );
      return;
    }
    if (regularGroupCount >= USER_GROUP_MAX) {
      setPage("groupFail");
      return;
    }
    submitting.current = true;
    let item: DemoGroup;
    try {
      const group = await createServerGroup({ name: name.data });
      item = {
        id: String(group.groupId),
        name: group.name,
        createdAt: kstDate(group.createdAt),
        isDefault: group.isDefault,
        members: group.memberCount,
        maxMembers: group.maxMembers,
        tickets: [],
      };
    } catch {
      Alert.alert("그룹 만들기 오류", "그룹을 만들지 못했어요.");
      return;
    } finally {
      submitting.current = false;
    }
    if (newGroupCoverUri) {
      try {
        await saveGroupCoverImage(item.id, newGroupCoverUri);
      } catch {
        Alert.alert(
          "그룹 이미지 저장 오류",
          "그룹은 만들지만 이미지는 저장하지 못했어요.",
        );
      }
    }
    setGroups((old) => [...old, item]);
    setCreatedGroup(item);
    setPage("groupCreated");
  }
  async function createJoint() {
    if (!selectedGroup || submitting.current) return;
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
    submitting.current = true;
    try {
      const groupId = Number(selectedGroup.id);
      const result = await createSharedTicket(groupId, {
        ticketDate: date,
        title: title.data || null,
        inviteeIds: [currentUserId, ...selectedJointMembers.map(Number)],
      });
      const group = await loadGroup(groupId);
      updateGroup(group);
      setTicketDetail(result);
      setMonthFilter(null);
      setPage("jointDone");
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        error.code === ErrorCode.SHARED_TICKET_DATE_TAKEN
      ) {
        setDuplicateDate(date);
        setPage("duplicate");
      } else {
        Alert.alert(
          "공동 티켓 만들기 오류",
          "공동 티켓을 만들거나 목록을 갱신하지 못했어요.",
        );
      }
    } finally {
      submitting.current = false;
    }
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
    if (availableMonths.length === 0) {
      Alert.alert("월별 보기", "아직 표시할 티켓이 없어요.");
      return;
    }
    setExpandedMonthYear(availableMonths[0]?.slice(0, 4) ?? null);
    setMonthPickerVisible(true);
  }
  function openDatePicker(target: "first" | "joint") {
    const currentValue = target === "first" ? firstDate : jointDate;
    const parsed = validDate(currentValue);
    const base = parsed ? new Date(`${parsed}T00:00:00`) : new Date();
    setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setDatePickerTarget(target);
  }
  function chooseCalendarDay(day: number) {
    const chosenIso = calendarDateIso(day);
    if (chosenIso > dateToday()) return;
    const formatted = fmtDate(chosenIso);
    if (datePickerTarget === "first") setFirstDate(formatted);
    if (datePickerTarget === "joint") setJointDate(formatted);
    setDatePickerTarget(null);
  }
  function calendarDateIso(day: number) {
    return `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  function isSelectedCalendarDay(day: number) {
    const date = datePickerTarget === "first" ? firstDate : jointDate;
    return validDate(date) === calendarDateIso(day);
  }
  async function joinInvite() {
    if (!invite?.info.canJoin || submitting.current) return;
    submitting.current = true;
    try {
      const result = await joinGroupByInvite(invite.token);
      await openGroup(String(result.groupId));
      setInvite(null);
    } catch {
      Alert.alert("그룹 참여 오류", "그룹에 참여하지 못했어요.");
    } finally {
      submitting.current = false;
    }
  }

  async function shareInvite() {
    if (!selectedGroup || selectedGroup.isDefault || submitting.current) return;
    submitting.current = true;
    try {
      const { inviteUrl } = await createGroupInvite(Number(selectedGroup.id));
      await Share.share({ message: inviteUrl });
    } catch {
      Alert.alert("공유하기 오류", "그룹 초대 링크를 공유하지 못했어요.");
    } finally {
      submitting.current = false;
    }
  }

  async function openTicketMembers(ticket: JointTicket) {
    if (!ticket.sharedTicketId) return;
    const version = ++requestVersion.current;
    try {
      const detail = await getSharedTicketDetail(ticket.sharedTicketId);
      if (version !== requestVersion.current) return;
      setTicketDetail(detail);
      setJointDate(fmtDate(detail.ticketDate));
      setJointTitle(detail.title ?? "");
      setPage("ticketMembers");
    } catch {
      if (version === requestVersion.current)
        Alert.alert("티켓 조회 오류", "티켓을 불러오지 못했어요.");
    }
  }
  function startLeave() {
    if (selectedGroup?.isDefault) return;
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
    if (selectedGroup?.isDefault) return;
    if (!selectedGroup) return;
    // 기록 유지/제거 선택은 UI 시연용이며 개인 티켓 원본은 수정하지 않음.
    // 서버 API 연결 전이므로 현재 앱 화면의 그룹 목록만 변경.
    setGroups((old) => old.filter((group) => group.id !== selectedGroup.id));
    setPopup("none");
    setPage("leaveDone");
  }
  function startKick() {
    if (selectedGroup?.isDefault) return;
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

  const countText = `${regularGroupCount}/${USER_GROUP_MAX}`;
  const isDetail = page === "group";
  const isForm =
    page === "newGroup" ||
    page === "inviteLink" ||
    page === "renameGroup" ||
    page === "firstTicket" ||
    page === "newJoint" ||
    page === "duplicate";

  function renderTicket(
    slot: SharedTicketDetailResponse["slots"][number],
    width: number,
  ) {
    if (!ticketDetail || !slot.ticket) return null;
    const { ticket } = slot;
    const photoUris = ticket.photos.map((photo) => photo.url);
    if (ticket.design) {
      return (
        <TicketRenderer
          designId={ticket.design.designId}
          photoUris={photoUris}
          width={width}
          lieDown
          values={{
            title: ticketDetail.title,
            date: ticketDetail.ticketDate,
            groupName: ticketDetail.groupName,
            participants: ticketDetail.slots.map((entry) => entry.name),
          }}
        />
      );
    }
    return photoUris.map((uri, index) => (
      <Image
        key={index}
        source={{ uri }}
        style={{ width, aspectRatio: 2.5 }}
        resizeMode="contain"
      />
    ));
  }

  const selectedSlot = ticketDetail?.slots.find(
    (slot) => slot.userId === selectedSlotUserId,
  );

  if (page === "personalTicket" && ticketDetail) {
    return (
      <SharedTicketEditor
        detail={ticketDetail}
        onClose={() => setPage("ticketMembers")}
        onIssued={() => {
          const ticket = selectedGroup?.tickets.find(
            (entry) => entry.sharedTicketId === ticketDetail.sharedTicketId,
          );
          setPage("group");
          if (ticket) void openTicketMembers(ticket);
          if (selectedGroup) {
            void loadGroup(Number(selectedGroup.id))
              .then(updateGroup)
              .catch(() => {});
          }
        }}
      />
    );
  }

  if (page === "ticketMembers" && ticketDetail) {
    const ticketWidth = Math.min(360, windowWidth - 24);
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.detailHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="그룹 티켓으로 돌아가기"
            onPress={() => setPage("group")}
            style={styles.backBox}
          >
            <Text style={styles.backLabel}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.detailHeaderTitle}>
            {ticketDetail.groupName} 티켓
          </Text>
          <View style={styles.ellipsisBox} />
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.memberTicketContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={styles.detailSectionTitle}>멤버별 티켓</Text>
            <Text style={styles.memberTicketSubtitle}>
              {fmtDate(ticketDetail.ticketDate)} · {ticketDetail.title}
            </Text>
          </View>
          {ticketDetail.slots.map((slot) => (
            <View key={slot.userId} style={styles.memberTicketRow}>
              <Text>{slot.userId === currentUserId ? "나" : slot.name}</Text>
              {slot.ticket ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.name} 티켓 보기`}
                  style={styles.memberTicketPreviewButton}
                  onPress={() => {
                    setSelectedSlotUserId(slot.userId);
                    setTicketDetailShowingBack(false);
                    setPage("ticketDetail");
                  }}
                >
                  {renderTicket(slot, ticketWidth)}
                </Pressable>
              ) : slot.userId === currentUserId && slot.isCurrentMember ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPage("personalTicket")}
                  style={[
                    styles.emptyMemberTicketSlot,
                    { width: ticketWidth, aspectRatio: 2.5 },
                  ]}
                >
                  <Text style={styles.emptyMemberTicketText}>
                    내 티켓 만들기
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.emptyMemberTicketSlot,
                    { width: ticketWidth, aspectRatio: 2.5 },
                  ]}
                >
                  <Text style={styles.emptyMemberTicketText}>
                    아직 티켓을 만들지 않았어요
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "ticketDetail" && selectedSlot?.ticket && ticketDetail) {
    const ticketCardWidth = Math.min(390, windowWidth - 40);
    const ticket = selectedSlot.ticket;
    const ticketDate = fmtDate(ticketDetail.ticketDate);
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.detailHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="멤버 티켓 목록으로 돌아가기"
            onPress={() => setPage("ticketMembers")}
            style={styles.backBox}
          >
            <Text style={styles.backLabel}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.detailHeaderTitle}>
            티켓 미리보기
          </Text>
          <View style={styles.ellipsisBox} />
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.ticketDetailContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ticketCreator}>
            <Text style={styles.ticketCreatorLabel}>생성자</Text>
            <Text style={styles.ticketCreatorName}>{selectedSlot.name}</Text>
          </View>
          <View style={styles.ticketDetailStage}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                ticketDetailShowingBack
                  ? "티켓 앞면으로 뒤집기"
                  : "티켓 뒷면으로 뒤집기"
              }
              onPress={() => setTicketDetailShowingBack((showing) => !showing)}
              style={[
                ticketDetailShowingBack
                  ? styles.ticketBackNoteCard
                  : styles.ticketPreviewCard,
                { width: ticketCardWidth },
              ]}
            >
              {ticketDetailShowingBack ? (
                <>
                  <View style={styles.ticketBackNoteHeader}>
                    <Text style={styles.ticketBackNoteLabel}>MEMORY NOTE</Text>
                    <Text style={styles.ticketBackNoteDate}>{ticketDate}</Text>
                  </View>
                  {!!ticket.memo?.trim() && (
                    <Text style={styles.ticketBackNoteText}>{ticket.memo}</Text>
                  )}
                </>
              ) : (
                renderTicket(selectedSlot, ticketCardWidth - 12)
              )}
            </Pressable>
          </View>
          <Text style={styles.ticketFlipHint}>
            티켓을 누르면 {ticketDetailShowingBack ? "앞면" : "뒷면"}을 볼 수
            있어요
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, page === "groups" && styles.groupsSafe]}
      edges={["top"]}
    >
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
                <View
                  accessible
                  accessibilityLabel="알림"
                  style={styles.notificationButton}
                >
                  <View style={styles.bellBody} />
                  <View style={styles.bellBase} />
                  <View style={styles.bellClapper} />
                </View>
              </View>
              <Text style={styles.groupPageTitle}>그룹</Text>
              {defaultGroup && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${defaultGroup.name} 그룹 상세`}
                  onPress={() => openGroup(defaultGroup.id)}
                  style={styles.personalCard}
                >
                  <View style={styles.personalAvatar}>
                    <Text style={styles.personalAvatarText}>
                      {defaultGroup.name.trim().slice(0, 1) || "나"}
                    </Text>
                  </View>
                  <View style={styles.personalCopy}>
                    <Text style={styles.personalTitle}>
                      {defaultGroup.name}
                    </Text>
                    <Text style={styles.personalSub}>나만의 티켓 보관함</Text>
                  </View>
                </Pressable>
              )}
              <View style={styles.groupSectionHeader}>
                <Text style={styles.myGroupsHeading}>
                  나의 그룹 {countText}
                </Text>
                <View style={styles.groupHeaderActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="초대 링크로 참여"
                    onPress={openInviteLink}
                    style={({ pressed }) => [
                      styles.inviteLinkEntryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.inviteLinkEntryText}>
                      초대 링크 참여
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="새 그룹 만들기"
                    onPress={newGroup}
                    disabled={regularGroupCount >= USER_GROUP_MAX}
                    style={({ pressed }) => [
                      styles.newGroupButton,
                      pressed && styles.pressed,
                      regularGroupCount >= USER_GROUP_MAX && styles.disabled,
                    ]}
                  >
                    <Text style={styles.newGroupButtonText}>＋ 새 그룹</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.groupCards}>
                {regularGroups.map((group) => {
                  const imageUri = groupCoverImages[group.id];
                  return (
                    <View key={group.id} style={styles.groupCard}>
                      <View style={styles.groupCoverButton}>
                        <Image
                          source={
                            imageUri ? { uri: imageUri } : groupDefaultMascot
                          }
                          style={styles.groupCoverImage}
                          resizeMode={imageUri ? "cover" : "contain"}
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${group.name} 그룹 상세`}
                        onPress={() => openGroup(group.id)}
                        style={({ pressed }) => [
                          styles.groupCardInfo,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text numberOfLines={1} style={styles.groupCardTitle}>
                          {group.name}
                        </Text>
                        <Text style={styles.groupCardMembers}>
                          멤버 {Math.min(group.members, group.maxMembers)}/
                          {group.maxMembers}
                        </Text>
                        <Text style={styles.groupCardDate}>
                          {fmtDate(
                            group.createdAt ||
                              group.tickets[0]?.date ||
                              dateToday(),
                          )}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
                {regularGroupCount === 0 && (
                  <Text style={styles.hintText}>
                    아직 그룹이 없어요. 새 그룹을 만들어 보세요.
                  </Text>
                )}
              </View>
            </ScrollView>
            <BottomNavigation
              activeTab="group"
              onSelect={(tab) => {
                if (tab === "home") onOpenHome();
                else if (tab === "my") onOpenMy();
                else if (tab === "store") {
                  Alert.alert(
                    "스토어",
                    "스토어 화면은 이번 05 구현 범위에 포함되지 않았어요.",
                  );
                }
              }}
            />
          </>
        ) : (
          <>
            <View
              style={[
                styles.detailHeader,
                isDetail && styles.groupDetailHeader,
                (page === "newGroup" || page === "inviteLink") &&
                  styles.newGroupHeader,
                page === "kickSelect" && styles.memberManagementHeader,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="뒤로가기"
                onPress={back}
                style={[
                  styles.backBox,
                  (isDetail || page === "newGroup" || page === "inviteLink") &&
                    styles.groupDetailBackBox,
                ]}
              >
                <Text style={styles.backLabel}>‹</Text>
              </Pressable>
              <Text
                numberOfLines={1}
                style={[
                  styles.detailHeaderTitle,
                  (isDetail || page === "newGroup" || page === "inviteLink") &&
                    styles.groupDetailHeaderTitle,
                  (page === "newGroup" || page === "inviteLink") &&
                    styles.newGroupHeaderTitle,
                  (page === "kickSelect" ||
                    page === "renameGroup" ||
                    page === "handoffSelect") &&
                    styles.memberManagementHeaderTitle,
                ]}
              >
                {page === "newGroup"
                  ? "새 그룹 만들기"
                  : page === "inviteLink"
                    ? "그룹 초대"
                    : page === "renameGroup"
                      ? "그룹 이름 변경"
                      : page === "newJoint" || page === "jointDone"
                        ? selectedGroup?.name || "그룹"
                        : page === "kickSelect"
                          ? "멤버 관리"
                          : page === "handoffSelect"
                            ? "그룹장 권한 넘기기"
                            : ""}
              </Text>
              {isDetail && selectedGroup?.isDefault ? (
                <View style={styles.ellipsisBox} />
              ) : isDetail ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="그룹 더보기"
                  onPress={() => {
                    setPopup(popup === "more" ? "none" : "more");
                  }}
                  style={[styles.ellipsisBox, styles.groupDetailEllipsisBox]}
                >
                  <Text style={[styles.ellipsis, styles.groupDetailEllipsis]}>
                    •••
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.ellipsisBox,
                    (page === "newGroup" || page === "inviteLink") &&
                      styles.newGroupHeaderSpacer,
                  ]}
                />
              )}
            </View>

            {isDetail && selectedGroup ? (
              <>
                <ScrollView
                  style={styles.flex}
                  contentContainerStyle={styles.detailContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${selectedGroup.name} 그룹 이미지 변경`}
                    accessibilityHint="사진 보관함에서 그룹 대표 이미지를 선택합니다"
                    onPress={() => void changeGroupCover(selectedGroup)}
                    style={({ pressed }) => [
                      styles.groupRoomCover,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Image
                      source={
                        groupCoverImages[selectedGroup.id]
                          ? { uri: groupCoverImages[selectedGroup.id] }
                          : groupDefaultMascot
                      }
                      style={styles.groupRoomCoverImage}
                      resizeMode={
                        groupCoverImages[selectedGroup.id] ? "cover" : "contain"
                      }
                    />
                  </Pressable>
                  <Text style={styles.groupRoomName}>{selectedGroup.name}</Text>
                  {!selectedGroup.isDefault && (
                    <View style={styles.memberSection}>
                      <View style={styles.inlineTitle}>
                        <Text
                          style={[
                            styles.detailSectionTitle,
                            styles.groupDetailSectionTitle,
                          ]}
                        >
                          참여자
                        </Text>
                        <Text style={styles.sectionCount}>
                          {Math.min(
                            selectedGroup.members,
                            selectedGroup.maxMembers,
                          )}
                          /{selectedGroup.maxMembers}
                        </Text>
                      </View>
                      <MemberProfiles
                        members={selectedGroup.members}
                        maxMembers={selectedGroup.maxMembers}
                        letters={currentMemberLetters}
                        onInvite={() =>
                          selectedGroup.isDefault
                            ? newGroup()
                            : setPopup("invite")
                        }
                      />
                    </View>
                  )}
                  <View style={styles.ticketSection}>
                    <View style={styles.ticketSectionHeader}>
                      <Text
                        style={[
                          styles.detailSectionTitle,
                          styles.groupDetailSectionTitle,
                        ]}
                      >
                        공동 티켓
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="새 티켓"
                        onPress={startNewJoint}
                        style={({ pressed }) => [
                          styles.newTicketButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.newTicketButtonText}>
                          ＋ 새 티켓
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.filterRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="전체 티켓"
                        onPress={() => setMonthFilter(null)}
                        style={[
                          styles.filterButton,
                          !monthFilter && styles.filterActive,
                        ]}
                      >
                        <Text style={styles.filterText}>전체 티켓</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="월별 보기"
                        onPress={pickMonth}
                        style={[
                          styles.filterButton,
                          styles.monthButton,
                          monthFilter && styles.filterActive,
                        ]}
                      >
                        <Text style={styles.filterText}>
                          {monthFilter ? fmtDate(monthFilter) : "월별 보기"} ▾
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.ticketListHeading}>
                    <Text style={styles.ticketPeriodLabel}>
                      {monthFilter
                        ? `${fmtDate(monthFilter)} 기간`
                        : "전체 기간"}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                    contentContainerStyle={styles.ticketGrid}
                  >
                    {sortedTickets.map((ticket, index) => (
                      <TicketStub
                        key={`${ticket.sharedTicketId ?? ticket.date}`}
                        ticket={ticket}
                        groupName={selectedGroup.name}
                        index={index}
                        onPress={() => openTicketMembers(ticket)}
                      />
                    ))}
                    {sortedTickets.length === 0 && (
                      <Text style={styles.noTicketText}>
                        표시할 공동 티켓이 없어요.
                      </Text>
                    )}
                  </ScrollView>
                </ScrollView>
                <BottomNavigation
                  activeTab="group"
                  onSelect={(tab) => {
                    if (tab === "home") onOpenHome();
                    else if (tab === "my") onOpenMy();
                    else if (tab === "store") {
                      Alert.alert(
                        "스토어",
                        "스토어 화면은 이번 05 구현 범위에 포함되지 않았어요.",
                      );
                    }
                  }}
                />
              </>
            ) : page === "join" ? (
              <>
                <View style={styles.joinBody}>
                  <Text style={styles.joinHeading}>
                    {invite?.info.groupName}에 초대받았어요
                  </Text>
                  <Text style={styles.joinSubtitle}>
                    비공개 그룹 · 멤버 {invite?.info.memberCount}명
                  </Text>
                </View>
                <View style={styles.formBottom}>
                  {invite?.info.canJoin ? (
                    <TextButton text="그룹 참여하기" onPress={joinInvite} />
                  ) : (
                    <Text style={styles.joinSubtitle}>
                      이 그룹에 참여할 수 없어요.
                    </Text>
                  )}
                </View>
              </>
            ) : page === "kickSelect" ? (
              <>
                <ScrollView
                  style={styles.flex}
                  contentContainerStyle={styles.memberManagementContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    style={[styles.memberTabs, styles.memberManagementTabs]}
                  >
                    <Pressable
                      onPress={() => setMemberTab("active")}
                      style={[
                        styles.memberTab,
                        styles.memberManagementTab,
                        memberTab === "active" &&
                          styles.memberManagementTabSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberTabText,
                          styles.memberManagementTabText,
                          memberTab === "active" &&
                            styles.memberManagementTabTextActive,
                        ]}
                      >
                        참여 중 · {currentMemberLetters.length + 1}
                      </Text>
                      {memberTab === "active" && (
                        <View style={styles.memberManagementTabIndicator} />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => setMemberTab("removed")}
                      style={[
                        styles.memberTab,
                        styles.memberManagementTab,
                        memberTab === "removed" &&
                          styles.memberManagementTabSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberTabText,
                          styles.memberManagementTabText,
                          memberTab === "removed" &&
                            styles.memberManagementTabTextActive,
                        ]}
                      >
                        탈퇴 멤버 ·{" "}
                        {removedMembersByGroup[selectedGroup?.id ?? ""]
                          ?.length ?? 0}
                      </Text>
                      {memberTab === "removed" && (
                        <View style={styles.memberManagementTabIndicator} />
                      )}
                    </Pressable>
                  </View>
                  <View style={styles.memberManageList}>
                    {memberTab === "active"
                      ? currentMemberLetters.map((letter) => (
                          <View
                            key={`member-${letter}`}
                            style={[
                              styles.managedMemberRow,
                              styles.memberManagementCard,
                            ]}
                          >
                            <View
                              style={[
                                styles.jointAvatar,
                                styles.managedAvatar,
                                styles.memberManagementAvatar,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.jointAvatarText,
                                  styles.memberManagementAvatarText,
                                ]}
                              >
                                {letter}
                              </Text>
                            </View>
                            <View style={styles.managedMemberInfo}>
                              <Text
                                style={[
                                  styles.memberManageText,
                                  styles.memberManagementName,
                                ]}
                              >
                                멤버 {letter}
                              </Text>
                              <Text
                                style={[
                                  styles.managedMemberDate,
                                  styles.memberManagementDate,
                                ]}
                              >
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
                              style={[
                                styles.managedMemberMenu,
                                styles.memberManagementMenu,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.memberManageDots,
                                  styles.memberManagementDots,
                                ]}
                              >
                                ⋮
                              </Text>
                            </Pressable>
                          </View>
                        ))
                      : (
                          removedMembersByGroup[selectedGroup?.id ?? ""] ?? []
                        ).map((letter) => (
                          <View
                            key={`removed-${letter}`}
                            style={[
                              styles.managedMemberRow,
                              styles.memberManagementCard,
                            ]}
                          >
                            <View
                              style={[
                                styles.jointAvatar,
                                styles.managedAvatar,
                                styles.memberManagementAvatar,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.jointAvatarText,
                                  styles.memberManagementAvatarText,
                                ]}
                              >
                                {letter}
                              </Text>
                            </View>
                            <View style={styles.managedMemberInfo}>
                              <Text
                                style={[
                                  styles.memberManageText,
                                  styles.memberManagementName,
                                ]}
                              >
                                멤버 {letter}
                              </Text>
                              <Text
                                style={[
                                  styles.managedMemberDate,
                                  styles.memberManagementDate,
                                ]}
                              >
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
                            styles.memberManagementCard,
                            selected && styles.memberManageSelected,
                          ]}
                        >
                          <View
                            style={[
                              styles.jointAvatar,
                              styles.managedAvatar,
                              styles.memberManagementAvatar,
                            ]}
                          >
                            <Text
                              style={[
                                styles.jointAvatarText,
                                styles.memberManagementAvatarText,
                              ]}
                            >
                              {letter}
                            </Text>
                          </View>
                          <View style={styles.managedMemberInfo}>
                            <Text style={styles.memberManagementName}>
                              멤버 {letter}
                            </Text>
                            <Text style={styles.memberManagementDate}>
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
                  <Text style={[styles.formHeading, styles.jointDoneGroupName]}>
                    {selectedGroup.name}
                  </Text>
                  <View style={styles.createdCenter}>
                    <Text style={styles.jointDoneHeading}>
                      공동 티켓 발권 완료
                    </Text>
                    <View style={styles.createdPreview}>
                      <Text style={styles.createdTicketBrand}>MEMO:RE</Text>
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
                    text="공동 티켓 보기"
                    onPress={() => {
                      const date = validDate(jointDate);
                      const ticket = selectedGroup.tickets.find(
                        (entry) => entry.date === date,
                      );
                      if (ticket) void openTicketMembers(ticket);
                    }}
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
                  <Text style={styles.formHeading}>그룹을 만들었어요</Text>
                  <View style={styles.createdCenter}>
                    <Image
                      source={
                        groupCoverImages[createdGroup.id]
                          ? { uri: groupCoverImages[createdGroup.id] }
                          : groupDefaultMascot
                      }
                      style={styles.createdGroupCover}
                      resizeMode={
                        groupCoverImages[createdGroup.id] ? "cover" : "contain"
                      }
                    />
                    <Text style={styles.createdGroupName}>
                      {createdGroup.name}
                    </Text>
                    <Text style={styles.createdCaption}>
                      그룹방에서 새로운 기록을 시작해 보세요.
                    </Text>
                  </View>
                </View>
                <View style={[styles.formBottom, styles.createdActions]}>
                  <TextButton
                    text="그룹방 열기"
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
                  contentContainerStyle={[
                    styles.formContent,
                    page === "newGroup" && styles.newGroupContent,
                    page === "inviteLink" && styles.inviteLinkContent,
                  ]}
                  keyboardShouldPersistTaps="handled"
                >
                  {(page === "firstTicket" || page === "duplicate") && (
                    <Text style={styles.formHeading}>
                      {page === "firstTicket"
                        ? "첫 공동 티켓 만들기"
                        : "이미 기록이 있는 날짜예요"}
                    </Text>
                  )}
                  {page === "newGroup" && (
                    <View style={styles.newGroupForm}>
                      <View style={styles.newGroupNameBlock}>
                        <Text style={styles.newGroupLabel}>그룹 이름</Text>
                        <TextInput
                          accessibilityLabel="그룹 이름"
                          value={groupName}
                          onChangeText={setGroupName}
                          maxLength={GROUP_NAME_MAX}
                          autoCorrect={false}
                          placeholder="그룹 이름을 입력해 주세요"
                          placeholderTextColor="#A0A4AD"
                          style={styles.newGroupNameInput}
                        />
                        <Text style={styles.newGroupCounter}>
                          {groupName.length}/{GROUP_NAME_MAX}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="그룹 이미지 선택"
                        accessibilityHint="사진 보관함에서 그룹방 이미지를 선택합니다"
                        onPress={() => void chooseNewGroupCover()}
                        style={({ pressed }) => [
                          styles.newGroupCoverPicker,
                          pressed && styles.pressed,
                        ]}
                      >
                        {newGroupCoverUri ? (
                          <Image
                            source={{ uri: newGroupCoverUri }}
                            style={styles.newGroupCoverPreview}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={groupDefaultMascot}
                            style={styles.newGroupMascot}
                            resizeMode="contain"
                          />
                        )}
                        <Text
                          style={[
                            styles.newGroupCoverLabel,
                            newGroupCoverUri &&
                              styles.newGroupCoverLabelOnImage,
                          ]}
                        >
                          {newGroupCoverUri
                            ? "이미지를 눌러 변경"
                            : "새로운 기록의 시작"}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="그룹 만들기"
                        onPress={() => void createGroup()}
                        disabled={!groupName.trim()}
                        style={({ pressed }) => [
                          styles.newGroupCreateButton,
                          !groupName.trim() &&
                            styles.newGroupCreateButtonDisabled,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.newGroupCreateButtonText}>
                          그룹 만들기
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  {page === "inviteLink" && (
                    <View style={styles.inviteLinkForm}>
                      <Text style={styles.inviteLinkLabel}>초대 링크</Text>
                      <TextInput
                        accessibilityLabel="초대 링크"
                        value={inviteLink}
                        onChangeText={setInviteLink}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        placeholder="초대 링크를 입력해 주세요"
                        placeholderTextColor="#8A8E99"
                        style={styles.inviteLinkInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="초대 링크 확인"
                        onPress={confirmInviteLink}
                        style={({ pressed }) => [
                          styles.inviteLinkConfirmButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.inviteLinkConfirmText}>확인</Text>
                      </Pressable>
                    </View>
                  )}
                  {page === "renameGroup" && (
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
                        onPress={() => openDatePicker("first")}
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
                        onPress={() => openDatePicker("joint")}
                      />
                      <FormInput
                        label={`제목 · 선택 · 최대 ${JOINT_TITLE_MAX}자`}
                        value={jointTitle}
                        onChangeText={setJointTitle}
                        placeholder="제목"
                        maxLength={JOINT_TITLE_MAX}
                      />
                      {!selectedGroup?.isDefault && (
                        <>
                          <Text style={styles.formLabel}>참여 멤버</Text>
                          <View style={styles.jointMemberSummary}>
                            <View style={styles.jointAvatar}>
                              <Text style={styles.jointAvatarText}>나</Text>
                            </View>
                            {selectedJointMembers.map((letter) => (
                              <View key={letter} style={styles.jointAvatar}>
                                <Text style={styles.jointAvatarText}>
                                  {letter}
                                </Text>
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
                        </>
                      )}
                    </View>
                  )}
                  {page === "duplicate" && (
                    <Text style={styles.hintText}>
                      {fmtDate(duplicateDate)} 날짜에 공동 티켓이 이미 있어요.
                      같은 날짜에 중복 생성할 수 없어요.
                    </Text>
                  )}
                </ScrollView>
                {page !== "newGroup" && page !== "inviteLink" && (
                  <View style={styles.formBottom}>
                    {page === "firstTicket" && (
                      <TextButton
                        text="공동 티켓 만들기"
                        onPress={createGroup}
                      />
                    )}
                    {page === "newJoint" && (
                      <TextButton text="다음으로" onPress={createJoint} />
                    )}
                    {page === "renameGroup" && (
                      <TextButton text="변경 완료" onPress={saveGroupName} />
                    )}
                    {page === "duplicate" && (
                      <TextButton
                        text="날짜 다시 선택"
                        onPress={() => setPage("newJoint")}
                      />
                    )}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.flex} />
            )}
          </>
        )}

        {popup === "more" && isDetail && selectedGroup && (
          <View style={styles.moreMenuOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPopup("none")}
              accessibilityLabel="더보기 메뉴 닫기"
            />
            <View style={styles.moreMenu}>
              <View style={styles.moreMenuHeader}>
                <Text numberOfLines={1} style={styles.moreMenuGroupName}>
                  {selectedGroup.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="메뉴 닫기"
                  onPress={() => setPopup("none")}
                  style={styles.moreMenuClose}
                >
                  <Text style={styles.moreMenuCloseText}>×</Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹 멤버 관리"
                onPress={startKick}
                style={({ pressed }) => [
                  styles.moreMenuItem,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.moreMenuText}>멤버 관리</Text>
                <Text style={styles.moreMenuChevron}>›</Text>
              </Pressable>
              <View style={styles.moreDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹 이름 변경"
                onPress={startRenameGroup}
                style={({ pressed }) => [
                  styles.moreMenuItem,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.moreMenuText}>그룹 이름 변경</Text>
                <Text style={styles.moreMenuChevron}>›</Text>
              </Pressable>
              <View style={styles.moreDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹에서 나가기"
                onPress={() => setPopup("leaveConfirm")}
                style={({ pressed }) => [
                  styles.moreMenuItem,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.leaveText}>그룹 나가기</Text>
                <Text style={styles.moreMenuLeaveChevron}>›</Text>
              </Pressable>
            </View>
          </View>
        )}
        {popup === "leaveConfirm" && isDetail && (
          <View style={styles.inviteOverlay}>
            <Pressable
              onPress={() => setPopup("none")}
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
              <Text style={styles.inviteHeading}>초대 링크 만들기</Text>
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
              <Text style={styles.participantDialogHeading}>
                티켓 참여 멤버 추가
              </Text>
              <Text style={styles.participantDialogDescription}>
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
                        <Text
                          style={[
                            styles.jointAvatarText,
                            styles.participantAvatarText,
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>
                      <Text style={styles.participantMemberText}>
                        멤버 {letter}
                      </Text>
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
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <View style={styles.calendarBackdrop}>
          <Pressable
            accessibilityLabel="월 선택 닫기"
            onPress={() => setMonthPickerVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.calendarDialog}>
            <Text style={styles.calendarTitle}>월별 보기</Text>
            <Text style={styles.calendarSubtitle}>
              연도를 펼쳐 원하는 월을 선택해 주세요.
            </Text>
            <ScrollView
              style={styles.monthOptionsScroll}
              contentContainerStyle={styles.monthOptions}
              showsVerticalScrollIndicator={false}
            >
              {availableYears.map((year) => {
                const expanded = expandedMonthYear === year;
                const yearMonths = monthsByYear[year] ?? [];
                return (
                  <View key={year} style={styles.yearSection}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      onPress={() =>
                        setExpandedMonthYear(expanded ? null : year)
                      }
                      style={styles.yearOption}
                    >
                      <Text style={styles.yearOptionText}>{year}년</Text>
                      <Text style={styles.yearOptionCount}>
                        {yearMonths.length}개월 {expanded ? "⌃" : "⌄"}
                      </Text>
                    </Pressable>
                    {expanded && (
                      <View style={styles.yearMonths}>
                        {yearMonths.map((month) => {
                          const count = groupTicketsForDisplay.filter(
                            (ticket) => ticket.date.startsWith(month),
                          ).length;
                          const selected = monthFilter === month;
                          return (
                            <Pressable
                              key={month}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => {
                                setMonthFilter(month);
                                setMonthPickerVisible(false);
                              }}
                              style={[
                                styles.monthOption,
                                selected && styles.monthOptionSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.monthOptionText,
                                  selected && styles.monthOptionTextSelected,
                                ]}
                              >
                                {Number(month.slice(5, 7))}월
                              </Text>
                              <Text style={styles.monthOptionCount}>
                                {count}장 ›
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMonthPickerVisible(false)}
              style={styles.calendarCancel}
            >
              <Text style={styles.calendarCancelText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={datePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <View style={styles.calendarBackdrop}>
          <Pressable
            accessibilityLabel="달력 닫기"
            onPress={() => setDatePickerTarget(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.calendarDialog}>
            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 달"
                onPress={() =>
                  setCalendarMonth(
                    new Date(calendarYear, calendarMonthIndex - 1, 1),
                  )
                }
                style={styles.calendarArrow}
              >
                <Text style={styles.calendarArrowText}>‹</Text>
              </Pressable>
              <Text style={styles.calendarTitle}>
                {calendarYear}년 {calendarMonthIndex + 1}월
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="다음 달"
                accessibilityState={{ disabled: !canAdvanceCalendar }}
                disabled={!canAdvanceCalendar}
                onPress={() =>
                  setCalendarMonth(
                    new Date(calendarYear, calendarMonthIndex + 1, 1),
                  )
                }
                style={[
                  styles.calendarArrow,
                  !canAdvanceCalendar && styles.calendarArrowDisabled,
                ]}
              >
                <Text style={styles.calendarArrowText}>›</Text>
              </Pressable>
            </View>
            <View style={styles.calendarWeekdays}>
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <Text key={day} style={styles.calendarWeekday}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={styles.calendarDayCell}
                    />
                  );
                }
                const disabled = calendarDateIso(day) > dateToday();
                const selected = isSelectedCalendarDay(day);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityLabel={`${calendarYear}년 ${calendarMonthIndex + 1}월 ${day}일`}
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled}
                    onPress={() => chooseCalendarDay(day)}
                    style={styles.calendarDayCell}
                  >
                    <View
                      style={[
                        styles.calendarDay,
                        selected && styles.calendarDaySelected,
                        disabled && styles.calendarDayDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          selected && styles.calendarDayTextSelected,
                          disabled && styles.calendarDayTextDisabled,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDatePickerTarget(null)}
              style={styles.calendarCancel}
            >
              <Text style={styles.calendarCancelText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  handoffDescription: {
    color: C.text,
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
    backgroundColor: "#F2F3F6",
  },
  jointAvatarText: { color: "#303CB5", fontSize: 11, fontWeight: "600" },
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
  participantSelected: { borderColor: C.button, backgroundColor: "#FFFFFF" },
  participantAvatar: {
    width: 28,
    height: 28,
    backgroundColor: "#F2F3F6",
  },
  participantAvatarText: { color: "#2E3DB5" },
  participantDialogHeading: {
    color: "#000000",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  participantDialogDescription: {
    color: "#000000",
    fontSize: 14,
    lineHeight: 20,
  },
  participantMemberText: {
    color: "#000000",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  participantCheck: { marginLeft: "auto", color: "#000000", fontWeight: "700" },
  memberTabs: {
    flexDirection: "row",
    height: 38,
    borderRadius: 12,
    padding: 3,
    backgroundColor: C.pink,
  },
  memberManagementTabs: {
    height: 38,
    flexDirection: "row",
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E8ED",
    backgroundColor: "#FFFFFF",
    padding: 0,
  },
  memberTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  memberTabActive: { backgroundColor: C.button },
  memberTabText: { color: C.text, fontSize: 11, fontWeight: "500" },
  memberManagementTab: { position: "relative", borderRadius: 0 },
  memberManagementTabSelected: { backgroundColor: "transparent" },
  memberManagementTabText: { fontSize: 11, color: "#7C8292" },
  memberManagementTabTextActive: { color: "#252B45", fontWeight: "700" },
  memberManagementTabIndicator: {
    position: "absolute",
    left: "20%",
    right: "20%",
    bottom: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#EC806F",
  },
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
  memberManagementCard: {
    minHeight: 66,
    borderRadius: 14,
    borderColor: "#E7E8ED",
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    gap: 12,
  },
  memberManagementAvatar: { backgroundColor: "#F2F3F6" },
  memberManagementAvatarText: { color: "#303CB5" },
  managedAvatar: { width: 32, height: 32, borderRadius: 16 },
  managedMemberInfo: { flex: 1, gap: 3 },
  managedMemberDate: { color: C.muted, fontSize: 10 },
  memberManagementName: { color: "#252B45", fontSize: 14, fontWeight: "600" },
  memberManagementDate: { color: "#7C8292", fontSize: 10, lineHeight: 14 },
  memberManagementMenu: { width: 30 },
  memberManagementDots: { color: "#7C8292", fontSize: 20 },
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
    color: C.text,
    fontSize: 31,
    lineHeight: 40,
  },
  jointDoneGroupName: { color: C.text },
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
  createdGroupCover: {
    width: 220,
    height: 140,
    borderRadius: 16,
    backgroundColor: "#F2F3F6",
  },
  createdGroupName: {
    color: C.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  createdActions: {
    marginTop: "auto",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
  },
  flex: { flex: 1 },
  safe: {
    flex: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: C.canvas,
  },
  groupsSafe: { backgroundColor: "#FFFFFF" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  homeTop: {
    height: 59,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 9,
  },
  notificationButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBody: {
    width: 14,
    height: 15,
    borderWidth: 1.8,
    borderColor: "#252B45",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  bellBase: {
    position: "absolute",
    bottom: 8,
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#252B45",
  },
  bellClapper: {
    position: "absolute",
    bottom: 5,
    width: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#252B45",
  },
  logo: { width: 132, height: 46 },
  homeContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 26,
    backgroundColor: "#FFFFFF",
  },
  groupPageTitle: {
    marginTop: 10,
    marginBottom: 14,
    color: "#252B45",
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "500",
  },
  personalCard: {
    width: "100%",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 14,
  },
  personalAvatar: {
    width: 42,
    height: 42,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F3F6",
  },
  personalAvatarText: {
    color: "#2E3DB5",
    fontSize: 14,
    fontWeight: "600",
  },
  personalCopy: { flex: 1, gap: 2 },
  personalTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    color: "#252B45",
  },
  personalSub: { fontSize: 11, lineHeight: 16, color: "#78819A" },
  groupSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 23,
    marginBottom: 20,
  },
  groupHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  myGroupsHeading: {
    color: "#252B45",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
  },
  newGroupButton: {
    minWidth: 102,
    height: 36,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    backgroundColor: "#2E3DB5",
  },
  newGroupButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "500" },
  inviteLinkEntryButton: {
    minWidth: 100,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDE3ED",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
  },
  inviteLinkEntryText: { color: C.primary, fontSize: 11, fontWeight: "500" },
  sectionHeading: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  groupCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 36,
  },
  groupCard: {
    width: "47.5%",
  },
  groupCoverButton: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F3F6",
    borderRadius: 13,
    overflow: "hidden",
  },
  groupCoverImage: { width: "100%", height: "100%" },
  groupCardInfo: {
    minHeight: 58,
    paddingTop: 8,
    gap: 2,
  },
  groupCardTitle: {
    color: "#252B45",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  groupCardMembers: { color: "#78819A", fontSize: 10, lineHeight: 14 },
  groupCardDate: { color: "#2E3DB5", fontSize: 9, lineHeight: 13 },
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
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: C.nav,
  },
  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#352722",
    fontWeight: "400",
    textAlign: "center",
  },
  tabActive: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FFFDF8",
    fontWeight: "700",
    textAlign: "center",
  },
  detailHeader: {
    height: 56,
    marginBottom: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupDetailHeader: {
    height: 48,
    marginBottom: 4,
    paddingHorizontal: 12,
    gap: 5,
  },
  memberManagementHeader: {
    height: 48,
    marginBottom: 4,
    paddingHorizontal: 12,
    gap: 10,
  },
  newGroupHeader: {
    height: 48,
    marginBottom: 4,
    paddingHorizontal: 12,
    gap: 5,
  },
  newGroupHeaderSpacer: { width: 22 },
  backBox: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backLabel: { fontSize: 27, color: C.primary, lineHeight: 32, marginTop: -3 },
  groupDetailBackBox: {
    width: 22,
    height: 38,
    borderWidth: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
  },
  detailHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    color: C.text,
  },
  groupDetailHeaderTitle: { color: C.text, fontSize: 16, fontWeight: "600" },
  memberManagementHeaderTitle: {
    color: "#252B45",
    fontSize: 16,
    fontWeight: "600",
  },
  newGroupHeaderTitle: { textAlign: "center" },
  ellipsisBox: {
    width: 38,
    height: 38,
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
  groupDetailEllipsisBox: { width: 30 },
  groupDetailEllipsis: { color: C.text, letterSpacing: 0.6 },
  detailContent: {
    paddingHorizontal: 13,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  groupRoomCover: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2F3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  groupRoomCoverImage: { width: "100%", height: "100%" },
  groupRoomName: {
    marginTop: -4,
    color: C.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "700",
  },
  memberSection: { gap: 10 },
  inlineTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    color: C.text,
  },
  groupDetailSectionTitle: { color: C.text },
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
  ticketSection: { gap: 12 },
  ticketSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  newTicketButton: {
    height: 36,
    minWidth: 104,
    borderRadius: 20,
    backgroundColor: C.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  newTicketButtonText: { color: C.surface, fontSize: 12, fontWeight: "600" },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterButton: {
    height: 34,
    minWidth: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: C.surface,
  },
  filterActive: { backgroundColor: "#F4E5DF", borderColor: "#F4E5DF" },
  monthButton: { minWidth: 100 },
  filterText: { color: C.text, fontSize: 12, fontWeight: "600" },
  ticketListHeading: { marginTop: -2 },
  ticketPeriodLabel: { color: C.detailMuted, fontSize: 11, lineHeight: 16 },
  ticketGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingRight: 16,
  },
  ticketCard: { width: 92, alignItems: "center" },
  ticketCardFace: {
    width: "100%",
    height: 144,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
    justifyContent: "space-between",
  },
  ticketCardDate: {
    color: "#252B45",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
  },
  ticketGroupName: { color: "#252B45", fontSize: 11, lineHeight: 15 },
  ticketCardTitle: {
    width: "100%",
    marginTop: 6,
    color: C.text,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  ticketCardParticipants: {
    marginTop: 3,
    color: C.detailMuted,
    fontSize: 9,
    lineHeight: 13,
  },
  memberTicketContent: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 30,
    gap: 16,
  },
  memberTicketSubtitle: {
    marginTop: 4,
    color: C.detailMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  memberTicketRow: { width: "100%", alignItems: "center" },
  memberTicketPreviewButton: { width: "100%", alignItems: "center" },
  emptyMemberTicketSlot: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.border,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyMemberTicketPlus: { color: C.muted, fontSize: 23, lineHeight: 28 },
  emptyMemberTicketText: { color: C.detailMuted, fontSize: 12 },
  ticketDetailContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  ticketCreator: { alignSelf: "flex-start", gap: 3, marginBottom: 10 },
  ticketCreatorLabel: { color: C.detailMuted, fontSize: 11, lineHeight: 16 },
  ticketCreatorName: {
    color: C.primary,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  ticketDetailStage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  ticketPreviewCard: {
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9DDE4",
    backgroundColor: "#F1F2F5",
    overflow: "hidden",
    shadowColor: "#202431",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketBackNoteCard: {
    minHeight: 180,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C9CCD2",
    backgroundColor: "#FFFFFF",
    shadowColor: "#202431",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketBackNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketBackNoteLabel: {
    color: "#0750ED",
    fontSize: 8,
    lineHeight: 12,
    fontWeight: "600",
  },
  ticketBackNoteDate: { color: "#767A85", fontSize: 9, lineHeight: 12 },
  ticketBackNoteText: {
    color: "#282B33",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 17,
  },
  ticketFlipHint: {
    color: C.detailMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingTop: 10,
  },
  ticketSidesContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 10,
  },
  ticketSideLabel: {
    alignSelf: "flex-start",
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 8,
  },
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
  newGroupContent: {
    paddingHorizontal: 13,
    paddingTop: 6,
    paddingBottom: 28,
    gap: 0,
  },
  inviteLinkContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 0,
  },
  inviteLinkForm: { width: "100%" },
  inviteLinkLabel: {
    color: C.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  inviteLinkInput: {
    height: 42,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E9ED",
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: C.text,
    fontSize: 14,
  },
  inviteLinkConfirmButton: {
    alignSelf: "flex-end",
    width: 100,
    height: 44,
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: C.button,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteLinkConfirmText: { color: C.surface, fontSize: 13, fontWeight: "600" },
  newGroupForm: { width: "100%" },
  newGroupNameBlock: { gap: 3 },
  newGroupLabel: {
    color: C.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  newGroupNameInput: {
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E9ED",
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: C.text,
    fontSize: 14,
  },
  newGroupCounter: {
    marginTop: 6,
    color: C.detailMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  newGroupCoverPicker: {
    height: 150,
    marginTop: 66,
    borderRadius: 22,
    backgroundColor: "#F2F3F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  newGroupMascot: { width: 116, height: 64 },
  newGroupCoverPreview: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  newGroupCoverLabel: {
    marginTop: 4,
    color: C.primary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
  newGroupCoverLabelOnImage: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    color: C.surface,
    backgroundColor: "rgba(37,43,69,0.65)",
  },
  newGroupCreateButton: {
    alignSelf: "flex-end",
    minWidth: 126,
    height: 48,
    marginTop: 54,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: C.button,
    alignItems: "center",
    justifyContent: "center",
  },
  newGroupCreateButtonDisabled: { opacity: 0.45 },
  newGroupCreateButtonText: {
    color: C.surface,
    fontSize: 12,
    fontWeight: "600",
  },
  formHeading: {
    fontSize: 24,
    color: C.primary,
    lineHeight: 32,
    fontWeight: "600",
  },
  formStack: { gap: 18 },
  formLabel: { fontSize: 14, color: C.text, fontWeight: "500" },
  formInput: {
    height: 51,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    color: C.text,
    paddingHorizontal: 15,
    fontSize: 14,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateInputText: { color: C.text, fontSize: 14 },
  dateInputIcon: { color: C.muted, fontSize: 17 },
  calendarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(40, 32, 27, 0.36)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  calendarDialog: {
    width: "100%",
    maxWidth: 350,
    borderRadius: 20,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    elevation: 12,
    shadowColor: "#44322A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  calendarSubtitle: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  calendarArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarArrowDisabled: { opacity: 0.35 },
  calendarArrowText: { color: C.text, fontSize: 24, lineHeight: 28 },
  calendarWeekdays: { flexDirection: "row", marginBottom: 4 },
  calendarWeekday: {
    width: "14.2857%",
    textAlign: "center",
    color: C.detailMuted,
    fontSize: 11,
    lineHeight: 28,
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDayCell: {
    width: "14.2857%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaySelected: { backgroundColor: C.button },
  calendarDayDisabled: { opacity: 0.36 },
  calendarDayText: { color: C.text, fontSize: 12 },
  calendarDayTextSelected: { color: C.surface, fontWeight: "700" },
  calendarDayTextDisabled: { color: C.muted },
  calendarCancel: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  calendarCancelText: { color: C.detailMuted, fontSize: 13 },
  monthOptionsScroll: { maxHeight: 300 },
  monthOptions: { gap: 8, paddingVertical: 4 },
  yearSection: { gap: 6 },
  yearOption: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: "#F4E5DF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  yearOptionText: { color: C.text, fontSize: 14, fontWeight: "700" },
  yearOptionCount: { color: C.muted, fontSize: 12 },
  yearMonths: { gap: 6, paddingLeft: 12 },
  monthOption: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.canvas,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthOptionSelected: {
    borderColor: C.accent,
    backgroundColor: "#F4E5DF",
  },
  monthOptionText: { color: C.text, fontSize: 14, fontWeight: "600" },
  monthOptionTextSelected: { color: C.primary },
  monthOptionCount: { color: C.muted, fontSize: 12 },
  formBottom: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  moreMenuOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: "flex-end",
    backgroundColor: "rgba(238,241,248,0.82)",
  },
  moreMenu: {
    width: "80%",
    maxWidth: 280,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    elevation: 10,
    shadowColor: "#252B45",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  moreMenuHeader: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  moreMenuGroupName: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  moreMenuClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  moreMenuCloseText: { color: C.detailMuted, fontSize: 24, lineHeight: 28 },
  moreMenuItem: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  moreMenuText: { color: C.text, fontSize: 13, fontWeight: "500" },
  moreMenuChevron: { color: C.detailMuted, fontSize: 22, lineHeight: 26 },
  moreMenuLeaveChevron: { color: C.accent, fontSize: 22, lineHeight: 26 },
  leaveText: { color: C.accent, fontSize: 13, fontWeight: "500" },
  moreDivider: { backgroundColor: "#E7E8ED", height: 1, marginHorizontal: 8 },
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
  memberManagementContent: {
    paddingHorizontal: 8,
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
