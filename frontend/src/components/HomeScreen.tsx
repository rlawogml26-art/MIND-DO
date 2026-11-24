import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import * as issuedStorage from "../storage/issued-tickets";
import { getIssuedTicket, type IssuedTicket } from "../storage/issued-tickets";
import { IssuedTicketFlipPreview } from "./TicketEditor";
import * as MediaLibrary from "expo-media-library/legacy";

import logo from "../../assets/memo-re-wordmark.png";

const colors = {
  canvas: "#FFFFFF",
  surface: "#FFFFFF",
  primary: "#303CB5",
  secondary: "#78819A",
  accent: "#EC806F",
  soft: "#DCE5F7",
  text: "#252B45",
  overlay: "rgba(28, 30, 44, 0.48)",
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

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
            <View
              style={[
                bottomNavStyles.activeIndicator,
                activeTab !== tab.key && bottomNavStyles.indicatorHidden,
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
  outer: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
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
  activeLabel: { color: "#303CB5", fontWeight: "700" },
  activeIndicator: {
    position: "absolute",
    bottom: 4,
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#EC806F",
  },
  indicatorHidden: { opacity: 0 },
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

/** 로그인한 사용자가 각 그룹에서 직접 발권한 개인 티켓입니다. */
export type MyGroupTicket = IssuedTicket & {
  id?: string;
  groupId?: string;
  groupName?: string;
};

function PersonalPhotoTicket({
  ticket,
  width,
}: {
  ticket: IssuedTicket;
  width: number;
}) {
  const photos = [ticket.front, ...(ticket.backs ?? [])]
    .filter((uri): uri is string => Boolean(uri))
    .slice(0, 3);
  const photoHeight = width * 0.39;
  return (
    <View style={[styles.personalPhotoTicket, { width }]}>
      <View style={[styles.personalPhotoCollage, { height: photoHeight }]}>
        {photos.length === 1 ? (
          <Image
            source={{ uri: photos[0] }}
            style={styles.personalPhotoSingle}
            resizeMode="cover"
          />
        ) : photos.length > 1 ? (
          <>
            <Image
              source={{ uri: photos[0] }}
              style={styles.personalPhotoMain}
              resizeMode="cover"
            />
            <View style={styles.personalPhotoSide}>
              {photos.slice(1).map((uri, index) => (
                <Image
                  key={`${index}-${uri}`}
                  source={{ uri }}
                  style={styles.personalPhotoThumb}
                  resizeMode="cover"
                />
              ))}
              {photos.length === 2 && (
                <View style={styles.personalPhotoThumbPlaceholder} />
              )}
            </View>
          </>
        ) : (
          <View style={styles.personalPhotoPlaceholder}>
            <Text style={styles.personalPhotoPlaceholderText}>
              사진이 없어요
            </Text>
          </View>
        )}
      </View>
      <View style={styles.personalPhotoCaptionRow}>
        <Text style={styles.personalPhotoTitle} numberOfLines={1}>
          {ticket.title || "나의 티켓"}
        </Text>
        <Text style={styles.personalPhotoDate}>
          {formattedDate(ticket.visitDate)}
        </Text>
      </View>
    </View>
  );
}

function PersonalTicketBack({
  ticket,
  width,
}: {
  ticket: IssuedTicket;
  width: number;
}) {
  return (
    <View style={[styles.personalTicketBack, { width, height: width * 0.5 }]}>
      <View style={styles.personalTicketBackHeader}>
        <Text style={styles.personalTicketBackLabel}>MEMORY NOTE</Text>
        <Text style={styles.personalTicketBackDate}>
          {formattedDate(ticket.visitDate)}
        </Text>
      </View>
      <Text style={styles.personalTicketBackMemo}>
        {ticket.memo?.trim() || "이날의 기억을 적어 주세요"}
      </Text>
    </View>
  );
}

type TicketListEntry = {
  key: string;
  ticket: IssuedTicket;
  source: "group" | "personal";
  groupName?: string;
  groupId?: string;
};

type GroupCalendarTicket = {
  date: string;
  title: string;
  kind?: "joint" | "personal";
  memberTickets?: {
    memberId: string;
    memberName: string;
    ticket: IssuedTicket;
  }[];
};

type HomeScreenProps = {
  onOpenMy: () => void;
  onOpenGroup: () => void;
  onOpenTickets: (date?: string) => void;
  dateSelectionMode?: boolean;
  onCancelDateSelection?: () => void;
  onLogout?: () => void;
  /** 선택 사항: 같은 날짜의 여러 장을 반환하는 저장소/서버 조회 함수 */
  loadIssuedTicketsForDate?: (date: string) => Promise<IssuedTicket[]>;
  /**
   * 그룹별로 '내가 직접 만든 개인 티켓' 전체를 가져오는 함수.
   * 그룹 멤버가 만든 다른 사람의 티켓이나 공동 티켓은 포함하지 마세요.
   * 홈에 전달하지 않으면 저장소의 getMyGroupTickets() export를 자동으로 찾습니다.
   */
  loadMyGroupTickets?: () => Promise<MyGroupTicket[]>;
  groups?: {
    id: string;
    name: string;
    isDefault?: boolean;
    tickets: GroupCalendarTicket[];
  }[];
};

type StorageWithOptionalList = typeof issuedStorage & {
  getIssuedTickets?: (date: string) => Promise<IssuedTicket[]>;
  getMyGroupTickets?: () => Promise<MyGroupTicket[]>;
};

const storageWithList = issuedStorage as StorageWithOptionalList;

/**
 * 기존의 날짜별 1장 저장소와, 향후 날짜별 여러 장 저장소를 모두 지원합니다.
 * 저장소에 getIssuedTickets(date)가 추가되면 HomeScreen을 다시 수정할 필요가 없습니다.
 */
async function getTicketsForDate(date: string): Promise<IssuedTicket[]> {
  if (typeof storageWithList.getIssuedTickets === "function") {
    const tickets = await storageWithList.getIssuedTickets(date);
    return Array.isArray(tickets) ? tickets.filter(Boolean) : [];
  }
  const ticket = await getIssuedTicket(date);
  return ticket ? [ticket] : [];
}

function currentMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

// UTC 날짜 대신 사용자의 기기 날짜를 사용합니다.
function todayDateKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function dateKey(value: string | null | undefined): string {
  const match = /^(\d{4})[-.](\d{1,2})[-.](\d{1,2})/.exec(value ?? "");
  return match
    ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`
    : "";
}

// Group tickets are also written to the date archive. Keep those copies out
// of the personal record list when the group entry is available.
function issuedTicketFingerprint(
  ticket: Pick<IssuedTicket, "visitDate" | "issuedAt" | "front" | "title">,
) {
  return `${dateKey(ticket.visitDate)}:${ticket.issuedAt ?? ""}:${ticket.front ?? ""}:${ticket.title ?? ""}`;
}

/** 한 날짜에 여러 그룹의 티켓이 있어도 중복 없이 모두 표시합니다. */
function makeTicketEntries(
  selectedDay: string,
  personalTickets: IssuedTicket[],
  myGroupTickets: MyGroupTicket[],
): TicketListEntry[] {
  const used = new Set<string>();
  const items: TicketListEntry[] = [];
  const add = (
    ticket: IssuedTicket,
    source: "group" | "personal",
    groupName?: string,
  ) => {
    if (dateKey(ticket.visitDate) !== selectedDay) return;
    const typed = ticket as MyGroupTicket;
    // 서버 id가 우선이며, 기존 날짜별 로컬 티켓은 발권 시간 등으로 중복 제거.
    const uniqueKey = typed.id
      ? `id:${typed.id}`
      : `fallback:${dateKey(ticket.visitDate)}:${ticket.issuedAt ?? ""}:${ticket.front ?? ""}:${ticket.title ?? ""}`;
    if (used.has(uniqueKey)) return;
    used.add(uniqueKey);
    items.push({
      key: `${source}-${uniqueKey}`,
      ticket,
      source,
      groupName: groupName?.trim() || undefined,
      groupId: typed.groupId,
    });
  };
  myGroupTickets.forEach((ticket) => add(ticket, "group", ticket.groupName));
  personalTickets.forEach((ticket) => add(ticket, "personal"));
  return items.sort((a, b) =>
    (b.ticket.issuedAt ?? "").localeCompare(a.ticket.issuedAt ?? ""),
  );
}

function findGroupPersonalEntry(
  group: { id: string; name: string },
  groupTickets: GroupCalendarTicket[],
  commonTicket: GroupCalendarTicket | undefined,
  entries: TicketListEntry[],
): TicketListEntry | undefined {
  const listedEntry = entries.find(
    (item) =>
      item.source === "group" &&
      (item.groupId === group.id || item.groupName === group.name),
  );
  if (listedEntry) return listedEntry;

  const embeddedTicket =
    commonTicket?.memberTickets?.find(
      (memberTicket) => memberTicket.memberId === "me",
    )?.ticket ??
    groupTickets
      .find(
        (ticket) =>
          ticket.kind === "personal" &&
          dateKey(ticket.date) === dateKey(commonTicket?.date),
      )
      ?.memberTickets?.find((memberTicket) => memberTicket.memberId === "me")
      ?.ticket;
  if (!embeddedTicket) return undefined;

  return {
    key: `group-${group.id}-${dateKey(embeddedTicket.visitDate)}`,
    ticket: embeddedTicket,
    source: "group",
    groupId: group.id,
    groupName: group.name,
  };
}

function formattedDate(date: string) {
  return date.replace(/-/g, ".");
}

function dateTitle(date: string) {
  const parts = date.split(/[-.]/);
  return `${Number(parts[1] ?? 0)}월 ${Number(parts[2] ?? 0)}일`;
}

function dateLongTitle(date: string) {
  const [year, month, day] = date.split(/[-.]/).map(Number);
  const weekday = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ][new Date(year, month - 1, day).getDay()];
  return `${dateTitle(date)} ${weekday}`;
}

function ticketDateWithWeekday(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split(/[-.]/).map(Number);
  const weekday = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ][new Date(year, month - 1, day).getDay()];
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")} · ${weekday}`;
}

function showPendingFeature() {
  Alert.alert("안내", "아직 연결되지 않은 기능이에요.");
}

function BatchTicketCard({
  label,
  entry,
  commonTicket,
  emptyText = "아직 생성된 공동 티켓이 없어요",
  onPress,
}: {
  label: string;
  entry?: TicketListEntry;
  commonTicket?: { date: string; title: string };
  emptyText?: string;
  onPress: () => void;
}) {
  if (!entry && !commonTicket) {
    return (
      <View style={styles.batchEmptyTicket}>
        <Text style={styles.batchEmptyPlus}>＋</Text>
        <Text style={styles.batchEmptyText}>{emptyText}</Text>
      </View>
    );
  }
  const ticket = entry?.ticket;
  const title = commonTicket?.title || ticket?.title || label;
  const date = commonTicket?.date || ticket?.visitDate || "";
  const thumbnail = ticket?.front || (ticket?.backs ?? []).find(Boolean);
  // 개인 티켓은 왼쪽에 정보, 오른쪽에는 사진만 꽉 차게 표시합니다.
  const card = entry ? (
    <>
      <View style={styles.batchTicketStub}>
        <Text style={styles.batchStubBrand}>MEMO:RE</Text>
        <Text style={styles.batchTicketTitle} numberOfLines={2}>
          {ticket?.title || label}
        </Text>
        <Text style={styles.batchStubDate} numberOfLines={1}>
          {ticketDateWithWeekday(ticket?.visitDate || date)}
        </Text>
        <Text style={styles.batchStubLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.batchTicketPhotoPanel}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.batchTicketFullPhoto}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.batchTicketFullPhoto, styles.batchTicketPhotoEmpty]}
          />
        )}
      </View>
    </>
  ) : (
    <>
      <View style={styles.batchTicketStub}>
        <Text style={styles.batchStubBrand}>MEMO:RE</Text>
        <Text style={styles.batchTicketTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.batchStubDate} numberOfLines={1}>
          {ticketDateWithWeekday(date)}
        </Text>
        <Text style={styles.batchStubLabel} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <View style={styles.batchTicketDetails}>
        <Text style={styles.batchTicketBrand} numberOfLines={1}>
          MEMORY BOARDING PASS
        </Text>
        <View style={styles.batchTicketImageWrap}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.batchTicketPhoto}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[styles.batchTicketPhoto, styles.batchTicketPhotoEmpty]}
            />
          )}
        </View>
        <Text style={styles.batchTicketName} numberOfLines={1}>
          {ticket?.title || title}
        </Text>
        <Text style={styles.batchTicketCaption} numberOfLines={1}>
          {formattedDate(date)}
        </Text>
      </View>
    </>
  );
  if (!entry) return <View style={styles.batchTicket}>{card}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${ticket?.title || "티켓"} 보기`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.batchTicket,
        pressed && styles.slotPressed,
      ]}
    >
      {card}
    </Pressable>
  );
}

export default function HomeScreen({
  onOpenMy,
  onOpenGroup,
  onOpenTickets,
  groups = [],
  dateSelectionMode = false,
  onCancelDateSelection,
  loadIssuedTicketsForDate,
  loadMyGroupTickets,
}: HomeScreenProps) {
  const [monthDate, setMonthDate] = useState(currentMonth);
  const [issuedDates, setIssuedDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    dateSelectionMode ? null : todayDateKey(),
  );
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [groupTicketPage, setGroupTicketPage] = useState<IssuedTicket | null>(
    null,
  );
  const [groupTicketIsPersonal, setGroupTicketIsPersonal] = useState(false);
  const [dateTickets, setDateTickets] = useState<TicketListEntry[]>([]);
  const [myGroupTickets, setMyGroupTickets] = useState<MyGroupTicket[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [showingBack, setShowingBack] = useState(false);
  const [savingTicketImage, setSavingTicketImage] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // GroupScreen also separates the built-in default group from regular groups.
  // The Home "나의 기록" tile represents the personal record, so don't render
  // the built-in group again as an unknown group card.
  const regularGroups = useMemo(
    () => groups.filter((group) => !group.isDefault),
    [groups],
  );
  const calendarRows = Math.ceil(
    (new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay() +
      new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      ).getDate()) /
      7,
  );
  const calendarHeight = Math.round(screenHeight * 0.51);
  const calendarDayCellHeight = Math.max(
    42,
    Math.floor((calendarHeight - 90) / calendarRows),
  );

  // 티켓은 원본 320×128 비율을 유지하며 작게 보여줍니다.
  // 가로 원본을 90도 회전시키기 때문에, 팝업의 세로 길이는 원본 가로 길이입니다.
  // 이전처럼 원본을 500px 넘게 키우면 이미지가 지나치게 확대/잘릴 수 있습니다.

  const fetchDateTickets = useCallback(
    (date: string) =>
      loadIssuedTicketsForDate
        ? loadIssuedTicketsForDate(date)
        : getTicketsForDate(date),
    [loadIssuedTicketsForDate],
  );

  const fetchMyGroupTickets = useCallback(async (): Promise<
    MyGroupTicket[]
  > => {
    const loader = loadMyGroupTickets ?? storageWithList.getMyGroupTickets;
    const result =
      typeof loader === "function"
        ? await loader()
        : groups.flatMap((group) =>
            group.tickets.flatMap((groupTicket) =>
              (groupTicket.memberTickets ?? [])
                .filter((memberTicket) => memberTicket.memberId === "me")
                .map((memberTicket) => ({
                  ...memberTicket.ticket,
                  groupId: group.id,
                  groupName: group.name,
                })),
            ),
          );
    if (!Array.isArray(result))
      throw new Error("그룹 티켓 응답이 배열이 아닙니다.");
    // 호출자가 현재 로그인한 사용자의 티켓만 제공한다는 계약입니다.
    return result.filter((ticket): ticket is MyGroupTicket =>
      Boolean(ticket && typeof ticket.visitDate === "string"),
    );
  }, [groups, loadMyGroupTickets]);

  // 달력에서도 그룹 티켓이 발권된 날짜에 티켓 마크를 표시합니다.
  useEffect(() => {
    let active = true;
    void fetchMyGroupTickets()
      .then((tickets) => {
        if (active) setMyGroupTickets(tickets);
      })
      .catch((error) => {
        console.warn(
          "그룹에서 만든 내 티켓 목록을 불러오지 못했습니다.",
          error,
        );
      });
    return () => {
      active = false;
    };
  }, [fetchMyGroupTickets]);

  const markedDates = useMemo(() => {
    const dates = new Set(issuedDates);
    myGroupTickets.forEach((ticket) => {
      const key = dateKey(ticket.visitDate);
      if (key) dates.add(key);
    });
    groups.forEach((group) => {
      group.tickets.forEach((ticket) => {
        if (ticket.kind === "personal") return;
        const key = dateKey(ticket.date);
        if (key) dates.add(key);
      });
    });
    return dates;
  }, [issuedDates, myGroupTickets, groups]);

  // A group ticket is also stored in the date archive, so count its date once.
  const recordCount = useMemo(() => {
    const dates = new Set(issuedDates);
    myGroupTickets.forEach((ticket) => {
      const key = dateKey(ticket.visitDate);
      if (key) dates.add(key);
    });
    return dates.size;
  }, [issuedDates, myGroupTickets]);

  const selectedDaySlots = selectedDate
    ? [
        {
          key: "personal",
          label: "나의 기록",
          commonTicket: undefined,
          entry: dateTickets.find((item) => item.source === "personal"),
        },
        ...regularGroups.map((group) => {
          const commonTicket = group.tickets.find(
            (ticket) =>
              ticket.kind !== "personal" &&
              dateKey(ticket.date) === selectedDate,
          );
          return {
            key: group.id,
            label: group.name,
            commonTicket,
            entry: commonTicket
              ? findGroupPersonalEntry(
                  group,
                  group.tickets,
                  commonTicket,
                  dateTickets,
                )
              : undefined,
          };
        }),
      ]
    : [];

  const openGroupTicketPage = (
    ticket: IssuedTicket,
    openedFromGroup = false,
  ) => {
    setShowingBack(false);
    setGroupTicketIsPersonal(openedFromGroup);
    setGroupTicketPage(ticket);
  };

  const saveTicketImage = async () => {
    if (savingTicketImage) return;
    const imageUri = groupTicketPage?.front;
    if (!imageUri) {
      Alert.alert(
        "저장할 사진이 없어요",
        "이 티켓에는 저장할 사진이 없습니다.",
      );
      return;
    }
    setSavingTicketImage(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true, [
        "photo",
      ]);
      if (permission.status !== "granted") {
        Alert.alert(
          "사진 저장 권한",
          "갤러리에 저장하려면 사진 저장 권한을 허용해 주세요.",
        );
        return;
      }
      if (!imageUri.startsWith("file://")) {
        throw new Error("티켓 사진의 로컬 파일을 찾을 수 없어요.");
      }
      await MediaLibrary.saveToLibraryAsync(imageUri);
      Alert.alert("저장 완료", "개인 티켓 사진을 갤러리에 저장했어요.");
    } catch (error: unknown) {
      console.error("티켓 이미지 저장 실패", error);
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("저장 실패", `티켓 이미지를 저장하지 못했어요.\n${message}`);
    } finally {
      setSavingTicketImage(false);
    }
  };

  const openCalendarDate = async (date: string) => {
    if (date > todayDateKey()) {
      Alert.alert(
        "미래 날짜는 선택할 수 없어요",
        dateSelectionMode
          ? "오늘 또는 지난 날짜에만 티켓 날짜를 선택할 수 있어요."
          : "미래 날짜에는 발권된 티켓이 없어요.",
      );
      return;
    }
    // 날짜 선택 화면은 기존 생성 흐름에서 사용합니다. 일반 홈 달력은 조회만 합니다.
    if (dateSelectionMode) {
      onOpenTickets(date);
      return;
    }
    setListLoading(true);
    try {
      const [personalResult, groupResult] = await Promise.allSettled([
        fetchDateTickets(date),
        fetchMyGroupTickets(),
      ]);
      const personalTickets =
        personalResult.status === "fulfilled" &&
        Array.isArray(personalResult.value)
          ? personalResult.value
          : [];
      const groupTickets =
        groupResult.status === "fulfilled" ? groupResult.value : myGroupTickets;
      if (
        personalResult.status === "rejected" &&
        groupResult.status === "rejected"
      ) {
        throw new Error("개인 및 그룹 티켓 조회 실패");
      }
      if (groupResult.status === "fulfilled") setMyGroupTickets(groupTickets);

      const groupTicketCopies = new Set(
        groupTickets.map(issuedTicketFingerprint),
      );
      const personalOnlyTickets = personalTickets.filter(
        (ticket) => !groupTicketCopies.has(issuedTicketFingerprint(ticket)),
      );
      const entries = makeTicketEntries(
        date,
        personalOnlyTickets,
        groupTickets,
      );
      setDateTickets(entries);
      setSelectedDate(date);
      setShowAllTickets(false);
      setShowingBack(false);
      if (groupResult.status === "rejected") {
        Alert.alert(
          "일부 티켓 조회 실패",
          "그룹 티켓을 불러오지 못해 현재 확인 가능한 티켓만 보여드려요.",
        );
      }
    } catch {
      Alert.alert(
        "티켓 확인 오류",
        "티켓을 불러오지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (!dateSelectionMode && selectedDate) void openCalendarDate(selectedDate);
    // Initial home load should show today's personal and per-group tickets.
  }, []);

  useEffect(() => {
    if (!dateSelectionMode && selectedDate && groups.length > 0) {
      void openCalendarDate(selectedDate);
    }
    // Refresh today's slots when App finishes loading or updating group tickets.
  }, [groups]);

  const todayKey = todayDateKey();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

  // 달을 바꿀 때 날짜마다 발권 여부를 다시 확인합니다.
  useEffect(() => {
    let active = true;
    setIssuedDates(new Set());
    const dates = Array.from(
      { length: lastDay },
      (_, index) =>
        `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    );
    Promise.all(
      dates.map(async (date) => {
        try {
          const tickets = await fetchDateTickets(date);
          return tickets.length ? date : null;
        } catch {
          return null;
        }
      }),
    ).then((datesWithTickets) => {
      if (active) {
        setIssuedDates(
          new Set(datesWithTickets.filter((d): d is string => !!d)),
        );
      }
    });
    return () => {
      active = false;
    };
  }, [year, month, lastDay, fetchDateTickets]);

  const cellCount = Math.ceil((firstDay + lastDay) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstDay + 1;
    return day >= 1 && day <= lastDay ? day : null;
  });

  function changeMonth(amount: number) {
    setMonthDate(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() + amount, 1),
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.page}>
        {groupTicketPage ? (
          <View style={styles.groupTicketPage}>
            <View style={styles.groupTicketHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="홈으로 돌아가기"
                onPress={() => setGroupTicketPage(null)}
                style={styles.groupTicketBackButton}
              >
                <Text style={styles.fullListBackIcon}>‹</Text>
              </Pressable>
              <Text style={styles.groupTicketHeaderTitle}>내 티켓</Text>
              <View style={styles.groupTicketHeaderSpacer} />
            </View>
            <View style={styles.groupTicketMeta}>
              <Text style={styles.groupTicketDate}>
                {formattedDate(groupTicketPage.visitDate)}
              </Text>
              <Text style={styles.groupTicketMenu}>•••</Text>
            </View>
            <View style={styles.groupTicketPreviewArea}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showingBack ? "티켓 앞면 보기" : "티켓 뒷면 보기"
                }
                accessibilityHint="티켓을 누르면 앞면과 뒷면이 바뀝니다"
                onPress={() => setShowingBack((current) => !current)}
                style={({ pressed }) => [
                  styles.groupTicketPreview,
                  pressed && styles.slotPressed,
                ]}
              >
                {groupTicketIsPersonal ? (
                  showingBack ? (
                    <PersonalTicketBack
                      ticket={groupTicketPage}
                      width={Math.min(screenWidth - 48, 390)}
                    />
                  ) : (
                    <PersonalPhotoTicket
                      ticket={groupTicketPage}
                      width={Math.min(screenWidth - 48, 390)}
                    />
                  )
                ) : (
                  <IssuedTicketFlipPreview
                    ticket={groupTicketPage}
                    showingBack={showingBack}
                    ticketWidth={Math.min(screenWidth - 48, 390)}
                    onMore={() =>
                      Alert.alert(
                        "뒷면 문구",
                        groupTicketPage.memo || "기록된 글이 없어요.",
                      )
                    }
                  />
                )}
              </Pressable>
              <View style={styles.ticketImageSaveRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이미지 저장"
                  accessibilityState={{ disabled: savingTicketImage }}
                  disabled={savingTicketImage}
                  onPress={() => void saveTicketImage()}
                  style={({ pressed }) => [
                    styles.ticketImageSaveButton,
                    pressed && styles.slotPressed,
                  ]}
                >
                  <Text style={styles.ticketImageSaveText}>
                    {savingTicketImage ? "저장 중" : "이미지 저장"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : showAllTickets && selectedDate ? (
          <View style={styles.fullListPage}>
            <View style={styles.fullListHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="나의 기록으로 돌아가기"
                onPress={() => setShowAllTickets(false)}
                style={styles.fullListBackButton}
              >
                <Text style={styles.fullListBackIcon}>‹</Text>
              </Pressable>
              <Text style={styles.fullListDate}>{dateTitle(selectedDate)}</Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.fullListContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fullListTitle}>오늘의 티켓</Text>
              <Text style={styles.fullListSectionLabel}>나의 기록</Text>
              <BatchTicketCard
                label="나의 기록"
                entry={dateTickets.find((item) => item.source === "personal")}
                emptyText="이 날짜에 만든 나의 기록이 없어요"
                onPress={() => {
                  const entry = dateTickets.find(
                    (item) => item.source === "personal",
                  );
                  if (!entry) return;
                  openGroupTicketPage(entry.ticket);
                }}
              />
              {regularGroups.flatMap((group) => {
                const commonTicket = group.tickets.find(
                  (ticket) =>
                    ticket.kind !== "personal" &&
                    dateKey(ticket.date) === selectedDate,
                );
                const entry = commonTicket
                  ? findGroupPersonalEntry(
                      group,
                      group.tickets,
                      commonTicket,
                      dateTickets,
                    )
                  : undefined;
                // 공동 티켓 자체와 다른 멤버의 티켓은 목록에 넣지 않습니다.
                // 이 날짜에 내가 만든 연결 개인 티켓이 있는 그룹만 노출합니다.
                if (!commonTicket || !entry) return [];
                return [
                  <View key={group.id} style={styles.fullGroupSection}>
                    <Text style={styles.fullListGroupLabel}>{group.name}</Text>
                    <BatchTicketCard
                      label={group.name}
                      entry={commonTicket ? entry : undefined}
                      commonTicket={commonTicket}
                      onPress={() => {
                        openGroupTicketPage(entry.ticket, true);
                      }}
                    />
                  </View>,
                ];
              })}
            </ScrollView>
            <BottomNavigation
              activeTab="home"
              onSelect={(tab) => {
                if (tab === "home") setShowAllTickets(false);
                else if (tab === "group") onOpenGroup();
                else if (tab === "my") onOpenMy();
                else showPendingFeature();
              }}
            />
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                {dateSelectionMode && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="날짜 선택 취소"
                    onPress={onCancelDateSelection}
                    style={styles.menuButton}
                  >
                    <Text style={styles.menuText}>‹</Text>
                  </Pressable>
                )}
                {dateSelectionMode ? (
                  <Text style={styles.dateSelectionTitle}>티켓 날짜 선택</Text>
                ) : (
                  <Image
                    source={logo}
                    resizeMode="contain"
                    accessibilityLabel="MEMO:RE"
                    style={styles.logo}
                  />
                )}
              </View>
              {dateSelectionMode && (
                <Text style={styles.dateSelectionHint}>
                  오늘 또는 지난 날짜를 선택해 주세요.
                </Text>
              )}
              {!dateSelectionMode && (
                <View style={styles.recordsHeading}>
                  <Text accessibilityRole="header" style={styles.recordsTitle}>
                    나의 기록
                  </Text>
                  <Text style={styles.recordsCount}>{recordCount}장</Text>
                </View>
              )}
              <View style={[styles.calendar, { minHeight: calendarHeight }]}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="이전 달"
                    onPress={() => changeMonth(-1)}
                    style={styles.monthButton}
                  >
                    <Text style={styles.arrow}>‹</Text>
                  </Pressable>
                  <Text accessibilityRole="header" style={styles.monthTitle}>
                    {year}.{String(month + 1).padStart(2, "0")}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="다음 달"
                    onPress={() => changeMonth(1)}
                    style={styles.monthButton}
                  >
                    <Text style={styles.arrow}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.weekdays}>
                  {weekdays.map((day) => (
                    <Text key={day} style={styles.weekday}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.days}>
                  {days.map((day, index) => (
                    <View
                      key={`${year}-${month}-${index}`}
                      style={[
                        styles.dayCell,
                        { height: calendarDayCellHeight },
                      ]}
                    >
                      {day !== null &&
                        (() => {
                          const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const issued = markedDates.has(date);
                          const isFutureDate = date > todayKey;
                          return (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${year}년 ${month + 1}월 ${day}일 ${isFutureDate ? "미래 날짜, 선택 불가" : dateSelectionMode ? "티켓 날짜 선택" : issued ? "발권한 티켓 목록" : "발권된 티켓 없음"}`}
                              accessibilityState={{ disabled: isFutureDate }}
                              disabled={isFutureDate || listLoading}
                              onPress={() => void openCalendarDate(date)}
                              style={[
                                styles.dateButton,
                                isFutureDate && styles.futureDateButton,
                              ]}
                            >
                              {issued ? (
                                <View style={styles.issuedDay}>
                                  <Text style={styles.issuedDayText}>
                                    {day}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={styles.dayText}>{day}</Text>
                              )}
                            </Pressable>
                          );
                        })()}
                    </View>
                  ))}
                </View>
              </View>
              {!dateSelectionMode && selectedDate && (
                <View style={styles.selectedTicketsSection}>
                  <View style={styles.selectedTicketsHeading}>
                    <Text style={styles.selectedDateTitle}>
                      {dateLongTitle(selectedDate)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="이 날짜 티켓 전체 보기"
                      onPress={() => setShowAllTickets(true)}
                      style={styles.fullViewButton}
                    >
                      <Text style={styles.fullViewText}>전체 보기</Text>
                    </Pressable>
                  </View>
                  {listLoading ? (
                    <Text style={styles.emptyTickets}>
                      티켓을 불러오는 중이에요.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.ticketSlots}
                    >
                      {selectedDaySlots.map(
                        ({ key, label, entry, commonTicket }) => (
                          <Pressable
                            key={key}
                            accessibilityRole="button"
                            accessibilityLabel={`${label} 공통 티켓 ${commonTicket ? "있음" : "없음"}`}
                            disabled={
                              !entry || (key !== "personal" && !commonTicket)
                            }
                            onPress={() => {
                              if (!entry) return;
                              if (key !== "personal" && commonTicket) {
                                openGroupTicketPage(entry.ticket, true);
                                return;
                              }
                              if (key === "personal" && entry) {
                                setShowAllTickets(true);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.ticketSlot,
                              entry && pressed && styles.slotPressed,
                            ]}
                          >
                            {key === "personal" && entry ? (
                              <>
                                <View style={styles.slotTicketStub}>
                                  <Text
                                    style={styles.slotTicketName}
                                    numberOfLines={2}
                                  >
                                    {entry.ticket.title || label}
                                  </Text>
                                  <Text style={styles.slotTicketDate}>
                                    {formattedDate(entry.ticket.visitDate)}
                                  </Text>
                                </View>
                                <View style={styles.slotTicketPhoto}>
                                  {entry.ticket.front ? (
                                    <Image
                                      source={{ uri: entry.ticket.front }}
                                      style={styles.slotTicketImage}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View style={styles.slotTicketEmptyImage} />
                                  )}
                                </View>
                              </>
                            ) : commonTicket ? (
                              <View style={styles.commonTicketSummary}>
                                <Text style={styles.commonTicketDate}>
                                  {formattedDate(commonTicket.date)}
                                </Text>
                                <Text
                                  style={styles.commonTicketTitle}
                                  numberOfLines={3}
                                >
                                  {commonTicket.title}
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.emptySlot}>
                                <Text style={styles.emptySlotPlus}>＋</Text>
                              </View>
                            )}
                            <Text style={styles.slotLabel} numberOfLines={1}>
                              {label}
                            </Text>
                          </Pressable>
                        ),
                      )}
                      {selectedDaySlots.length === 0 && (
                        <Text style={styles.emptyTickets}>
                          표시할 그룹이 없어요.
                        </Text>
                      )}
                    </ScrollView>
                  )}
                </View>
              )}
            </ScrollView>
            {!dateSelectionMode && (
              <BottomNavigation
                activeTab="home"
                onSelect={(tab) => {
                  if (tab === "home") setMonthDate(currentMonth());
                  else if (tab === "group") onOpenGroup();
                  else if (tab === "my") onOpenMy();
                  else showPendingFeature();
                }}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", backgroundColor: colors.canvas },
  page: { flex: 1, width: "100%", maxWidth: 420 },
  content: { flexGrow: 1, paddingBottom: 40 },
  header: {
    height: 78,
    paddingTop: 18,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    position: "absolute",
    top: 38,
    left: 20,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { fontSize: 25, color: colors.primary },
  logo: { width: 132, height: 46, alignSelf: "flex-start", marginLeft: 18 },
  recordsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: 6,
    marginBottom: 12,
  },
  recordsTitle: { color: colors.text, fontSize: 23, fontWeight: "700" },
  recordsCount: { color: colors.secondary, fontSize: 12, fontWeight: "600" },
  dateSelectionTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  dateSelectionHint: {
    color: colors.secondary,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  calendar: {
    marginHorizontal: 12,
    borderRadius: 0,
    borderWidth: 0,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 13,
    justifyContent: "space-between",
  },
  monthButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { fontSize: 28, color: colors.text },
  monthTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.text,
  },
  weekdays: { flexDirection: "row", marginBottom: 0 },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    color: colors.secondary,
  },
  days: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.285714%",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  dateButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  futureDateButton: { opacity: 0.32 },
  dayText: { fontSize: 13, lineHeight: 18, color: colors.text },
  issuedDay: {
    width: 34,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  issuedDayText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Group 화면의 하단 바와 통일: 4등분, 50 높이, 기본 안드로이드 글꼴.
  // 검은 하단 가로줄은 Android 시스템 제스처 표시줄이므로 별도로 그리지 않습니다.
  bottomNav: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  navButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    color: "#352722",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    textAlign: "center",
  },
  activeText: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  selectedTicketsSection: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selectedTicketsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  selectedDateTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  fullViewButton: { paddingVertical: 6, paddingHorizontal: 8 },
  fullViewText: { color: "#3F63E9", fontSize: 11, fontWeight: "700" },
  ticketSlots: { gap: 12, paddingRight: 16, paddingBottom: 8 },
  ticketSlot: {
    width: 68,
    height: 134,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#E7E9EF",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 7,
  },
  slotPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  slotTicketStub: {
    width: "100%",
    flex: 1,
    padding: 7,
    justifyContent: "space-between",
    backgroundColor: "#CBD9F1",
  },
  slotTicketName: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
  },
  slotTicketDate: { color: colors.secondary, fontSize: 8 },
  slotTicketPhoto: { width: "100%", height: 42, backgroundColor: "#D9DCE4" },
  slotTicketImage: { width: "100%", height: "100%" },
  slotTicketEmptyImage: { flex: 1, backgroundColor: "#D9DCE4" },
  slotLabel: {
    width: "100%",
    color: colors.text,
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 3,
    paddingTop: 3,
  },
  emptySlot: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySlotPlus: { color: colors.text, fontSize: 19, lineHeight: 23 },
  commonTicketSummary: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 6,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E7E9EF",
  },
  commonTicketDate: { color: colors.secondary, fontSize: 9, lineHeight: 12 },
  commonTicketTitle: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  personalPhotoTicket: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#F2F3F6",
    padding: 6,
    borderWidth: 1,
    borderColor: "#E6E8ED",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
  personalPhotoCollage: {
    width: "100%",
    flexDirection: "row",
    gap: 4,
    overflow: "hidden",
    borderRadius: 7,
    backgroundColor: "#E7E9EF",
  },
  personalPhotoSingle: { width: "100%", height: "100%" },
  personalPhotoMain: { width: "64%", height: "100%", borderRadius: 5 },
  personalPhotoSide: { flex: 1, gap: 4 },
  personalPhotoThumb: { flex: 1, width: "100%", borderRadius: 5 },
  personalPhotoThumbPlaceholder: { flex: 1 },
  personalPhotoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  personalPhotoPlaceholderText: { color: colors.secondary, fontSize: 11 },
  personalPhotoCaptionRow: {
    height: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
  },
  personalPhotoTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  personalPhotoDate: { color: colors.secondary, fontSize: 9, marginLeft: 8 },
  personalTicketBack: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B9BDC6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
    elevation: 2,
  },
  personalTicketBackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personalTicketBackLabel: { color: "#3F63E9", fontSize: 8, fontWeight: "700" },
  personalTicketBackDate: { color: colors.secondary, fontSize: 8 },
  personalTicketBackMemo: {
    marginTop: 18,
    color: "#454955",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "left",
  },

  groupTicketPage: { flex: 1, backgroundColor: "#FFFFFF" },
  groupTicketHeader: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  groupTicketBackButton: {
    width: 38,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  groupTicketHeaderTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  groupTicketHeaderSpacer: { width: 38 },
  groupTicketMeta: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  groupTicketDate: { color: colors.secondary, fontSize: 10 },
  groupTicketMenu: { color: colors.primary, fontSize: 16, letterSpacing: 2 },
  groupTicketPreviewArea: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 76,
  },
  groupTicketPreview: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
  ticketImageSaveRow: {
    width: "100%",
    alignItems: "flex-end",
    paddingRight: 20,
    marginTop: 78,
  },
  ticketImageSaveButton: {
    minWidth: 112,
    height: 42,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D7E1FF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  ticketImageSaveText: { color: "#3F63E9", fontSize: 11, fontWeight: "600" },

  fullListPage: { flex: 1, backgroundColor: colors.surface },
  fullListHeader: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 16,
  },
  fullListBackButton: {
    width: 34,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  fullListBackIcon: { color: colors.primary, fontSize: 30, lineHeight: 34 },
  fullListDate: { color: colors.text, fontSize: 15, fontWeight: "700" },
  fullListContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 22 },
  fullListTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "700",
    marginBottom: 16,
  },
  fullListSectionLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  fullListGroupLabel: {
    color: "#3F63E9",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  fullGroupSection: { marginTop: 18 },
  batchTicket: {
    width: "100%",
    height: 144,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE3ED",
    backgroundColor: "#FFFFFF",
  },
  batchTicketFullPhoto: { width: "100%", height: "100%" },
  batchTicketStub: {
    width: "25%",
    backgroundColor: "#E6B9D0",
    paddingVertical: 13,
    paddingHorizontal: 9,
    justifyContent: "space-between",
  },
  batchTicketPhotoPanel: {
    flex: 1,
    height: "100%",
    backgroundColor: "#DDE3ED",
  },
  batchStubBrand: {
    color: colors.secondary,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.3,
  },
  batchStubDate: { color: colors.secondary, fontSize: 8, lineHeight: 11 },
  batchStubLabel: {
    color: colors.text,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "500",
  },
  batchTicketDetails: { flex: 1, paddingHorizontal: 12, paddingVertical: 8 },
  batchTicketBrand: {
    color: colors.secondary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  batchTicketImageWrap: {
    width: "100%",
    height: 49,
    borderRadius: 5,
    backgroundColor: "#F1E9E1",
    overflow: "hidden",
    marginBottom: 5,
  },
  batchTicketPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#E7E9EF",
  },
  batchTicketPhotoEmpty: { backgroundColor: "#DDE3ED" },
  batchTicketTitle: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  batchTicketName: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  batchTicketCaption: {
    color: colors.secondary,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 2,
  },
  batchEmptyTicket: {
    width: "100%",
    height: 144,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DDE3ED",
    backgroundColor: "#F1F4F8",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  batchEmptyPlus: { color: colors.secondary, fontSize: 24, lineHeight: 28 },
  batchEmptyText: { color: colors.secondary, fontSize: 10 },

  // 날짜별 티켓 목록
  ticketListPage: { flex: 1, backgroundColor: colors.canvas },
  listHeader: {
    height: 114,
    paddingTop: 39,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  listBackButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F5EEE7",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  listBackIcon: { color: colors.primary, fontSize: 28, lineHeight: 32 },
  listHeaderTitle: { color: "#352722", fontSize: 19, fontWeight: "700" },
  listScroll: { flex: 1 },
  listScrollContent: {
    paddingHorizontal: 8,
    paddingTop: 38,
    paddingBottom: 60,
    gap: 16,
  },
  listCount: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  groupSourceNotice: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 19,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  listTicket: {
    width: "100%",
    aspectRatio: 2.5,
    flexDirection: "row",
    borderRadius: 13,
    backgroundColor: colors.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE5DD",
  },
  listTicketPressed: { opacity: 0.86 },
  listTicketStub: {
    width: "20%",
    backgroundColor: "#E8CAC2",
    paddingHorizontal: 7,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  stubCaption: { color: colors.secondary, fontSize: 7, lineHeight: 10 },
  stubTitle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    flex: 1,
    marginTop: 7,
  },
  stubFooter: { gap: 5 },
  stubDate: { color: colors.secondary, fontSize: 7, lineHeight: 9 },
  stubLocation: { color: colors.secondary, fontSize: 8, lineHeight: 10 },
  stubDashedLine: {
    width: 2,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "#FFF8EF",
  },
  listTicketPhoto: {
    flex: 1,
    position: "relative",
    backgroundColor: "#F1E9E1",
  },
  listTicketImage: { width: "100%", height: "100%" },
  listTicketImageEmpty: { flex: 1, backgroundColor: "#F1E9E1" },
  listTicketPhotoDate: {
    position: "absolute",
    left: 6,
    bottom: 4,
    color: colors.surface,
    fontSize: 7,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyTickets: { color: colors.secondary, textAlign: "center", marginTop: 40 },

  // 티켓 선택 후 앞/뒷면 세로 미리보기
  previewOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingTop: 40,
  },
  verticalTicketHolder: {
    alignItems: "center",
    justifyContent: "center",
    // 이미지/스티커가 카드 밖으로 뻗더라도 모달 전체를 덮지 않도록 제한합니다.
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  rotatedTicket: {
    position: "absolute",
    transform: [{ rotate: "90deg" }],
  },
  emptyTicketBack: {
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  previewBottom: { width: "100%", paddingHorizontal: 22, paddingBottom: 36 },
  previewBackButton: {
    height: 49,
    width: "100%",
    backgroundColor: "#59453B",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBackText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
