import {
  SLOT_STATUS_COMPLETED,
  type MyTicket,
  type SharedTicketSummary,
} from "@mind-do/shared";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useMyTickets } from "../hooks/use-my-tickets";
import { getGroupSharedTickets, getSharedTicketDetail } from "../lib/api";
import TicketRenderer from "./TicketRenderer";
import TicketFlipPreview, { PersonalPhotoTicket } from "./TicketFlipPreview";

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
const homeTicketSlotWidth = 68;

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

type HomeScreenProps = {
  initialShowAllTickets?: boolean;
  currentUserId: number;
  groups: readonly { id: string; name: string; isDefault: boolean }[];
  initialDate?: string;
  onOpenGroupSlot: (
    groupId: string,
    date: string,
    sharedTicketId: number | null,
  ) => void;
  onOpenStore: () => void;
  onOpenMy: () => void;
  onOpenGroup: () => void;
  onLogout?: () => void;
};
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

type HomeGroupTicket = {
  ticket: MyTicket;
  values: {
    title: string | null;
    date: string;
    groupName: string;
    participants: string[];
  };
};

export default function HomeScreen({
  initialShowAllTickets = false,
  currentUserId,
  groups,
  initialDate,
  onOpenGroupSlot,
  onOpenMy,
  onOpenGroup,
  onOpenStore,
}: HomeScreenProps) {
  const [monthDate, setMonthDate] = useState(() =>
    initialDate
      ? new Date(
          Number(initialDate.slice(0, 4)),
          Number(initialDate.slice(5, 7)) - 1,
          1,
        )
      : currentMonth(),
  );
  const [selectedDate, setSelectedDate] = useState(
    () => initialDate ?? todayDateKey(),
  );
  const [sharedTicketsByGroup, setSharedTicketsByGroup] = useState<
    Record<string, SharedTicketSummary[]>
  >({});
  const [sharedTicketsFailed, setSharedTicketsFailed] = useState(false);
  const [sharedTicketsLoading, setSharedTicketsLoading] = useState(false);
  const [sharedTicketsRetry, setSharedTicketsRetry] = useState(0);
  const selectedMonth = selectedDate.slice(0, 7);
  const orderedGroups = useMemo(
    () => [...groups].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    [groups],
  );
  useEffect(() => {
    let active = true;
    setSharedTicketsByGroup({});
    setSharedTicketsFailed(false);
    setSharedTicketsLoading(orderedGroups.length > 0);
    void Promise.allSettled(
      orderedGroups.map(async ({ id }) => {
        const { sharedTickets } = await getGroupSharedTickets(
          Number(id),
          selectedMonth,
        );
        return [id, sharedTickets] as const;
      }),
    ).then((results) => {
      if (!active) return;
      setSharedTicketsByGroup(
        Object.fromEntries(
          results.flatMap((result) =>
            result.status === "fulfilled" ? [result.value] : [],
          ),
        ),
      );
      setSharedTicketsFailed(
        results.some((result) => result.status === "rejected"),
      );
      setSharedTicketsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orderedGroups, selectedMonth, sharedTicketsRetry]);
  const [showAllTickets, setShowAllTickets] = useState(initialShowAllTickets);
  const [previewTicket, setPreviewTicket] = useState<HomeGroupTicket | null>(
    null,
  );
  const [showingBack, setShowingBack] = useState(false);
  const [ownGroupTickets, setOwnGroupTickets] = useState<
    Record<string, HomeGroupTicket | null>
  >({});
  const [detailFailed, setDetailFailed] = useState(false);
  const [detailRetry, setDetailRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setOwnGroupTickets({});
    setDetailFailed(false);
    const lookups = Object.entries(sharedTicketsByGroup).flatMap(
      ([groupId, entries]) => {
        const summary = entries.find(
          (entry) => entry.ticketDate === selectedDate,
        );
        return summary?.myStatus === SLOT_STATUS_COMPLETED
          ? [{ groupId, summary }]
          : [];
      },
    );
    void Promise.allSettled(
      lookups.map(async ({ groupId, summary }) => {
        const detail = await getSharedTicketDetail(summary.sharedTicketId);
        const ownSlot = detail.slots.find(
          (slot) => slot.userId === currentUserId,
        );
        const ticket = ownSlot?.ticket;
        return [
          groupId,
          ticket
            ? {
                ticket: { ...ticket, visitDate: detail.ticketDate },
                values: {
                  title: detail.title,
                  date: detail.ticketDate,
                  groupName: detail.groupName,
                  participants: detail.slots.map((slot) => slot.name),
                },
              }
            : null,
        ] as const;
      }),
    ).then((results) => {
      if (!active) return;
      setOwnGroupTickets(
        Object.fromEntries(
          results.flatMap((result) =>
            result.status === "fulfilled" ? [result.value] : [],
          ),
        ),
      );
      setDetailFailed(results.some((result) => result.status === "rejected"));
    });
    return () => {
      active = false;
    };
  }, [sharedTicketsByGroup, selectedDate, currentUserId, detailRetry]);
  const {
    tickets,
    loading: listLoading,
    failed: ticketLoadFailed,
    reload,
  } = useMyTickets();
  const groupTicketPage = previewTicket?.ticket;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const previewWidth = Math.min(screenWidth - 48, 390);
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

  const markedDates = useMemo(
    () => new Set(tickets.map((ticket) => ticket.visitDate)),
    [tickets],
  );
  const recordCount = tickets.length;

  const openCalendarDate = (date: string) => {
    if (date > todayDateKey()) return;
    setSelectedDate(date);
    setShowAllTickets(false);
    setShowingBack(false);
  };
  const todayKey = todayDateKey();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

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
        {groupTicketPage && previewTicket ? (
          <View style={styles.groupTicketPage}>
            <View style={styles.groupTicketHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="전체 보기로 돌아가기"
                onPress={() => setPreviewTicket(null)}
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
              <TicketFlipPreview
                ticket={groupTicketPage}
                values={previewTicket.values}
                width={previewWidth}
                showingBack={showingBack}
                onFlip={() => setShowingBack((current) => !current)}
              />
            </View>
          </View>
        ) : showAllTickets ? (
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
              {orderedGroups.map((group) => {
                const entries = sharedTicketsByGroup[group.id];
                const summary = entries?.find(
                  (entry) => entry.ticketDate === selectedDate,
                );
                const ownTicket = ownGroupTickets[group.id];
                const waitingForDetail =
                  summary?.myStatus === SLOT_STATUS_COMPLETED &&
                  ownTicket === undefined;
                const width = Math.min(screenWidth - 32, 390);
                return (
                  <View key={group.id} style={styles.fullGroupSection}>
                    <Text style={styles.fullListSectionLabel}>
                      {group.name}
                    </Text>
                    {ownTicket ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${group.name} 내 티켓 보기`}
                        onPress={() => {
                          setShowingBack(false);
                          setPreviewTicket(ownTicket);
                        }}
                      >
                        {ownTicket.ticket.design ? (
                          <TicketRenderer
                            designId={ownTicket.ticket.design.designId}
                            photoUris={ownTicket.ticket.photos.map(
                              (photo) => photo.url,
                            )}
                            values={ownTicket.values}
                            width={width}
                            lieDown
                          />
                        ) : (
                          <PersonalPhotoTicket
                            ticket={ownTicket.ticket}
                            width={width}
                          />
                        )}
                      </Pressable>
                    ) : !entries || waitingForDetail ? (
                      <Text style={styles.emptyTickets}>
                        {sharedTicketsLoading ||
                        (waitingForDetail && !detailFailed)
                          ? "티켓을 불러오는 중이에요."
                          : "티켓을 불러오지 못했어요."}
                      </Text>
                    ) : (
                      <View style={styles.batchEmptyTicket}>
                        <Text style={styles.batchEmptyPlus}>+</Text>
                        <Text style={styles.batchEmptyText}>
                          이 날에 만든 내 티켓이 없어요.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {(sharedTicketsFailed || detailFailed) && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (sharedTicketsFailed)
                      setSharedTicketsRetry((value) => value + 1);
                    else setDetailRetry((value) => value + 1);
                  }}
                >
                  <Text style={styles.emptyTickets}>
                    티켓 불러오기 다시 시도
                  </Text>
                </Pressable>
              )}
            </ScrollView>
            <BottomNavigation
              activeTab="home"
              onSelect={(tab) => {
                if (tab === "home") setShowAllTickets(false);
                else if (tab === "group") onOpenGroup();
                else if (tab === "my") onOpenMy();
                else onOpenStore();
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
                <Image
                  source={logo}
                  resizeMode="contain"
                  accessibilityLabel="MEMO:RE"
                  style={styles.logo}
                />
              </View>
              <View style={styles.recordsHeading}>
                <Text accessibilityRole="header" style={styles.recordsTitle}>
                  나의 기록
                </Text>
                <Text style={styles.recordsCount}>{recordCount}장</Text>
              </View>
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
                              accessibilityLabel={`${year}년 ${month + 1}월 ${day}일 ${isFutureDate ? "미래 날짜, 선택 불가" : issued ? "발권한 티켓 목록" : "발권된 티켓 없음"}`}
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
              <View style={styles.selectedTicketsSection}>
                {ticketLoadFailed && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={listLoading}
                    onPress={reload}
                  >
                    <Text style={styles.emptyTickets}>
                      내 티켓을 불러오지 못했어요. 다시 시도
                    </Text>
                  </Pressable>
                )}
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
                    {orderedGroups.map((group) => {
                      const label = group.name;
                      const groupTickets = sharedTicketsByGroup[group.id];
                      const ticket = groupTickets?.find(
                        (entry) => entry.ticketDate === selectedDate,
                      );
                      const ownTicket = ownGroupTickets[group.id];
                      const design =
                        ticket?.myStatus === SLOT_STATUS_COMPLETED &&
                        ownTicket?.values.date === selectedDate
                          ? ownTicket.ticket.design
                          : null;
                      return (
                        <Pressable
                          key={group.id}
                          accessibilityRole="button"
                          accessibilityLabel={
                            ticket
                              ? `${label} ${ticket.title ?? "공동 티켓"} 보기`
                              : `${label} 공동 티켓 만들기`
                          }
                          disabled={!groupTickets}
                          onPress={() =>
                            onOpenGroupSlot(
                              group.id,
                              selectedDate,
                              ticket?.sharedTicketId ?? null,
                            )
                          }
                          style={({ pressed }) => [
                            styles.ticketSlot,
                            styles.groupSlot,
                            group.isDefault && styles.personalGroupSlot,
                            ticket && styles.filledGroupSlot,
                            design && styles.designedGroupSlot,
                            pressed && styles.slotPressed,
                          ]}
                        >
                          {design && ownTicket ? (
                            <TicketRenderer
                              designId={design.designId}
                              photoUris={ownTicket.ticket.photos.map(
                                (photo) => photo.url,
                              )}
                              values={ownTicket.values}
                              width={homeTicketSlotWidth}
                              part="stub"
                              lieDown
                            />
                          ) : ticket ? (
                            <>
                              <Text style={styles.slotDay}>
                                {selectedDate.slice(5, 7)}
                                {"\n"}
                                {selectedDate.slice(8)}
                              </Text>
                              <Text numberOfLines={2} style={styles.slotLabel}>
                                {ticket.title || label}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.emptySlotPlus}>
                                {groupTickets
                                  ? "+"
                                  : sharedTicketsLoading
                                    ? "…"
                                    : "–"}
                              </Text>
                              <Text numberOfLines={1} style={styles.slotLabel}>
                                {label}
                              </Text>
                            </>
                          )}
                          {!design && (
                            <>
                              <View
                                style={[styles.slotNotch, styles.slotNotchTop]}
                              />
                              <View
                                style={[
                                  styles.slotNotch,
                                  styles.slotNotchBottom,
                                ]}
                              />
                            </>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
                {sharedTicketsFailed && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSharedTicketsRetry((value) => value + 1)}
                  >
                    <Text style={styles.emptyTickets}>
                      그룹 티켓을 불러오지 못했어요. 다시 시도
                    </Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
            <BottomNavigation
              activeTab="home"
              onSelect={(tab) => {
                if (tab === "home") setMonthDate(currentMonth());
                else if (tab === "group") onOpenGroup();
                else if (tab === "my") onOpenMy();
                else onOpenStore();
              }}
            />
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
    width: homeTicketSlotWidth,
    height: homeTicketSlotWidth * 2,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#E7E9EF",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 7,
  },
  slotPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  personalGroupSlot: { backgroundColor: "#C3D8F2" },
  groupSlot: {
    backgroundColor: "#E5E6EA",
    justifyContent: "center",
    gap: 12,
  },
  filledGroupSlot: { backgroundColor: "#FFEEE9", gap: 3 },
  designedGroupSlot: { backgroundColor: "transparent", paddingBottom: 0 },
  slotDay: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "600",
    textAlign: "center",
  },
  slotNotch: {
    position: "absolute",
    right: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surface,
  },
  slotNotchTop: { top: -7 },
  slotNotchBottom: { bottom: -7 },
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
  batchEmptyTicket: {
    height: 110,
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
