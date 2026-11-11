import type { LoginResponse } from "@mind-do/shared";
import { useState } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getIssuedTicket, type IssuedTicket } from "../storage/issued-tickets";
import HomeScreen from "../components/HomeScreen";
import MyPageScreen, { type Profile } from "../components/MyPageScreen";
import TicketCreationScreen from "../components/TicketEditor";
import LoginScreen from "../components/LoginScreen";
import GroupScreen, {
  initialGroups,
  type DemoGroup,
} from "../components/GroupScreen";

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
  const [demoGroups, setDemoGroups] = useState<DemoGroup[]>(initialGroups);
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
        onOpenGroup={() => setScreen("group")}
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
        groups={demoGroups}
        onGroupsChange={setDemoGroups}
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
      onOpenGroup={() => setScreen("group")}
      onOpenTickets={openTickets}
      onLogout={() => {
        // 로그인 화면으로 돌아갑니다. 서버 로그아웃 API가 생기면 여기서 호출한다. 저장된 티켓은 삭제하지 않습니다.
        setScreen("home");
        setViewTicket(null);
        setSelectedVisitDate(undefined);
        setDemoGroups(initialGroups);
        setUser(null);
      }}
    />
  );
}
