import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { getIssuedTicket, type IssuedTicket } from "../storage/issued-tickets";
import { IssuedTicketFlipPreview } from "./TicketEditor";
import MenuExperience from "./MenuScreens";

import logo from "./assets/로고.png";
import ticketIcon from "./assets/티켓로고아이콘.png";

const colors = {
  canvas: "#FFF8EF",
  surface: "#FFFDF8",
  primary: "#654C40",
  secondary: "#987966",
  accent: "#CF897C",
  soft: "#F0C8BE",
  text: "#5C473E",
  overlay: "rgba(48, 38, 34, 0.27)",
};

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** 로그인한 사용자가 각 그룹에서 직접 발권한 개인 티켓입니다. */
export type MyGroupTicket = IssuedTicket & {
  id?: string;
  groupId?: string;
  groupName?: string;
};

type TicketListEntry = {
  key: string;
  ticket: IssuedTicket;
  source: "group" | "personal";
  groupName?: string;
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
   */
  loadMyGroupTickets?: () => Promise<MyGroupTicket[]>;
};

async function getTicketsForDate(date: string): Promise<IssuedTicket[]> {
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

/** 한 날짜에 여러 그룹의 티켓이 있어도 중복 없이 모두 표시합니다. */
function makeTicketEntries(
  selectedDay: string,
  personalTickets: IssuedTicket[],
  myGroupTickets: MyGroupTicket[],
): TicketListEntry[] {
  const used = new Set<string>();
  const items: TicketListEntry[] = [];
  const add = (
    ticket: MyGroupTicket,
    source: "group" | "personal",
    groupName?: string,
  ) => {
    if (dateKey(ticket.visitDate) !== selectedDay) return;
    // 서버 id가 우선이며, 기존 날짜별 로컬 티켓은 발권 시간 등으로 중복 제거.
    const uniqueKey = ticket.id
      ? `id:${ticket.id}`
      : `fallback:${dateKey(ticket.visitDate)}:${ticket.issuedAt ?? ""}:${ticket.front ?? ""}:${ticket.title ?? ""}`;
    if (used.has(uniqueKey)) return;
    used.add(uniqueKey);
    items.push({
      key: `${source}-${uniqueKey}`,
      ticket,
      source,
      groupName: groupName?.trim() || undefined,
    });
  };
  myGroupTickets.forEach((ticket) => add(ticket, "group", ticket.groupName));
  personalTickets.forEach((ticket) => add(ticket, "personal"));
  return items.sort((a, b) =>
    (b.ticket.issuedAt ?? "").localeCompare(a.ticket.issuedAt ?? ""),
  );
}

function formattedDate(date: string) {
  return date.replace(/-/g, ".");
}

function dateTitle(date: string) {
  const parts = date.split(/[-.]/);
  return `${Number(parts[1] ?? 0)}월 ${Number(parts[2] ?? 0)}일`;
}

function showPendingFeature() {
  Alert.alert("안내", "아직 연결되지 않은 기능이에요.");
}

/** 날짜별 목록에 보이는 가로형 티켓 카드(피그마 2번 화면). */
function TicketListCard({
  entry,
  index,
  onPress,
}: {
  entry: TicketListEntry;
  index: number;
  onPress: () => void;
}) {
  const { ticket } = entry;
  const title = ticket.title?.trim() || "우리들의 기억";
  const ticketDate = formattedDate(ticket.visitDate || "");
  const thumbnail = ticket.front || (ticket.backs ?? []).find(Boolean);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} 티켓 ${index + 1}번 보기`}
      style={({ pressed }) => [
        styles.listTicket,
        pressed && styles.listTicketPressed,
      ]}
    >
      <View style={styles.listTicketStub}>
        <Text style={styles.stubCaption}>
          {entry.source === "group" ? "GROUP TICKET" : "TICKET"}
        </Text>
        <Text style={styles.stubTitle} numberOfLines={3}>
          {title}
        </Text>
        <Text style={styles.stubDate} numberOfLines={1}>
          {ticketDate}
        </Text>
      </View>
      <View style={styles.stubDashedLine} />
      <View style={styles.listTicketMain}>
        <Text style={styles.listTicketBrand} numberOfLines={1}>
          MEMORY BOARDING PASS
        </Text>
        <View style={styles.listTicketImageWrap}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.listTicketImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.listTicketImageEmpty} />
          )}
        </View>
        <Text style={styles.listTicketName} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.listTicketDescription} numberOfLines={1}>
          {entry.source === "group"
            ? `${entry.groupName || "그룹에서 만든 내 티켓"} · ${ticketDate}`
            : ticketDate}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen({
  onOpenMy,
  onOpenGroup,
  onOpenTickets,
  dateSelectionMode = false,
  onCancelDateSelection,
  onLogout,
  loadIssuedTicketsForDate,
  loadMyGroupTickets,
}: HomeScreenProps) {
  const [monthDate, setMonthDate] = useState(currentMonth);
  const [issuedDates, setIssuedDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateTickets, setDateTickets] = useState<TicketListEntry[]>([]);
  const [myGroupTickets, setMyGroupTickets] = useState<MyGroupTicket[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [previewTicket, setPreviewTicket] = useState<IssuedTicket | null>(null);
  const [showingBack, setShowingBack] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 티켓은 원본 320×128 비율을 유지하며 작게 보여줍니다.
  // 가로 원본을 90도 회전시키기 때문에, 팝업의 세로 길이는 원본 가로 길이입니다.
  // 이전처럼 원본을 500px 넘게 키우면 이미지가 지나치게 확대/잘릴 수 있습니다.
  const verticalTicketHeight = Math.max(
    180,
    Math.min(700, screenHeight - 260, (screenWidth - 64) * 2.5),
  );
  const verticalTicketWidth = verticalTicketHeight * (128 / 320);

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
    const loader = loadMyGroupTickets;
    if (typeof loader !== "function") return [];
    const result = await loader();
    if (!Array.isArray(result))
      throw new Error("그룹 티켓 응답이 배열이 아닙니다.");
    // 호출자가 현재 로그인한 사용자의 티켓만 제공한다는 계약입니다.
    return result.filter((ticket): ticket is MyGroupTicket =>
      Boolean(ticket && typeof ticket.visitDate === "string"),
    );
  }, [loadMyGroupTickets]);

  const groupSourceConnected = Boolean(loadMyGroupTickets);

  // 달력에서도 그룹 티켓이 발권된 날짜에 티켓 마크를 표시합니다.
  useEffect(() => {
    let active = true;
    void fetchMyGroupTickets()
      .then((tickets) => {
        if (active) setMyGroupTickets(tickets);
      })
      .catch(() => {
        if (active && loadMyGroupTickets) {
          Alert.alert(
            "티켓 조회 오류",
            "내 그룹 티켓 목록을 불러오지 못했어요.",
          );
        }
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
    return dates;
  }, [issuedDates, myGroupTickets]);

  const groupCount = dateTickets.filter(
    (item) => item.source === "group",
  ).length;

  const closePreview = () => {
    setPreviewTicket(null);
    setShowingBack(false);
  };

  const returnToCalendar = () => {
    closePreview();
    setSelectedDate(null);
    setDateTickets([]);
  };

  const openCalendarDate = async (date: string, issued: boolean) => {
    if (date > todayDateKey()) {
      Alert.alert(
        "미래 날짜는 선택할 수 없어요",
        "오늘 또는 지난 날짜에만 티켓을 만들 수 있어요.",
      );
      return;
    }
    // 그룹 티켓 조회가 연결되지 않았다면 기존의 빈 날짜 → 생성 동작을 유지합니다.
    if (!issued && !groupSourceConnected) {
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

      const entries = makeTicketEntries(date, personalTickets, groupTickets);
      if (!entries.length && personalResult.status === "rejected")
        throw new Error("티켓 조회 실패");
      if (!entries.length) {
        // 기존과 동일하게 발권 내역이 없으면 티켓 생성 화면을 엽니다.
        onOpenTickets(date);
        return;
      }
      setDateTickets(entries);
      setSelectedDate(date);
      setShowingBack(false);
      setPreviewTicket(null);
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
        {selectedDate ? (
          // 2번 화면: 해당 날짜의 발권된 티켓 목록
          <View style={styles.ticketListPage}>
            <View style={styles.listHeader}>
              <Pressable
                onPress={returnToCalendar}
                accessibilityRole="button"
                accessibilityLabel="달력으로 돌아가기"
                style={styles.listBackButton}
              >
                <Text style={styles.listBackIcon}>‹</Text>
              </Pressable>
              <Text style={styles.listHeaderTitle} accessibilityRole="header">
                {dateTitle(selectedDate)}
              </Text>
            </View>
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.listCount}>
                내 티켓 {dateTickets.length}장
                {groupCount > 0 ? ` · 그룹에서 만든 티켓 ${groupCount}장` : ""}
              </Text>
              {dateTickets.map((entry, index) => (
                <TicketListCard
                  key={entry.key}
                  entry={entry}
                  index={index}
                  onPress={() => {
                    setShowingBack(false);
                    setPreviewTicket(entry.ticket);
                  }}
                />
              ))}
              {!groupSourceConnected && (
                <Text style={styles.groupSourceNotice}>
                  그룹에서 만든 다른 티켓까지 표시하려면 그룹 티켓 조회 기능을
                  연결해야 해요.
                </Text>
              )}
              {dateTickets.length === 0 && (
                <Text style={styles.emptyTickets}>
                  이 날짜에 발권된 티켓이 없어요.
                </Text>
              )}
            </ScrollView>
          </View>
        ) : (
          // 1번 화면: 기존 HOME 달력 유지
          <>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="메뉴"
                  onPress={
                    dateSelectionMode
                      ? onCancelDateSelection
                      : () => setMenuOpen(true)
                  }
                  style={styles.menuButton}
                >
                  <Text style={styles.menuText}>
                    {dateSelectionMode ? "‹" : "≡"}
                  </Text>
                </Pressable>
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
              <View style={styles.calendar}>
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
                  {!dateSelectionMode && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="티켓 추가"
                      onPress={() => onOpenTickets()}
                      style={[styles.monthButton, styles.addButton]}
                    >
                      <Text style={styles.plus}>+</Text>
                    </Pressable>
                  )}
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
                      style={styles.dayCell}
                    >
                      {day !== null &&
                        (() => {
                          const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const issued = markedDates.has(date);
                          const isFutureDate = date > todayKey;
                          return (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${year}년 ${month + 1}월 ${day}일 ${isFutureDate ? "미래 날짜, 선택 불가" : issued ? "발권한 티켓 목록" : "티켓 만들기"}`}
                              accessibilityState={{ disabled: isFutureDate }}
                              disabled={isFutureDate || listLoading}
                              onPress={() =>
                                void openCalendarDate(date, issued)
                              }
                              style={[
                                styles.dateButton,
                                isFutureDate && styles.futureDateButton,
                              ]}
                            >
                              {issued ? (
                                <View style={styles.issuedDay}>
                                  <Image
                                    source={ticketIcon}
                                    resizeMode="contain"
                                    style={styles.issuedTicketIcon}
                                  />
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
            </ScrollView>
            {!dateSelectionMode && (
              <View style={styles.bottomNav}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="홈"
                  accessibilityState={{ selected: true }}
                  onPress={() => setMonthDate(currentMonth())}
                  style={styles.navButton}
                >
                  <Text style={[styles.navText, styles.activeText]}>Home</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="그룹"
                  onPress={onOpenGroup}
                  style={styles.navButton}
                >
                  <Text style={styles.navText}>Group</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="스토어"
                  onPress={showPendingFeature}
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
          </>
        )}
      </View>
      <MenuExperience
        visible={menuOpen && !dateSelectionMode && !selectedDate}
        onClose={() => setMenuOpen(false)}
        onLogout={onLogout}
      />

      {/* 3, 4번 화면: 티켓 앞면/뒷면 팝업 */}
      <Modal
        visible={previewTicket !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePreview}
      >
        <View style={styles.previewOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closePreview}
            accessibilityRole="button"
            accessibilityLabel="티켓 팝업 닫기"
          />
          {previewTicket && (
            <>
              <View style={styles.previewCenter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showingBack
                      ? "티켓 앞면으로 뒤집기"
                      : "티켓 뒷면으로 뒤집기"
                  }
                  onPress={() => setShowingBack((value) => !value)}
                  style={[
                    styles.verticalTicketHolder,
                    {
                      width: verticalTicketWidth,
                      height: verticalTicketHeight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.rotatedTicket,
                      {
                        width: verticalTicketHeight,
                        height: verticalTicketWidth,
                        left: (verticalTicketWidth - verticalTicketHeight) / 2,
                        top: (verticalTicketHeight - verticalTicketWidth) / 2,
                      },
                    ]}
                  >
                    {showingBack && !previewTicket.memo?.trim() ? (
                      // 메모가 없는 티켓의 뒷면은 피그마처럼 빈 크림색 면으로 표시합니다.
                      <View
                        style={[
                          styles.emptyTicketBack,
                          {
                            width: verticalTicketHeight,
                            height: verticalTicketWidth,
                          },
                        ]}
                      />
                    ) : (
                      <IssuedTicketFlipPreview
                        ticket={previewTicket}
                        showingBack={showingBack}
                        ticketWidth={verticalTicketHeight}
                        onMore={() =>
                          Alert.alert(
                            "티켓 뒷면",
                            previewTicket.memo || "기록된 글이 없어요.",
                          )
                        }
                      />
                    )}
                  </View>
                </Pressable>
              </View>
              <View style={styles.previewBottom}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="티켓 목록으로 돌아가기"
                  style={styles.previewBackButton}
                  onPress={closePreview}
                >
                  <Text style={styles.previewBackText}>돌아가기</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", backgroundColor: colors.canvas },
  page: { flex: 1, width: "100%", maxWidth: 420 },
  content: { flexGrow: 1, paddingBottom: 40 },
  header: {
    height: 130,
    paddingTop: 35,
    paddingBottom: 45,
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
  logo: { width: 100, height: 50 },
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
    marginHorizontal: 28,
    minHeight: 561,
    borderRadius: 16,
    paddingTop: 58,
    paddingBottom: 14,
    paddingHorizontal: 3,
    backgroundColor: colors.surface,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  monthButton: {
    width: 34,
    height: 44,
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
  addButton: { marginLeft: "auto" },
  plus: { fontSize: 25, color: colors.text },
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
    height: 78,
    alignItems: "center",
    justifyContent: "center",
  },
  dateButton: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  futureDateButton: { opacity: 0.32 },
  dayText: { fontSize: 12, lineHeight: 16, color: colors.primary },
  issuedDay: { alignItems: "center", justifyContent: "center" },
  issuedTicketIcon: { width: 34, height: 30 },
  issuedDayText: {
    fontSize: 10,
    lineHeight: 13,
    color: colors.primary,
    fontWeight: "700",
  },
  // Group 화면의 하단 바와 통일: 4등분, 50 높이, 기본 안드로이드 글꼴.
  // 검은 하단 가로줄은 Android 시스템 제스처 표시줄이므로 별도로 그리지 않습니다.
  bottomNav: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "#F0C8BE",
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
    fontWeight: "400",
    textAlign: "center",
  },
  activeText: { color: "#FFFDF8", fontWeight: "700" },

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
    paddingHorizontal: 22,
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
    height: 144,
    flexDirection: "row",
    borderRadius: 13,
    backgroundColor: colors.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE5DD",
  },
  listTicketPressed: { opacity: 0.86 },
  listTicketStub: {
    width: "25%",
    backgroundColor: "#E8CAC2",
    paddingHorizontal: 9,
    paddingVertical: 13,
  },
  stubCaption: { color: colors.secondary, fontSize: 9, marginBottom: 12 },
  stubTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    flex: 1,
  },
  stubDate: { color: colors.secondary, fontSize: 10 },
  stubDashedLine: {
    width: 1,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D9AFA5",
  },
  listTicketMain: { flex: 1, paddingHorizontal: 18, paddingVertical: 12 },
  listTicketBrand: {
    color: colors.secondary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  listTicketImageWrap: {
    width: "100%",
    height: 49,
    borderRadius: 5,
    backgroundColor: "#F1E9E1",
    overflow: "hidden",
    marginBottom: 8,
  },
  listTicketImage: { width: "100%", height: "100%" },
  listTicketImageEmpty: { flex: 1, backgroundColor: "#F1E9E1" },
  listTicketName: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  listTicketDescription: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 3,
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
