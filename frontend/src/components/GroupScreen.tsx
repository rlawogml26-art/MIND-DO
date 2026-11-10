import {
  GROUP_NAME_MAX,
  GROUP_MAX_MEMBERS,
  USER_GROUP_MAX,
  JOINT_TITLE_MAX,
  groupNameSchema,
  jointTitleSchema,
} from "@mind-do/shared";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type GroupPage =
  | "groups"
  | "newGroup"
  | "group"
  | "newJoint"
  | "duplicate"
  | "invite"
  | "inviteSent"
  | "join"
  | "full";

type JointTicket = {
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
};

type GroupScreenProps = {
  onOpenHome: () => void;
  onOpenTickets: () => void;
  onOpenMy: () => void;
  groups: DemoGroup[];
  onGroupsChange: Dispatch<SetStateAction<DemoGroup[]>>;
};

const colors = {
  canvas: "#FFF8EF",
  surface: "#FFFDF8",
  brown: "#654C40",
  muted: "#987966",
  border: "#E8D8CA",
  soft: "#F0C8BE",
  error: "#B85E5C",
};

// 피그마에 표시된 예시 기록입니다. 실제 DB 데이터가 아닙니다.
export const initialGroups: DemoGroup[] = [
  {
    id: "sample-weekend",
    name: "우리의 주말",
    members: 3,
    tickets: [
      {
        date: "2026-10-30",
        title: "가을 산책",
        completed: 1,
        invitees: 3,
      },
      {
        date: "2026-10-24",
        title: "함께한 하루",
        completed: 3,
        invitees: 3,
      },
    ],
  },
  { id: "sample-solo", name: "혼자 남긴 기억", members: 1, tickets: [] },
];

import ticketIcon from "../../assets/images/memore/ticket-icon.png";

function localToday(): string {
  const now = new Date();
  return [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function displayDate(date: string): string {
  return date.replace(/-/g, ".");
}

function parseDate(value: string): string | null {
  const match = /^(\d{4})[.-](\d{2})[.-](\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function PrimaryButton({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary && styles.secondaryButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionLabel, secondary && styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ListRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowSubtitle}>{subtitle}</Text>
    </>
  );
  if (!onPress) return <View style={styles.listRow}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  keyboardType?: "default" | "numbers-and-punctuation";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        keyboardType={keyboardType}
        autoCorrect={false}
      />
    </View>
  );
}

export default function GroupScreen({
  onOpenHome,
  onOpenTickets,
  onOpenMy,
  groups,
  onGroupsChange: setGroups,
}: GroupScreenProps) {
  const [page, setPage] = useState<GroupPage>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("sample-weekend");
  const [groupName, setGroupName] = useState("");
  const [firstDate, setFirstDate] = useState(displayDate(localToday()));
  const [firstTitle, setFirstTitle] = useState("");
  const [jointDate, setJointDate] = useState(displayDate(localToday()));
  const [jointTitle, setJointTitle] = useState("");
  const [duplicateDate, setDuplicateDate] = useState("");
  const [joinedDemoIds, setJoinedDemoIds] = useState<string[]>([]);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0];

  function selectGroup(groupId: string) {
    setSelectedGroupId(groupId);
    setPage("group");
  }

  function goBack() {
    const previous: Record<GroupPage, GroupPage | null> = {
      groups: null,
      newGroup: "groups",
      group: "groups",
      newJoint: "group",
      duplicate: "newJoint",
      invite: "group",
      inviteSent: "invite",
      join: "inviteSent",
      full: "join",
    };
    const back = previous[page];
    if (back) setPage(back);
    else onOpenHome();
  }

  function checkedDate(value: string): string | null {
    const parsed = parseDate(value);
    if (!parsed) {
      Alert.alert(
        "날짜를 확인해 주세요",
        "날짜를 YYYY.MM.DD 형식으로 입력해 주세요.",
      );
      return null;
    }
    if (parsed > localToday()) {
      Alert.alert(
        "미래 날짜는 선택할 수 없어요",
        "오늘 또는 지난 날짜에만 티켓을 만들 수 있어요.",
      );
      return null;
    }
    return parsed;
  }

  function createGroup() {
    const name = groupName.trim();
    if (!name) {
      Alert.alert(
        "그룹 이름을 입력해 주세요",
        `그룹 이름은 최대 ${GROUP_NAME_MAX}자까지 입력할 수 있어요.`,
      );
      return;
    }
    if (!groupNameSchema.safeParse(name).success) {
      Alert.alert(
        "그룹 이름 확인",
        `그룹 이름은 최대 ${GROUP_NAME_MAX}자까지 입력할 수 있어요.`,
      );
      return;
    }
    if (
      groups.filter((group) => group.id !== "sample-solo").length >=
      USER_GROUP_MAX
    ) {
      Alert.alert(
        "그룹 개수 확인",
        "기본 1인 그룹 외에는 최대 4개까지 참여할 수 있어요.",
      );
      return;
    }
    if (!jointTitleSchema.safeParse(firstTitle).success) {
      Alert.alert(
        "제목 확인",
        `공동 티켓 제목은 최대 ${JOINT_TITLE_MAX}자예요.`,
      );
      return;
    }
    const date = checkedDate(firstDate);
    if (!date) return;
    const newGroup: DemoGroup = {
      id: `demo-${Date.now()}`,
      name,
      members: 1,
      tickets: [
        {
          date,
          title: firstTitle.trim(),
          completed: 0,
          invitees: 1,
        },
      ],
    };
    setGroups((previous) => [...previous, newGroup]);
    setSelectedGroupId(newGroup.id);
    setPage("group");
    Alert.alert(
      "시연용 그룹 생성",
      "화면 안에서만 그룹과 공동 티켓이 추가됐어요. 서버에는 저장되지 않아요.",
    );
  }

  function createJointTicket() {
    if (!selectedGroup) return;
    if (!jointTitleSchema.safeParse(jointTitle).success) {
      Alert.alert(
        "제목 확인",
        `공동 티켓 제목은 최대 ${JOINT_TITLE_MAX}자예요.`,
      );
      return;
    }
    const date = checkedDate(jointDate);
    if (!date) return;
    if (selectedGroup.tickets.some((ticket) => ticket.date === date)) {
      setDuplicateDate(date);
      setPage("duplicate");
      return;
    }
    setGroups((previous) =>
      previous.map((group) =>
        group.id === selectedGroup.id
          ? {
              ...group,
              tickets: [
                {
                  date,
                  title: jointTitle.trim(),
                  completed: 0,
                  invitees: 1,
                },
                ...group.tickets,
              ],
            }
          : group,
      ),
    );
    setPage("group");
    Alert.alert(
      "공동 티켓 생성",
      "시연용 공동 티켓이 추가됐어요. 실제 발권이나 저장은 아직 연결되지 않았어요.",
    );
  }

  function demoJoin() {
    if (!selectedGroup) return;
    if (selectedGroup.members >= GROUP_MAX_MEMBERS) {
      setPage("full");
      return;
    }
    if (joinedDemoIds.includes(selectedGroup.id)) {
      Alert.alert(
        "참여 화면 시연",
        "이 그룹은 이미 시연용 참여를 한 번 진행했어요.",
      );
      setPage("groups");
      return;
    }
    setGroups((previous) =>
      previous.map((group) =>
        group.id === selectedGroup.id
          ? { ...group, members: group.members + 1 }
          : group,
      ),
    );
    setJoinedDemoIds((previous) => [...previous, selectedGroup.id]);
    setPage("groups");
    Alert.alert(
      "그룹 참여 시연",
      "그룹 인원이 화면에서만 변경됐어요. 실제 초대나 계정 가입은 진행되지 않았어요.",
    );
  }

  const titles: Record<GroupPage, string> = {
    groups: "함께하는 그룹",
    newGroup: "첫 공동 티켓 만들기",
    group: selectedGroup?.name ?? "그룹",
    newJoint: "날짜별 공동 티켓 생성",
    duplicate: "이미 기록이 있는 날짜예요",
    invite: "함께 기록할 사람 초대",
    inviteSent: "초대 링크 공유",
    join: `${selectedGroup?.name ?? "그룹"}에 초대받았어요`,
    full: "그룹 정원이 찼어요",
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            onPress={goBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerBrand}>MEMO:RE</Text>
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={styles.heading}>
            {titles[page]}
          </Text>

          {page === "groups" && (
            <View style={styles.stack}>
              <Text style={styles.description}>
                우리끼리만 열어 보는 비공개 기록
              </Text>
              {groups.map((group) => (
                <ListRow
                  key={group.id}
                  title={group.name}
                  subtitle={
                    group.members === 1
                      ? `멤버 1명 · 나만의 기록`
                      : `멤버 ${group.members}명 · 날짜별 기록 ${group.tickets.length}개`
                  }
                  onPress={() => selectGroup(group.id)}
                />
              ))}
            </View>
          )}

          {page === "newGroup" && (
            <View style={styles.stack}>
              <Text style={styles.description}>
                그룹과 첫 번째 날짜 기록을 함께 만들어요.
              </Text>
              <Field
                label={`그룹 이름 · 최대 ${GROUP_NAME_MAX}자`}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="그룹 이름을 입력해 주세요"
                maxLength={GROUP_NAME_MAX}
              />
              <Field
                label="날짜"
                value={firstDate}
                onChangeText={setFirstDate}
                placeholder="YYYY.MM.DD"
                keyboardType="numbers-and-punctuation"
              />
              <Field
                label={`제목 · 선택 (최대 ${JOINT_TITLE_MAX}자)`}
                value={firstTitle}
                onChangeText={setFirstTitle}
                placeholder="선택 사항"
                maxLength={JOINT_TITLE_MAX}
              />
              <ListRow title="참여자" subtitle="나 · 자동 연동 (시연용)" />
            </View>
          )}

          {page === "group" && selectedGroup && (
            <View style={styles.stack}>
              <Text style={styles.description}>
                비공개 · 멤버 {selectedGroup.members} / {GROUP_MAX_MEMBERS}명
              </Text>
              {selectedGroup.tickets.map((ticket) => (
                <ListRow
                  key={ticket.date}
                  title={`${displayDate(ticket.date)} · ${ticket.title || "제목 없음"}`}
                  subtitle={
                    ticket.completed === ticket.invitees
                      ? `완성 ${ticket.completed}명`
                      : `완성 ${ticket.completed}명 · 미완성 ${ticket.invitees - ticket.completed}명`
                  }
                  onPress={() =>
                    Alert.alert(
                      "공동 티켓",
                      "공동 티켓 상세·개인 슬롯 기능은 서버와 연결한 뒤에 열 수 있어요.",
                    )
                  }
                />
              ))}
              <ListRow
                title="그룹 관리"
                subtitle="멤버 · 기록 연결 · 나가기"
                onPress={() =>
                  Alert.alert(
                    "그룹 관리",
                    "이번 시연 범위는 그룹 생성과 참여 9개 화면이에요.",
                  )
                }
              />
              <ListRow
                title="함께 기록할 사람 초대"
                subtitle="초대 링크 · 초대자 관리"
                onPress={() => {
                  if (selectedGroup.id === "sample-solo") {
                    setPage("newGroup");
                    return;
                  }
                  setPage("invite");
                }}
              />
            </View>
          )}

          {page === "newJoint" && selectedGroup && (
            <View style={styles.stack}>
              <Text style={styles.description}>
                선택한 날짜로 공동 기록이 열려요.{"\n"}생성 후 날짜는 바꿀 수
                없어요.
              </Text>
              <Field
                label="날짜"
                value={jointDate}
                onChangeText={setJointDate}
                placeholder="YYYY.MM.DD"
                keyboardType="numbers-and-punctuation"
              />
              <Field
                label={`제목 · 선택 (최대 ${JOINT_TITLE_MAX}자)`}
                value={jointTitle}
                onChangeText={setJointTitle}
                placeholder="선택 사항"
                maxLength={JOINT_TITLE_MAX}
              />
              <ListRow
                title="그룹명 · 참여자"
                subtitle={`${selectedGroup.name} · 멤버 ${selectedGroup.members}명 / 자동`}
              />
            </View>
          )}

          {page === "duplicate" && (
            <Text style={styles.description}>
              같은 그룹에는 날짜별 공동 티켓을 하나만 만들 수 있어요.
              {duplicateDate
                ? `\n선택한 날짜: ${displayDate(duplicateDate)}`
                : ""}
            </Text>
          )}

          {page === "invite" && selectedGroup && (
            <View style={styles.stack}>
              <Text style={styles.description}>
                초대받은 사람만 그룹에 참여할 수 있어요.{"\n"}현재{" "}
                {selectedGroup.members}명 · 최대 {GROUP_MAX_MEMBERS}명
              </Text>
              <ListRow
                title="초대 링크"
                subtitle="링크를 전달해 함께 기록하세요 (시연용)"
              />
              <ListRow
                title="초대자 관리"
                subtitle="공동 티켓 생성자가 관리"
                onPress={() =>
                  Alert.alert(
                    "초대자 관리",
                    "초대자 선택·추가·제외는 실제 공동 티켓 API 연결 후 구현해요.",
                  )
                }
              />
            </View>
          )}

          {page === "inviteSent" && (
            <Text style={styles.description}>
              기기의 공유 메뉴로 링크를 전달해 주세요.{"\n"}
              현재는 실제 초대 링크를 발급하지 않는 화면 시연이에요.
            </Text>
          )}

          {page === "join" && selectedGroup && (
            <Text style={styles.description}>
              현재 멤버 {selectedGroup.members}명 · 비공개 그룹{"\n"}
              참여하면 이 그룹의 공동 기록을 볼 수 있어요.
            </Text>
          )}

          {page === "full" && (
            <Text style={styles.description}>
              그룹은 최대 {GROUP_MAX_MEMBERS}명까지 참여할 수 있어요.{"\n"}이
              그룹에는 더 참여할 수 없어요.
            </Text>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {page === "groups" && (
            <PrimaryButton
              label="새 그룹과 첫 티켓 만들기"
              onPress={() => {
                setGroupName("");
                setFirstDate(displayDate(localToday()));
                setFirstTitle("");
                setPage("newGroup");
              }}
            />
          )}
          {page === "newGroup" && (
            <PrimaryButton
              label="그룹과 공동 티켓 생성"
              onPress={createGroup}
            />
          )}
          {page === "group" && (
            <PrimaryButton
              label="다른 날짜의 공동 티켓 만들기"
              onPress={() => {
                setJointDate(displayDate(localToday()));
                setJointTitle("");
                setPage("newJoint");
              }}
            />
          )}
          {page === "newJoint" && (
            <>
              <PrimaryButton
                label="공동 티켓 생성"
                onPress={createJointTicket}
              />
              <PrimaryButton
                secondary
                label="같은 날짜가 이미 있는 경우"
                onPress={() => {
                  setDuplicateDate(
                    selectedGroup?.tickets[0]?.date ?? localToday(),
                  );
                  setPage("duplicate");
                }}
              />
            </>
          )}
          {page === "duplicate" && (
            <>
              <PrimaryButton
                label="기존 공동 티켓 열기"
                onPress={() => setPage("group")}
              />
              <PrimaryButton
                secondary
                label="날짜 다시 선택"
                onPress={() => setPage("newJoint")}
              />
            </>
          )}
          {page === "invite" && (
            <PrimaryButton
              label="초대 링크 공유"
              onPress={() => setPage("inviteSent")}
            />
          )}
          {page === "inviteSent" && (
            <>
              <PrimaryButton
                label="공동 티켓으로 돌아가기"
                onPress={() => setPage("group")}
              />
              <PrimaryButton
                secondary
                label="초대받은 화면 미리보기"
                onPress={() => setPage("join")}
              />
            </>
          )}
          {page === "join" && (
            <>
              <PrimaryButton label="그룹 참여하기" onPress={demoJoin} />
              <PrimaryButton
                secondary
                label="정원 초과 안내"
                onPress={() => setPage("full")}
              />
            </>
          )}
          {page === "full" && (
            <PrimaryButton
              label="내 그룹으로"
              onPress={() => setPage("groups")}
            />
          )}
        </View>

        {page === "groups" && (
          <View style={styles.bottomNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="홈"
              onPress={onOpenHome}
              style={styles.navButton}
            >
              <Text style={styles.navText}>Home</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="그룹"
              accessibilityState={{ selected: true }}
              onPress={() => setPage("groups")}
              style={styles.navButton}
            >
              <Text style={[styles.navText, styles.activeNavText]}>GROUP</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="티켓 생성"
              onPress={onOpenTickets}
              style={styles.ticketButton}
            >
              <Image
                source={ticketIcon}
                resizeMode="contain"
                style={styles.ticketImage}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="스토어"
              onPress={() =>
                Alert.alert("스토어", "아직 연결되지 않은 기능이에요.")
              }
              style={styles.navButton}
            >
              <Text style={styles.navText}>Store</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="마이페이지"
              onPress={onOpenMy}
              style={styles.navButton}
            >
              <Text style={styles.navText}>My</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  header: {
    minHeight: 80,
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: { width: 24, height: 36, justifyContent: "center" },
  backText: { color: colors.brown, fontSize: 28, lineHeight: 32 },
  headerBrand: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 16,
  },
  heading: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.brown,
    fontWeight: "400",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    color: colors.muted,
  },
  stack: { gap: 16 },
  listRow: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: 6,
  },
  rowTitle: {
    color: colors.brown,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  rowSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  field: { gap: 8 },
  fieldLabel: {
    color: colors.brown,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  fieldInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.brown,
    fontSize: 14,
  },
  actions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
    backgroundColor: colors.canvas,
  },
  actionButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: colors.brown,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  actionLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  secondaryButton: { backgroundColor: colors.surface },
  secondaryLabel: { color: colors.brown },
  pressed: { opacity: 0.75 },
  bottomNav: {
    backgroundColor: colors.soft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 24,
  },
  navButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketButton: {
    width: 100,
    height: 100,
    marginTop: -30,
    marginBottom: -34,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CF897C",
  },
  ticketImage: { width: 79, height: 78 },
  navText: { color: colors.brown, fontSize: 12, fontWeight: "500" },
  activeNavText: { textDecorationLine: "underline" },
});
