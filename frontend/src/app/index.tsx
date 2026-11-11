import { ErrorCode, type LoginResponse } from "@mind-do/shared";
import { useState } from "react";
import { Alert } from "react-native";
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

  // GROUP 탭을 열 때마다 서버에서 내 그룹 목록을 받아 온다 (기본 1인 그룹이 맨 앞)
  // 공동 티켓 목록은 공동 티켓 목록 API가 생기면 그룹 화면에서 받아 온다
  const openGroups = () => {
    setScreen("group");
    void (async () => {
      try {
        const result = await getMyGroups();
        setGroups(
          result.groups.map((group) => ({
            id: String(group.groupId),
            name: group.name,
            isDefault: group.isDefault,
            members: group.memberCount,
            maxMembers: group.maxMembers,
            // 그룹을 만든 날짜(한국시간 YYYY-MM-DD). 그룹 목록 카드에 표시
            createdAt: kstDate(group.createdAt),
            tickets: [],
          })),
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
        currentUserId={user.userId}
      />
    );
  }
  if (screen === "my") {
    return (
      <MyPageScreen
        onOpenTickets={openTickets}
        onOpenHome={() => setScreen("home")}
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
