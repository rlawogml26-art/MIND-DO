import { ErrorCode, type LoginResponse } from "@mind-do/shared";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getIssuedTicket, type IssuedTicket } from "../storage/issued-tickets";
import HomeScreen from "../components/HomeScreen";
import MyPageScreen, { type Profile } from "../components/MyPageScreen";
import TicketCreationScreen from "../components/TicketEditor";
import LoginScreen from "../components/LoginScreen";
import GroupScreen, {
  kstDate,
  type DemoGroup,
} from "../components/GroupScreen";
import { ApiError, getMyGroups } from "../lib/api";

type RootScreen = "home" | "group" | "my" | "dateSelection" | "ticket";
const GROUP_CACHE_KEY = "@memore/groups_with_tickets_v1";

function groupCacheOwner(user: LoginResponse) {
  const root = user as unknown as Record<string, unknown>;
  const nested =
    root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : {};
  const identity = [
    root.userId,
    root.id,
    root.email,
    root.username,
    nested.userId,
    nested.id,
    nested.email,
    nested.username,
  ].find((value) => typeof value === "string" || typeof value === "number");
  return identity === undefined
    ? (JSON.stringify(user) ?? "unknown-user")
    : String(identity);
}

async function loadStoredGroups(owner: string): Promise<DemoGroup[]> {
  try {
    const encodedOwner = encodeURIComponent(owner);
    const accountKey = `${GROUP_CACHE_KEY}:${encodedOwner}`;
    let raw = await AsyncStorage.getItem(accountKey);
    if (!raw) {
      raw = await AsyncStorage.getItem(
        `@memore/group_tickets_by_account_v1:${encodedOwner}`,
      );
    }
    if (!raw) {
      // 이전 버전의 캐시에 저장된 그룹과 티켓을 그대로 마이그레이션합니다.
      raw = await AsyncStorage.getItem("@memore/groups_with_tickets_v1");
    }
    if (!raw) {
      const keys = await AsyncStorage.getAllKeys();
      const legacyKey = keys.find(
        (key) =>
          (key.startsWith("@memore/groups_by_account_v1:") ||
            key.startsWith("@memore/group_tickets_by_group_v1:")) &&
          key.includes(encodedOwner),
      );
      if (legacyKey) raw = await AsyncStorage.getItem(legacyKey);
    }
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is DemoGroup => {
      if (!value || typeof value !== "object") return false;
      const group = value as Partial<DemoGroup>;
      return (
        typeof group.id === "string" &&
        typeof group.name === "string" &&
        Array.isArray(group.tickets)
      );
    });
  } catch {
    return [];
  }
}

async function saveStoredGroups(owner: string, groups: DemoGroup[]) {
  await AsyncStorage.setItem(
    `${GROUP_CACHE_KEY}:${encodeURIComponent(owner)}`,
    JSON.stringify(groups),
  );
}

function mergeServerGroups(
  serverGroups: DemoGroup[],
  currentGroups: DemoGroup[],
  cachedGroups: DemoGroup[],
): DemoGroup[] {
  const currentById = new Map(
    currentGroups.map((group) => [group.id, group] as const),
  );
  const cachedById = new Map(
    cachedGroups.map((group) => [group.id, group] as const),
  );
  const mergedServerGroups = serverGroups.map((group) => {
    const current = currentById.get(group.id);
    const cached = cachedById.get(group.id);
    return {
      ...group,
      tickets: current?.tickets.length
        ? current.tickets
        : (cached?.tickets ?? group.tickets),
    };
  });
  const serverIds = new Set(mergedServerGroups.map((group) => group.id));
  const localGroups = new Map<string, DemoGroup>();
  [...cachedGroups, ...currentGroups]
    .filter(
      (group) => group.id.startsWith("local-") && !serverIds.has(group.id),
    )
    .forEach((group) => localGroups.set(group.id, group));
  return [...mergedServerGroups, ...localGroups.values()];
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  // 로그인한 사용자. 로그인 토큰은 쿠키에 있고 앱은 읽지 않는다 (AGENTS.md "보안")
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [groups, setGroups] = useState<DemoGroup[]>([]);
  const [screen, setScreen] = useState<RootScreen>("home");
  const [selectedVisitDate, setSelectedVisitDate] = useState<
    string | undefined
  >(undefined);
  const [viewTicket, setViewTicket] = useState<IssuedTicket | null>(null);
  const [profile, setProfile] = useState<Profile>({
    nickname: "닉네임 입력",
    introduction: "나를 소개해보세요.",
    username: "my.memory",
    photoUri: null,
  });

  // 공동 티켓은 그룹 API에 아직 포함되지 않아 로그인/화면 이동 뒤에도 로컬에서 복원합니다.
  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const [result, cachedGroups] = await Promise.all([
          getMyGroups(),
          loadStoredGroups(groupCacheOwner(user)),
        ]);
        if (!active) return;
        const serverGroups = result.groups.map((group) => ({
          id: String(group.groupId),
          name: group.name,
          isDefault: group.isDefault,
          members: group.memberCount,
          maxMembers: group.maxMembers,
          createdAt: kstDate(group.createdAt),
          tickets: [],
        }));
        setGroups((currentGroups) =>
          mergeServerGroups(serverGroups, currentGroups, cachedGroups),
        );
      } catch {
        // 홈 진입은 그룹 목록 조회 실패만으로 중단하지 않습니다.
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || groups.length === 0) return;
    void saveStoredGroups(groupCacheOwner(user), groups).catch(
      (error: unknown) => {
        console.warn("그룹 티켓 복원용 로컬 저장 실패", error);
      },
    );
  }, [groups, user]);

  // GROUP 탭을 열 때마다 서버에서 내 그룹 목록을 받아 온다 (기본 1인 그룹이 맨 앞)
  // 공동 티켓 목록은 공동 티켓 목록 API가 생기면 그룹 화면에서 받아 온다
  const openGroups = () => {
    setScreen("group");
    void (async () => {
      try {
        const result = await getMyGroups();
        const [cachedGroups] = await Promise.all([
          user ? loadStoredGroups(groupCacheOwner(user)) : Promise.resolve([]),
        ]);
        const serverGroups: DemoGroup[] = result.groups.map((group) => ({
          id: String(group.groupId),
          name: group.name,
          isDefault: group.isDefault,
          members: group.memberCount,
          maxMembers: group.maxMembers,
          createdAt: kstDate(group.createdAt),
          tickets: [],
        }));
        setGroups((currentGroups) =>
          mergeServerGroups(serverGroups, currentGroups, cachedGroups),
        );
      } catch (error: unknown) {
        // 로그인이 안 됐거나 만료되면 로그인 화면으로 보낸다 (AGENTS.md 에러 코드: UNAUTHORIZED → 로그인 화면)
        if (
          error instanceof ApiError &&
          (error.code === ErrorCode.UNAUTHORIZED ||
            error.code === ErrorCode.ACCESS_TOKEN_EXPIRED)
        ) {
          Alert.alert("로그인 만료", "다시 로그인해 주세요.");
          setUser(null);
          return;
        }
        Alert.alert(
          "그룹 불러오기 오류",
          "그룹 목록을 불러오지 못했어요. 다시 시도해 주세요.",
        );
      }
    })();
  };

  const openTickets = (visitDate?: string) => {
    if (!visitDate) {
      setScreen("dateSelection");
      return;
    }
    // 날짜별 발권 기록을 먼저 확인합니다. 이미 발권했으면 읽기 전용으로 엽니다.
    void (async () => {
      try {
        const existing = await getIssuedTicket(visitDate);
        setViewTicket(existing);
        setSelectedVisitDate(visitDate);
        setScreen("ticket");
      } catch {
        Alert.alert(
          "티켓 확인 오류",
          "발권 기록을 확인하지 못했어요. 다시 시도해 주세요.",
        );
      }
    })();
  };

  if (!user) {
    return <LoginScreen onLoggedIn={setUser} />;
  }

  if (screen === "ticket") {
    return (
      <TicketCreationScreen
        selectedVisitDate={selectedVisitDate}
        issuedTicket={viewTicket}
        onBackHome={() => setScreen("home")}
        onCreateNew={() => {
          setViewTicket(null);
          setSelectedVisitDate(undefined);
          setScreen("dateSelection");
        }}
      />
    );
  }
  if (screen === "dateSelection") {
    return (
      <HomeScreen
        dateSelectionMode
        onCancelDateSelection={() => setScreen("home")}
        onOpenMy={() => setScreen("my")}
        onOpenGroup={openGroups}
        onOpenTickets={openTickets}
        groups={groups}
      />
    );
  }
  if (screen === "group") {
    return (
      <GroupScreen
        onOpenHome={() => setScreen("home")}
        onOpenTickets={() => openTickets()}
        onOpenMy={() => setScreen("my")}
        groups={groups}
        onGroupsChange={setGroups}
      />
    );
  }
  if (screen === "my") {
    return (
      <MyPageScreen
        onOpenHome={() => setScreen("home")}
        onOpenGroup={openGroups}
        groups={groups}
        savedProfile={profile}
        onSaveProfile={setProfile}
      />
    );
  }
  return (
    <HomeScreen
      onOpenMy={() => setScreen("my")}
      onOpenGroup={openGroups}
      onOpenTickets={openTickets}
      groups={groups}
      onLogout={() => {
        // 로그인 화면으로 돌아갑니다. 서버 로그아웃 API가 생기면 여기서 호출한다. 저장된 티켓은 삭제하지 않습니다.
        setScreen("home");
        setViewTicket(null);
        setSelectedVisitDate(undefined);
        setGroups([]);
        setUser(null);
      }}
    />
  );
}
