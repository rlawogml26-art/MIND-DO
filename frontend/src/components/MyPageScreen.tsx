import { useEffect, useState } from "react";
import {
  PROFILE_NICKNAME_MAX,
  SLOT_STATUS_COMPLETED,
  type MyTicket,
  type TicketTextValues,
} from "@mind-do/shared";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  getGroupSharedTickets,
  getMyGroups,
  getSharedTicketDetail,
} from "../lib/api";
import { useMyTickets } from "../hooks/use-my-tickets";
import TicketRenderer from "./TicketRenderer";

const colors = {
  "background/canvas": "#FFFFFF",
  "background/surface": "#FFFFFF",
  "text/primary": "#282B33",
  "text/secondary": "#767A85",
  "brand/primary": "#0750ED",
  "accent/primary": "#FF7868",
  "accent/soft": "#FFF0EC",
  "border/default": "#DFE5EF",
};
import defaultProfileImage from "../../assets/memo-re-mascot.png";
import logo from "../../assets/memo-re-wordmark.png";
import MenuExperience, { type MenuRoute } from "./MenuScreens";

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
            <Text style={bottomNavStyles.label}>{tab.label}</Text>
            <View
              style={[
                bottomNavStyles.activeMarker,
                activeTab === tab.key && bottomNavStyles.activeMarkerVisible,
              ]}
            />
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
  outer: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  bar: {
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0F2F6",
    shadowColor: "#282B33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
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
  label: { color: "#282B33", fontSize: 11, lineHeight: 14, fontWeight: "500" },
  activeMarker: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  activeMarkerVisible: { backgroundColor: "#FF7868" },
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
    borderColor: "#767A85",
    transform: [{ rotate: "45deg" }],
  },
  homeBody: {
    position: "absolute",
    bottom: 3,
    width: 14,
    height: 11,
    borderWidth: 1.8,
    borderTopWidth: 0,
    borderColor: "#767A85",
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
    borderColor: "#767A85",
  },
  ticketIcon: {
    width: 28,
    height: 18,
    borderWidth: 2,
    borderColor: "#767A85",
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketLine: {
    width: 0,
    height: 11,
    borderLeftWidth: 1.4,
    borderStyle: "dashed",
    borderColor: "#767A85",
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
    borderColor: "#767A85",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  storeStripe: { width: 1, height: 5, backgroundColor: "#767A85" },
  storeBody: {
    position: "absolute",
    bottom: 3,
    width: 15,
    height: 10,
    borderWidth: 1.7,
    borderTopWidth: 0,
    borderColor: "#767A85",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  storeDoor: {
    width: 4,
    height: 6,
    borderWidth: 1.3,
    borderBottomWidth: 0,
    borderColor: "#767A85",
  },
  personHead: {
    position: "absolute",
    top: 2,
    width: 7,
    height: 7,
    borderWidth: 1.7,
    borderColor: "#282B33",
    borderRadius: 4,
  },
  personBody: {
    position: "absolute",
    bottom: 2,
    width: 15,
    height: 9,
    borderWidth: 1.7,
    borderBottomWidth: 0,
    borderColor: "#282B33",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});

export type Profile = {
  nickname: string;
  introduction: string;
  username: string;
  photoUri: string | null;
};

type MyScreen = "profile" | "edit" | "tickets" | "following" | "followers";
type TicketViewMode = "all" | "month";
type TicketTypeFilter = "all" | "personal" | "shared";
type TicketListEntry = {
  key: string;
  visitDate: string;
  title: string;
  subtitle: string;
  thumbnail?: string;
  ticket?: MyTicket;
  values?: TicketTextValues;
  sharedTicketId?: number;
  segment: "full" | "shared" | "personal";
};

export default function MyPageScreen({
  currentUserId,
  onOpenHome,
  onOpenGroup,
  onOpenStore,
  onLogout,
  savedProfile,
  onSaveProfile,
}: {
  currentUserId: number;
  onOpenHome: () => void;
  onOpenGroup?: () => void;
  onOpenStore: () => void;
  onLogout?: () => void;
  savedProfile: Profile;
  onSaveProfile: (profile: Profile) => void;
}) {
  const [screen, setScreen] = useState<MyScreen>("profile");
  const { width: windowWidth } = useWindowDimensions();
  const {
    tickets,
    loading: ticketLoading,
    failed: ticketLoadError,
    reload,
  } = useMyTickets();
  const [draftProfile, setDraftProfile] = useState(savedProfile);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRoute, setMenuRoute] = useState<MenuRoute>("settings");
  const [profilePhotoExpanded, setProfilePhotoExpanded] = useState(false);
  const [ticketTypeFilter, setTicketTypeFilter] =
    useState<TicketTypeFilter>("all");
  const [sharedTickets, setSharedTickets] = useState<TicketListEntry[]>([]);
  const [groupContext, setGroupContext] = useState<
    Record<number, { sharedTicketId: number; values: TicketTextValues }>
  >({});
  const [sharedTicketStatus, setSharedTicketStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [sharedTicketAttempt, setSharedTicketAttempt] = useState(0);
  const [ticketViewMode, setTicketViewMode] = useState<TicketViewMode>("all");
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (screen !== "tickets") return;
    let active = true;
    setSharedTicketStatus("loading");
    setGroupContext({});
    void getMyGroups()
      .then(({ groups }) =>
        Promise.all(
          groups.map(async (group) => {
            const { sharedTickets } = await getGroupSharedTickets(
              group.groupId,
            );
            return { group, sharedTickets };
          }),
        ),
      )
      .then(async (results) => {
        if (!active) return;
        setSharedTickets(
          results.flatMap(({ group, sharedTickets }) =>
            group.isDefault
              ? []
              : sharedTickets
                  .filter((ticket) => ticket.isInvited)
                  .map((ticket): TicketListEntry => ({
                    key: `shared-${ticket.sharedTicketId}`,
                    visitDate: ticket.ticketDate,
                    title: ticket.title || "공동 티켓",
                    subtitle: group.name,
                    segment: "shared",
                    sharedTicketId: ticket.sharedTicketId,
                  })),
          ),
        );
        setSharedTicketStatus("ready");
        await Promise.all(
          results.map(async ({ sharedTickets }) => {
            for (const summary of sharedTickets) {
              if (!active) return;
              if (summary.myStatus !== SLOT_STATUS_COMPLETED) continue;
              const detail = await getSharedTicketDetail(
                summary.sharedTicketId,
              ).catch(() => null);
              if (!active || !detail) continue;
              const ownSlot = detail.slots.find(
                (slot) => slot.userId === currentUserId,
              );
              if (!ownSlot?.ticket) continue;
              const ticketId = ownSlot.ticket.ticketId;
              setGroupContext((current) => ({
                ...current,
                [ticketId]: {
                  sharedTicketId: detail.sharedTicketId,
                  values: {
                    title: detail.title,
                    date: detail.ticketDate,
                    groupName: detail.groupName,
                    participants: detail.slots.map((slot) => slot.name),
                  },
                },
              }));
            }
          }),
        );
      })
      .catch(() => {
        if (!active) return;
        setSharedTickets([]);
        setSharedTicketStatus("error");
      });
    return () => {
      active = false;
    };
  }, [screen, sharedTicketAttempt, currentUserId]);

  const isEditing = screen === "edit";
  const visibleProfile = isEditing ? draftProfile : savedProfile;

  function openEditor() {
    setDraftProfile({
      ...savedProfile,
      nickname:
        savedProfile.nickname === "닉네임 입력" ||
        savedProfile.nickname === "닉네임"
          ? ""
          : savedProfile.nickname,
    });
    setScreen("edit");
  }

  function updateNickname(value: string) {
    setDraftProfile((previous) => ({
      ...previous,
      nickname: value.slice(0, PROFILE_NICKNAME_MAX),
    }));
  }
  function deleteProfilePhoto() {
    setDraftProfile((previous) => ({
      ...previous,
      photoUri: null,
    }));
  }
  async function chooseProfilePhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "사진 접근 권한 필요",
          "프로필 사진을 선택하려면 사진 접근을 허용해 주세요.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      setDraftProfile((previous) => ({
        ...previous,
        photoUri: result.assets[0].uri,
      }));
    } catch {
      Alert.alert(
        "사진 선택 오류",
        "사진을 불러오지 못했어요. 다시 시도해 주세요.",
      );
    }
  }
  function saveProfile() {
    Keyboard.dismiss();
    onSaveProfile({ ...draftProfile });
    setScreen("profile");
  }

  function returnToMy() {
    Keyboard.dismiss();
    setDraftProfile({ ...savedProfile });
    setScreen("profile");
  }

  function showPendingFeature() {
    Alert.alert("안내", "아직 연결되지 않은 기능이에요.");
  }
  function openMenuRoute(route: MenuRoute) {
    setMenuRoute(route);
    setMenuOpen(true);
  }
  if (screen === "following" || screen === "followers") {
    return (
      <View style={styles.screen}>
        <View style={styles.app}>
          <View style={styles.friendHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="마이페이지로 돌아가기"
              onPress={returnToMy}
              style={styles.friendBackButton}
            >
              <Text style={styles.friendBackText}>‹</Text>
            </Pressable>

            <Text style={styles.friendTitle}>
              {screen === "following" ? "팔로잉" : "팔로워"}
            </Text>
          </View>
        </View>
      </View>
    );
  }
  if (screen === "tickets") {
    const personalEntries: TicketListEntry[] = tickets.map((ticket) => ({
      key: String(ticket.ticketId),
      visitDate: ticket.visitDate,
      title: "나의 티켓",
      subtitle: "내 티켓",
      thumbnail: ticket.photos[0]?.url,
      ticket,
      values: groupContext[ticket.ticketId]?.values,
      segment: ticketTypeFilter === "personal" ? "personal" : "full",
    }));
    const ticketEntries =
      ticketTypeFilter === "shared" ? sharedTickets : personalEntries;
    const monthFilteredEntries =
      ticketViewMode === "month"
        ? ticketEntries.filter(
            (ticket) => ticket.visitDate.slice(0, 7) === selectedYearMonth,
          )
        : ticketEntries;
    const visibleTickets = [...monthFilteredEntries].sort((a, b) =>
      b.visitDate.localeCompare(a.visitDate),
    );
    const monthGroups = Array.from(
      visibleTickets.reduce((groups, ticket) => {
        const month = ticket.visitDate.slice(0, 7);
        const group = groups.get(month) ?? [];
        group.push(ticket);
        groups.set(month, group);
        return groups;
      }, new Map<string, TicketListEntry[]>()),
    );
    const [selectedYear, selectedMonth] = selectedYearMonth.split("-");
    const ownedBySharedId = new Map(
      tickets.flatMap((ticket) => {
        const context = groupContext[ticket.ticketId];
        return context
          ? [
              [
                context.sharedTicketId,
                { ticket, values: context.values },
              ] as const,
            ]
          : [];
      }),
    );
    const renderTicketCard = (ticket: TicketListEntry) => {
      const linked =
        ticket.sharedTicketId === undefined
          ? undefined
          : ownedBySharedId.get(ticket.sharedTicketId);
      const savedTicket = linked?.ticket ?? ticket.ticket;
      const values = linked?.values ?? ticket.values;
      if (savedTicket?.design) {
        const part =
          ticket.segment === "shared"
            ? "stub"
            : ticket.segment === "personal" || !values
              ? "body"
              : undefined;
        const fullWidth = Math.min(windowWidth, 420) - 16;
        return (
          <View
            key={ticket.key}
            style={part === "body" && styles.savedPersonalCard}
          >
            <TicketRenderer
              designId={savedTicket.design.designId}
              decorations={savedTicket.decorations}
              photoUris={savedTicket.photos.map((photo) => photo.url)}
              values={
                values ?? {
                  date: savedTicket.visitDate,
                  groupName: "",
                  participants: [],
                }
              }
              width={
                part === "stub"
                  ? 80
                  : part === "body"
                    ? fullWidth * 0.8
                    : fullWidth
              }
              part={part}
              lieDown
            />
          </View>
        );
      }
      const title = ticket.title;
      const subtitle = ticket.subtitle;
      const date = ticket.visitDate.replace(/-/g, ".");
      const thumbnail = ticket.thumbnail;
      return (
        <View
          key={ticket.key}
          style={[
            styles.ticketCard,
            ticket.segment === "shared" && styles.sharedTicketCard,
            ticket.segment === "personal" && styles.personalTicketCard,
          ]}
        >
          {ticket.segment !== "personal" && (
            <View
              style={[
                styles.ticketStub,
                ticket.segment === "shared" && styles.sharedTicketStub,
              ]}
            >
              <Text style={styles.ticketStubLogo}>MEMO:RE</Text>
              <Text style={styles.ticketStubTitle} numberOfLines={3}>
                {title}
              </Text>
              <View style={styles.ticketStubFooter}>
                <Text style={styles.ticketStubDate} numberOfLines={1}>
                  {date}
                </Text>
                <Text style={styles.ticketStubLocation} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            </View>
          )}
          {ticket.segment === "full" && (
            <View style={styles.ticketDashedLine} />
          )}
          {ticket.segment !== "shared" && (
            <View style={styles.ticketPhoto}>
              {thumbnail ? (
                <Image
                  source={{ uri: thumbnail }}
                  style={styles.ticketImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.ticketImageEmpty} />
              )}
              <Text style={styles.ticketPhotoDate}>{date}</Text>
            </View>
          )}
        </View>
      );
    };

    return (
      <View style={styles.screen}>
        <View style={styles.app}>
          <View style={styles.ticketListHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="마이페이지로 돌아가기"
              onPress={returnToMy}
              style={styles.ticketListBackButton}
            >
              <Text style={styles.ticketListBackText}>‹</Text>
            </Pressable>

            <Text style={styles.ticketListTitle}>내 티켓 모아보기</Text>
          </View>

          <View style={styles.ticketViewTabs}>
            {(
              [
                { key: "all", label: "전체 그룹" },
                { key: "month", label: "월별 보기" },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: ticketViewMode === tab.key }}
                onPress={() => setTicketViewMode(tab.key)}
                style={styles.ticketViewTab}
              >
                <Text
                  style={[
                    styles.ticketViewTabText,
                    ticketViewMode === tab.key &&
                      styles.ticketViewTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.ticketViewIndicator,
                    ticketViewMode === tab.key &&
                      styles.ticketViewIndicatorActive,
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <View style={styles.ticketTypeTabs}>
            {(
              [
                { key: "all", label: "전체" },
                { key: "personal", label: "개인 티켓" },
                { key: "shared", label: "공동 티켓" },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: ticketTypeFilter === tab.key }}
                onPress={() => setTicketTypeFilter(tab.key)}
                style={styles.ticketTypeTab}
              >
                <Text
                  style={[
                    styles.ticketTypeTabText,
                    ticketTypeFilter === tab.key &&
                      styles.ticketTypeTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {ticketTypeFilter === tab.key && (
                  <View style={styles.ticketTypeIndicator} />
                )}
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.ticketListContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.ticketPeriodRow}>
              {ticketViewMode === "all" ? (
                <Text style={styles.ticketPeriodTitle}>전체 기간</Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${selectedYear}년 ${Number(selectedMonth)}월 선택`}
                  onPress={() => {
                    setPickerYear(Number(selectedYear));
                    setMonthPickerOpen(true);
                  }}
                  style={styles.monthPeriodButton}
                >
                  <Text style={styles.ticketPeriodTitle}>
                    {selectedYear}년 {Number(selectedMonth)}월
                  </Text>
                  <Text style={styles.monthPeriodChevron}>⌄</Text>
                </Pressable>
              )}
            </View>
            {ticketTypeFilter === "shared" && sharedTicketStatus === "error" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSharedTicketAttempt((attempt) => attempt + 1)}
              >
                <Text style={styles.ticketListEmpty}>
                  공동 티켓을 불러오지 못했어요. 다시 시도
                </Text>
              </Pressable>
            ) : ticketTypeFilter === "shared" &&
              sharedTicketStatus === "loading" ? (
              <Text style={styles.ticketListEmpty}>
                공동 티켓을 불러오는 중이에요.
              </Text>
            ) : ticketTypeFilter !== "shared" && ticketLoadError ? (
              <Pressable accessibilityRole="button" onPress={reload}>
                <Text style={styles.ticketListEmpty}>
                  내 티켓을 불러오지 못했어요. 다시 시도
                </Text>
              </Pressable>
            ) : ticketTypeFilter !== "shared" && ticketLoading ? (
              <Text style={styles.ticketListEmpty}>
                티켓을 불러오는 중이에요.
              </Text>
            ) : visibleTickets.length === 0 ? (
              <Text style={styles.ticketListEmpty}>
                {ticketTypeFilter === "shared"
                  ? "공동 티켓이 없어요."
                  : "아직 발권한 티켓이 없어요."}
              </Text>
            ) : ticketTypeFilter === "shared" ? (
              <View style={styles.sharedTicketGrid}>
                {visibleTickets.map(renderTicketCard)}
              </View>
            ) : (
              monthGroups.map(([month, monthTickets], monthIndex) => (
                <View key={month} style={styles.ticketMonthGroup}>
                  {ticketViewMode === "all" && monthIndex > 0 && (
                    <Text style={styles.ticketMonthDivider}>
                      {month.slice(0, 4)}년 {Number(month.slice(5, 7))}월
                    </Text>
                  )}
                  {monthTickets.map(renderTicketCard)}
                </View>
              ))
            )}
          </ScrollView>
          <Modal
            visible={monthPickerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setMonthPickerOpen(false)}
          >
            <View style={styles.monthPickerOverlay}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="월 선택 닫기"
                onPress={() => setMonthPickerOpen(false)}
                style={styles.monthPickerBackdrop}
              />
              <View style={styles.monthPickerCard}>
                <View style={styles.monthPickerHeader}>
                  <Text style={styles.monthPickerTitle}>월별 보기</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="닫기"
                    onPress={() => setMonthPickerOpen(false)}
                    hitSlop={8}
                  >
                    <Text style={styles.monthPickerClose}>×</Text>
                  </Pressable>
                </View>
                <View style={styles.monthPickerYearRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="이전 연도"
                    onPress={() => setPickerYear((year) => year - 1)}
                    style={styles.monthPickerYearArrow}
                  >
                    <Text style={styles.monthPickerArrowText}>‹</Text>
                  </Pressable>
                  <Text style={styles.monthPickerYear}>{pickerYear}년</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="다음 연도"
                    onPress={() => setPickerYear((year) => year + 1)}
                    style={styles.monthPickerYearArrow}
                  >
                    <Text style={styles.monthPickerArrowText}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.monthPickerGrid}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (month) => {
                      const monthKey = `${pickerYear}-${String(month).padStart(2, "0")}`;
                      const selected = monthKey === selectedYearMonth;
                      return (
                        <Pressable
                          key={month}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => {
                            setSelectedYearMonth(monthKey);
                            setMonthPickerOpen(false);
                          }}
                          style={[
                            styles.monthPickerMonth,
                            selected && styles.monthPickerMonthSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.monthPickerMonthText,
                              selected && styles.monthPickerMonthTextSelected,
                            ]}
                          >
                            {month}월
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.app}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            !isEditing && styles.profileContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.header, isEditing && styles.editHeader]}>
            {isEditing ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="마이페이지로 돌아가기"
                  onPress={returnToMy}
                  style={styles.editBackButton}
                >
                  <Text style={styles.editBackText}>‹</Text>
                </Pressable>
                <Text style={styles.title}>프로필 편집</Text>
              </>
            ) : (
              <>
                <Image
                  source={logo}
                  resizeMode="contain"
                  accessibilityLabel="MEMO:RE"
                  style={styles.brandLogo}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="알림"
                  onPress={showPendingFeature}
                  style={styles.notificationButton}
                >
                  <View style={styles.bellBody} />
                  <View style={styles.bellBase} />
                  <View style={styles.bellDot} />
                </Pressable>
              </>
            )}
          </View>

          {isEditing ? (
            <>
              <View style={styles.editPhotoSection}>
                <View style={[styles.avatar, styles.largeAvatar]}>
                  <Image
                    source={
                      visibleProfile.photoUri
                        ? { uri: visibleProfile.photoUri }
                        : defaultProfileImage
                    }
                    resizeMode="cover"
                    accessibilityLabel="프로필 사진"
                    style={styles.profileImage}
                  />
                </View>
                <View style={styles.photoActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void chooseProfilePhoto()}
                    style={({ pressed }) => [
                      styles.photoActionButton,
                      styles.photoChangeButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.photoChangeText}>사진 변경</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="프로필 사진 삭제"
                    onPress={deleteProfilePhoto}
                    style={({ pressed }) => [
                      styles.photoActionButton,
                      styles.photoRemoveButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.photoRemoveText}>사진 삭제</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>닉네임</Text>
                  <TextInput
                    accessibilityLabel="닉네임"
                    maxLength={PROFILE_NICKNAME_MAX}
                    value={draftProfile.nickname}
                    onChangeText={updateNickname}
                    onFocus={() => {
                      if (
                        draftProfile.nickname === "닉네임 입력" ||
                        draftProfile.nickname === "닉네임"
                      ) {
                        updateNickname("");
                      }
                    }}
                    placeholder="닉네임 입력"
                    placeholderTextColor={colors["text/secondary"]}
                    autoCorrect={false}
                    style={[styles.input, styles.nicknameInput]}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>아이디</Text>
                  <TextInput
                    accessibilityLabel="아이디"
                    value={draftProfile.username}
                    editable={false}
                    style={[styles.input, styles.usernameInput]}
                  />
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={saveProfile}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.saveText}>저장</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.profileRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="프로필 사진 크게 보기"
                  onPress={() => setProfilePhotoExpanded(true)}
                  style={styles.avatar}
                >
                  <Image
                    source={
                      savedProfile.photoUri
                        ? { uri: savedProfile.photoUri }
                        : defaultProfileImage
                    }
                    resizeMode="cover"
                    accessibilityLabel="프로필 사진"
                    style={styles.profileImage}
                  />
                </Pressable>
                <View style={styles.profileInfo}>
                  <Text style={styles.nickname}>
                    {savedProfile.nickname.trim() || "닉네임"}
                  </Text>
                  <Text style={styles.username}>{savedProfile.username}</Text>
                  <Pressable accessibilityRole="button" onPress={openEditor}>
                    <Text style={styles.editProfileLink}>프로필 편집</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => openMenuRoute("subscription")}
                style={styles.vipLink}
              >
                <Text style={styles.vipText}>VIP 구독 중</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="내 티켓 모아보기"
                onPress={() => setScreen("tickets")}
                style={({ pressed }) => [
                  styles.archiveCard,
                  pressed && styles.pressed,
                ]}
              >
                <View>
                  <Text style={styles.archiveTitle}>내 티켓 모아보기</Text>
                  <Text style={styles.archiveCount}>
                    {ticketLoadError || ticketLoading ? "-" : tickets.length}장
                  </Text>
                </View>
                <Text style={styles.archiveArrow}>›</Text>
              </Pressable>

              <View style={styles.settingsList}>
                {[
                  { label: "환경설정", route: "settings" },
                  { label: "구독 및 구매", route: "subscription" },
                  { label: "자주 묻는 질문", route: "faq" },
                  { label: "1:1 문의하기", route: "inquiry" },
                  { label: "공지사항", route: "notice" },
                ].map(({ label, route }) => (
                  <Pressable
                    key={route}
                    accessibilityRole="button"
                    onPress={() => openMenuRoute(route as MenuRoute)}
                    style={({ pressed }) => [
                      styles.settingsItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.settingsItemText}>{label}</Text>
                    <Text style={styles.settingsArrow}>›</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.accountActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openMenuRoute("logout")}
                  style={styles.accountAction}
                >
                  <Text style={styles.accountActionText}>로그아웃</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openMenuRoute("withdraw")}
                  style={styles.accountAction}
                >
                  <Text style={styles.accountActionText}>회원 탈퇴</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
        {!isEditing && (
          <BottomNavigation
            activeTab="my"
            onSelect={(tab) => {
              if (tab === "home") onOpenHome();
              else if (tab === "group") {
                if (onOpenGroup) onOpenGroup();
                else {
                  Alert.alert(
                    "그룹 화면 연결 필요",
                    "App.tsx의 MyPageScreen에 onOpenGroup={openGroups}를 전달해 주세요.",
                  );
                }
              } else if (tab === "store") onOpenStore();
              else returnToMy();
            }}
          />
        )}
        <MenuExperience
          visible={menuOpen}
          initialPage={menuRoute}
          onClose={() => setMenuOpen(false)}
          onLogout={onLogout}
        />
        <Modal
          visible={profilePhotoExpanded}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setProfilePhotoExpanded(false)}
        >
          <View style={styles.profilePhotoOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="프로필 사진 확대 닫기"
              onPress={() => setProfilePhotoExpanded(false)}
              style={styles.profilePhotoBackdrop}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={() => setProfilePhotoExpanded(false)}
              style={styles.profilePhotoClose}
            >
              <Text style={styles.profilePhotoCloseText}>×</Text>
            </Pressable>
            <View style={styles.profilePhotoLargeWrap}>
              <Image
                source={
                  savedProfile.photoUri
                    ? { uri: savedProfile.photoUri }
                    : defaultProfileImage
                }
                resizeMode="contain"
                accessibilityLabel="확대된 프로필 사진"
                style={styles.profilePhotoLarge}
              />
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  photoActions: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 32,
  },
  photoActionButton: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  photoChangeButton: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  photoRemoveButton: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  photoActionIcon: {
    color: colors["text/primary"],
    fontSize: 19,
    lineHeight: 21,
  },
  photoChangeText: {
    color: colors["brand/primary"],
    fontSize: 13,
    fontWeight: "500",
  },
  photoRemoveIcon: {
    color: colors["text/secondary"],
    fontSize: 19,
    lineHeight: 21,
  },
  photoRemoveText: {
    color: colors["text/secondary"],
    fontSize: 13,
    fontWeight: "500",
  },
  screen: {
    flex: 1,
    backgroundColor: colors["background/canvas"],
    alignItems: "center",
  },
  app: { flex: 1, width: "100%", maxWidth: 420 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 32 },
  profileContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 18 },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editHeader: { justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "500", color: colors["text/primary"] },
  brandLogo: { width: 143, height: 30 },
  notificationButton: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBody: {
    width: 15,
    height: 17,
    borderWidth: 1.8,
    borderColor: "#282B33",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  bellBase: {
    width: 19,
    height: 2,
    marginTop: -1,
    backgroundColor: "#282B33",
    borderRadius: 2,
  },
  bellDot: {
    width: 4,
    height: 4,
    marginTop: 2,
    backgroundColor: "#282B33",
    borderRadius: 2,
  },
  editBackButton: {
    position: "absolute",
    left: -4,
    width: 28,
    height: 40,
    borderWidth: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  editBackText: { fontSize: 24, color: colors["text/primary"] },
  profilePhotoOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePhotoBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  profilePhotoClose: {
    position: "absolute",
    top: 34,
    left: 8,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePhotoCloseText: {
    color: colors["background/surface"],
    fontSize: 30,
    fontWeight: "300",
  },
  profilePhotoLargeWrap: {
    width: 148,
    height: 148,
    borderRadius: 74,
    overflow: "hidden",
    backgroundColor: colors["background/surface"],
    borderWidth: 2,
    borderColor: colors["background/surface"],
  },
  profilePhotoLarge: { width: "100%", height: "100%", borderRadius: 74 },
  subtitle: { marginTop: 24, fontSize: 12, color: colors["text/secondary"] },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 102,
    marginTop: 8,
    marginBottom: 0,
    gap: 16,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  largeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  avatarText: { fontSize: 28, color: colors["accent/primary"] },
  profileInfo: { flex: 1, gap: 5 },
  nickname: {
    fontSize: 26,
    lineHeight: 38,
    fontWeight: "500",
    color: colors["text/primary"],
  },
  username: { fontSize: 11, lineHeight: 16, color: colors["text/secondary"] },
  editProfileLink: {
    fontSize: 11,
    lineHeight: 16,
    color: colors["brand/primary"],
  },
  vipLink: { height: 42, justifyContent: "flex-start", paddingTop: 2 },
  vipText: { fontSize: 12, lineHeight: 18, color: colors["brand/primary"] },
  archiveCard: {
    minHeight: 86,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors["accent/soft"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  archiveTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500",
    color: colors["text/primary"],
  },
  archiveCount: {
    marginTop: 3,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: "500",
    color: colors["text/primary"],
  },
  archiveArrow: { fontSize: 30, lineHeight: 32, color: colors["text/primary"] },
  stats: {
    flexDirection: "row",
    paddingVertical: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors["border/default"],
    borderRadius: 12,
    backgroundColor: colors["background/surface"],
  },
  stat: { flex: 1, alignItems: "center", gap: 10 },
  statValue: { fontSize: 16, color: colors["text/primary"] },
  statLabel: { fontSize: 11, color: colors["text/secondary"] },
  outlineButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors["border/default"],
    borderRadius: 12,
    backgroundColor: colors["background/surface"],
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 13, color: colors["text/primary"] },
  textMenuButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  textMenuLabel: { fontSize: 13, color: colors["text/primary"] },
  ticketSection: { gap: 8 },
  profileAction: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: colors["background/surface"],
  },
  profileActionText: { fontSize: 16, color: colors["text/primary"] },
  ticketCount: {
    fontSize: 15,
    fontWeight: "600",
    color: colors["text/primary"],
  },
  settingsList: { marginTop: 8 },
  settingsItem: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsItemText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors["text/primary"],
  },
  settingsArrow: { fontSize: 24, lineHeight: 28, color: "#7C8799" },
  accountActions: {
    marginTop: 8,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 8,
  },
  accountAction: { minHeight: 28, justifyContent: "center" },
  accountActionText: { fontSize: 11, color: colors["text/secondary"] },
  ticketPlaceholder: {
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors["background/surface"],
  },
  placeholderText: { fontSize: 12, color: colors["text/secondary"] },
  editPhotoSection: { alignItems: "center", marginTop: 8 },
  photoButton: { width: "70%" },
  form: { marginTop: 52, gap: 20 },
  field: { gap: 5 },
  label: { fontSize: 12, lineHeight: 18, color: colors["text/primary"] },
  input: {
    minHeight: 48,
    paddingHorizontal: 0,
    paddingVertical: 6,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 0,
    backgroundColor: "transparent",
    fontSize: 14,
    color: colors["text/primary"],
  },
  nicknameInput: { color: colors["text/primary"] },
  usernameInput: { color: colors["text/secondary"] },
  saveButton: {
    width: 132,
    minHeight: 48,
    marginTop: 48,
    alignSelf: "flex-end",
    borderRadius: 24,
    backgroundColor: "#4354F0",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors["background/surface"],
  },
  pressed: { opacity: 0.8 },
  bottomNav: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors["accent/soft"],
  },
  navButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#352722",
    fontWeight: "400",
    textAlign: "center",
  },
  activeTabText: {
    color: "#FFFDF8",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  ticketListHeader: {
    position: "relative",
    height: 58,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  ticketListBackButton: {
    position: "absolute",
    left: 16,
    top: 8,
    zIndex: 1,
    width: 32,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketListBackText: {
    fontSize: 26,
    color: colors["text/primary"],
  },
  ticketListTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    fontSize: 16,
    fontWeight: "500",
    color: colors["text/primary"],
    textAlign: "center",
  },
  ticketViewTabs: {
    height: 42,
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  ticketViewTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ticketViewTabText: { fontSize: 12, color: colors["text/secondary"] },
  ticketViewTabTextActive: { color: colors["text/primary"], fontWeight: "600" },
  ticketViewIndicator: {
    position: "absolute",
    bottom: 0,
    width: 54,
    height: 2,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  ticketViewIndicatorActive: { backgroundColor: colors["accent/primary"] },
  ticketTypeTabs: {
    height: 44,
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  ticketTypeTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ticketTypeTabText: { fontSize: 12, color: colors["text/secondary"] },
  ticketTypeTabTextActive: { color: colors["text/primary"], fontWeight: "600" },
  ticketTypeIndicator: {
    position: "absolute",
    bottom: 0,
    width: 32,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors["accent/primary"],
  },
  ticketPeriodRow: {
    minHeight: 38,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketPeriodTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors["text/primary"],
  },
  monthPeriodButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  monthPeriodChevron: {
    marginTop: -4,
    fontSize: 17,
    color: colors["text/secondary"],
  },
  monthPickerOverlay: { flex: 1, justifyContent: "flex-end" },
  monthPickerBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(28, 30, 44, 0.36)",
  },
  monthPickerCard: {
    width: "100%",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  monthPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthPickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors["text/primary"],
  },
  monthPickerClose: {
    fontSize: 26,
    lineHeight: 28,
    color: colors["text/secondary"],
  },
  monthPickerYearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginTop: 18,
    marginBottom: 14,
  },
  monthPickerYearArrow: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  monthPickerArrowText: { fontSize: 26, color: colors["text/secondary"] },
  monthPickerYear: {
    minWidth: 82,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: colors["text/primary"],
  },
  monthPickerGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthPickerMonth: {
    width: "33.333%",
    height: 46,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  monthPickerMonthSelected: {
    borderRadius: 12,
    backgroundColor: colors["accent/soft"],
  },
  monthPickerMonthText: { fontSize: 14, color: colors["text/primary"] },
  monthPickerMonthTextSelected: {
    color: colors["accent/primary"],
    fontWeight: "600",
  },
  ticketMonthGroup: { gap: 14 },
  ticketMonthDivider: {
    paddingHorizontal: 14,
    paddingTop: 2,
    fontSize: 11,
    color: colors["text/secondary"],
  },
  ticketListContent: {
    flexGrow: 1,
    gap: 14,
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  ticketCard: {
    width: "100%",
    aspectRatio: 2.5,
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: colors["background/surface"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE5DD",
  },
  sharedTicketCard: { width: 80, aspectRatio: 0.5 },
  personalTicketCard: { width: "80%", aspectRatio: 2, alignSelf: "center" },
  savedPersonalCard: { alignSelf: "center" },
  sharedTicketRowViewport: { width: "100%", height: 154, flexGrow: 0 },
  sharedTicketRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingRight: 8,
  },
  sharedTicketGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 10,
    rowGap: 14,
  },
  ticketStub: {
    width: "20%",
    backgroundColor: "#E8CAC2",
    paddingHorizontal: 7,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  sharedTicketStub: { width: "100%" },
  ticketStubLogo: {
    color: colors["text/secondary"],
    fontSize: 7,
    lineHeight: 10,
  },
  ticketStubTitle: {
    flex: 1,
    color: colors["text/primary"],
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: 7,
  },
  ticketStubFooter: { gap: 5 },
  ticketStubDate: {
    color: colors["text/secondary"],
    fontSize: 7,
    lineHeight: 9,
  },
  ticketStubLocation: {
    color: colors["text/secondary"],
    fontSize: 8,
    lineHeight: 10,
  },
  ticketDashedLine: {
    width: 2,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "#FFF8EF",
  },
  ticketPhoto: { flex: 1, position: "relative", backgroundColor: "#F1E9E1" },
  ticketImage: { width: "100%", height: "100%" },
  ticketImageEmpty: { flex: 1, backgroundColor: "#F1E9E1" },
  ticketPhotoDate: {
    position: "absolute",
    left: 6,
    bottom: 4,
    color: colors["background/surface"],
    fontSize: 7,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ticketListEmpty: {
    color: colors["text/secondary"],
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  friendHeader: {
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  friendBackButton: {
    width: 40,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors["background/surface"],
    alignItems: "center",
    justifyContent: "center",
  },
  friendBackText: {
    fontSize: 24,
    lineHeight: 32,
    color: colors["text/primary"],
  },
  friendTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    letterSpacing: 0.15,
    color: colors["text/primary"],
  },
});
