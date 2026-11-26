import { ErrorCode, type LoginResponse } from "@mind-do/shared";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "../components/HomeScreen";
import MyPageScreen, { type Profile } from "../components/MyPageScreen";
import StoreScreen from "../components/StoreScreen";
import LoginScreen from "../components/LoginScreen";
import GroupScreen, {
  kstDate,
  type DemoGroup,
} from "../components/GroupScreen";
import { ApiError, getMyGroups, logout } from "../lib/api";

type RootScreen = "home" | "group" | "my" | "store";
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
  const [homeTicket, setHomeTicket] = useState<{
    groupId: string;
    date: string;
    sharedTicketId: number | null;
  } | null>(null);
  const [homeReturnDate, setHomeReturnDate] = useState<string>();
  const [showIssuedTickets, setShowIssuedTickets] = useState(false);
  useEffect(() => {
    if (screen === "home" && showIssuedTickets) setShowIssuedTickets(false);
  }, [screen, showIssuedTickets]);
  const [profile, setProfile] = useState<Profile>({
    nickname: "닉네임 입력",
    introduction: "나를 소개해보세요.",
    username: "my.memory",
    photoUri: null,
  });

  useEffect(() => {
    if (!user || (screen !== "home" && (screen !== "group" || homeTicket)))
      return;
    let active = true;
    void getMyGroups()
      .then(({ groups: serverGroups }) => {
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
        setGroups(summaries);
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
  }, [user, screen, homeTicket]);

  const openGroups = () => {
    setHomeTicket(null);
    setScreen("group");
  };

  if (!user) {
    return <LoginScreen onLoggedIn={setUser} />;
  }

  const openStore = () => setScreen("store");

  if (screen === "store") {
    return (
      <StoreScreen
        onOpenHome={() => setScreen("home")}
        onOpenGroup={openGroups}
        onOpenMy={() => setScreen("my")}
      />
    );
  }
  if (screen === "group") {
    return (
      <GroupScreen
        onOpenTodaysTickets={(date) => {
          setHomeReturnDate(date);
          setShowIssuedTickets(true);
          setHomeTicket(null);
          setScreen("home");
        }}
        onOpenStore={openStore}
        onOpenHome={() => {
          setHomeTicket(null);
          setScreen("home");
        }}
        onOpenMy={() => setScreen("my")}
        groups={groups}
        onGroupsChange={setGroups}
        currentUserId={user.userId}
        homeTicket={homeTicket}
      />
    );
  }
  if (screen === "my") {
    return (
      <MyPageScreen
        currentUserId={user.userId}
        onOpenStore={openStore}
        onOpenHome={() => setScreen("home")}
        onOpenGroup={openGroups}
        savedProfile={profile}
        onSaveProfile={setProfile}
      />
    );
  }
  return (
    <HomeScreen
      initialShowAllTickets={showIssuedTickets}
      groups={groups}
      currentUserId={user.userId}
      initialDate={homeReturnDate}
      onOpenGroupSlot={(groupId, date, sharedTicketId) => {
        setHomeReturnDate(date);
        setHomeTicket({ groupId, date, sharedTicketId });
        setScreen("group");
      }}
      onOpenStore={openStore}
      onOpenMy={() => setScreen("my")}
      onOpenGroup={openGroups}
      onLogout={() => {
        void logout().catch(() => {});
        setScreen("home");
        setGroups([]);
        setUser(null);
      }}
    />
  );
}
