import { ErrorCode, type LoginResponse } from "@mind-do/shared";
import { useEffect, useState } from "react";
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
import {
  ApiError,
  getGroupSharedTickets,
  getMyGroups,
  logout,
} from "../lib/api";

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

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getMyGroups()
      .then(async ({ groups: serverGroups }) => {
        if (!active) return;
        const summaries = serverGroups.map((group) => ({
          id: String(group.groupId),
          name: group.name,
          isDefault: group.isDefault,
          members: group.memberCount,
          maxMembers: group.maxMembers,
          createdAt: kstDate(group.createdAt),
          tickets: [],
        }));
        if (screen !== "home" && screen !== "dateSelection") {
          setGroups(summaries);
          return;
        }
        const withTickets = await Promise.all(
          summaries.map(async (group) => {
            try {
              const list = await getGroupSharedTickets(Number(group.id));
              return {
                ...group,
                tickets: list.sharedTickets.map((ticket) => ({
                  date: ticket.ticketDate,
                  title: ticket.title ?? "",
                  completed: ticket.completedCount,
                  invitees: ticket.slotCount,
                  sharedTicketId: ticket.sharedTicketId,
                  myStatus: ticket.myStatus,
                })),
              };
            } catch {
              return group;
            }
          }),
        );
        if (active) setGroups(withTickets);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setGroups([]);
        if (
          error instanceof ApiError &&
          (error.code === ErrorCode.UNAUTHORIZED ||
            error.code === ErrorCode.ACCESS_TOKEN_EXPIRED)
        ) {
          setScreen("home");
          setUser(null);
          Alert.alert("로그인 만료", "다시 로그인해 주세요.");
          return;
        }
        Alert.alert("그룹 불러오기 오류", "그룹 목록을 불러오지 못했어요.");
      });
    return () => {
      active = false;
    };
  }, [user, screen]);

  const openGroups = () => setScreen("group");

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
        currentUserId={user.userId}
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
        void logout().catch(() => {});
        setScreen("home");
        setViewTicket(null);
        setSelectedVisitDate(undefined);
        setGroups([]);
        setUser(null);
      }}
    />
  );
}
