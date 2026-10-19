import { useState } from "react";
import { Alert } from "react-native";
import { getIssuedTicket, type IssuedTicket } from "../storage/issued-tickets";
import HomeScreen from "../components/HomeScreen";
import MyPageScreen, { type Profile } from "../components/MyPageScreen";
import TicketCreationScreen from "../components/TicketEditor";

type RootScreen = "home" | "my" | "dateSelection" | "ticket";

export default function App() {
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
        onOpenTickets={openTickets}
      />
    );
  }
  if (screen === "my")
    return (
      <MyPageScreen
        onOpenTickets={openTickets}
        onOpenHome={() => setScreen("home")}
        savedProfile={profile}
        onSaveProfile={setProfile}
      />
    );
  return (
    <HomeScreen onOpenMy={() => setScreen("my")} onOpenTickets={openTickets} />
  );
}
