import { useEffect, useState } from "react";
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

const colors = {
  canvas: "#FFF8EF",
  surface: "#FFFDF8",
  primary: "#654C40",
  secondary: "#987966",
  accent: "#CF897C",
  soft: "#F0C8BE",
  text: "#5C473E",
};
import logo from "../../assets/images/memore/logo.png";
import ticketIcon from "../../assets/images/memore/ticket-icon.png";
const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type HomeScreenProps = {
  onOpenMy: () => void;
  onOpenGroup: () => void;
  onOpenTickets: (date?: string) => void;
  dateSelectionMode?: boolean;
  onCancelDateSelection?: () => void;
  onLogout?: () => void;
};
function currentMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}
// UTC 날짜가 아니라 사용자의 기기에서 보이는 오늘 날짜를 사용합니다.
function todayDateKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}
function showPendingFeature() {
  Alert.alert("안내", "아직 연결되지 않은 기능이에요.");
}

export default function HomeScreen({
  onOpenMy,
  onOpenGroup,
  onOpenTickets,
  dateSelectionMode = false,
  onCancelDateSelection,
  onLogout,
}: HomeScreenProps) {
  const [monthDate, setMonthDate] = useState(currentMonth);
  const [issuedDates, setIssuedDates] = useState<Set<string>>(new Set());
  const [previewTicket, setPreviewTicket] = useState<IssuedTicket | null>(null);
  const [showingBack, setShowingBack] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const previewWidth = Math.max(
    170,
    Math.min(240, screenWidth - 90, (screenHeight - 230) * (204 / 348)),
  );

  function closePreview() {
    setPreviewTicket(null);
    setShowingBack(false);
  }

  function openCalendarDate(date: string, issued: boolean) {
    if (date > todayDateKey()) {
      Alert.alert(
        "미래 날짜는 선택할 수 없어요",
        "오늘 또는 지난 날짜에만 티켓을 만들 수 있어요.",
      );
      return;
    }
    if (!issued) {
      onOpenTickets(date);
      return;
    }
    void (async () => {
      try {
        const ticket = await getIssuedTicket(date);
        if (!ticket) {
          // 다른 화면에서 발권 정보가 바뀌었다면 기존 날짜 선택 동작으로 돌아갑니다.
          onOpenTickets(date);
          return;
        }
        setShowingBack(false);
        setPreviewTicket(ticket);
      } catch {
        Alert.alert(
          "티켓 확인 오류",
          "발권한 티켓을 불러오지 못했어요. 다시 시도해 주세요.",
        );
      }
    })();
  }

  const todayKey = todayDateKey();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  // 달을 바꾸거나 달력으로 돌아올 때 발권 완료된 날짜를 다시 확인합니다.
  useEffect(() => {
    let active = true;
    setIssuedDates(new Set());
    const dates = Array.from(
      { length: lastDay },
      (_, index) =>
        `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    );
    Promise.all(
      dates.map(async (date) => ({
        date,
        ticket: await getIssuedTicket(date),
      })),
    )
      .then((results) => {
        if (active)
          setIssuedDates(
            new Set(
              results
                .filter((result) => result.ticket !== null)
                .map((result) => result.date),
            ),
          );
      })
      .catch(() => {
        if (active) setIssuedDates(new Set());
      });
    return () => {
      active = false;
    };
  }, [year, month, lastDay]);
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
                <View key={`${year}-${month}-${index}`} style={styles.dayCell}>
                  {day !== null &&
                    (() => {
                      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const issued = issuedDates.has(date);
                      const isFutureDate = date > todayKey;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${year}년 ${month + 1}월 ${day}일 ${isFutureDate ? "미래 날짜, 선택 불가" : issued ? "발권한 티켓 보기" : "티켓 만들기"}`}
                          accessibilityState={{ disabled: isFutureDate }}
                          disabled={isFutureDate}
                          onPress={() => openCalendarDate(date, issued)}
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
                              <Text style={styles.issuedDayText}>{day}</Text>
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
              accessibilityLabel="GROUP"
              onPress={onOpenGroup}
              style={styles.navButton}
            >
              <Text style={styles.navText}>GROUP</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="티켓 생성"
              onPress={() => onOpenTickets()}
              style={styles.ticketButton}
            >
              <Image
                source={ticketIcon}
                resizeMode="contain"
                style={styles.ticketImage}
              />
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
      </View>
      <MenuExperience
        visible={menuOpen && !dateSelectionMode}
        onClose={() => setMenuOpen(false)}
        onLogout={onLogout}
      />
      {/* 발권 완료 날짜를 누를 때 달력 위에 표시되는 앞/뒷면 빠른 미리보기 */}
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
            accessibilityLabel="티켓 미리보기 닫기"
          />
          <Pressable
            style={styles.previewClose}
            onPress={closePreview}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <Text style={styles.previewCloseText}>×</Text>
          </Pressable>
          {previewTicket && (
            <View style={styles.previewContents}>
              <Text style={styles.previewSideTitle}>
                {showingBack ? "티켓 뒷면" : "티켓 앞면"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showingBack ? "티켓 앞면으로 뒤집기" : "티켓 뒷면으로 뒤집기"
                }
                onPress={() => setShowingBack((value) => !value)}
              >
                <IssuedTicketFlipPreview
                  ticket={previewTicket}
                  showingBack={showingBack}
                  ticketWidth={previewWidth}
                  onMore={() =>
                    Alert.alert(
                      "기억 보관함",
                      previewTicket.memo || "기록된 글이 없어요.",
                    )
                  }
                />
              </Pressable>
              <Text style={styles.previewHint}>
                티켓을 터치하면 {showingBack ? "앞면" : "뒷면"}이 보여요
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.previewDetailButton}
                onPress={() => {
                  const date = previewTicket.visitDate;
                  closePreview();
                  onOpenTickets(date);
                }}
              >
                <Text style={styles.previewDetailText}>티켓 자세히 보기 →</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewClose: {
    position: "absolute",
    top: 48,
    left: 20,
    width: 48,
    height: 48,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCloseText: { color: "#FFFDF8", fontSize: 32, fontWeight: "400" },
  previewContents: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  previewSideTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFDF8",
    marginBottom: 16,
  },
  previewHint: {
    color: "#FFFDF8",
    fontSize: 12,
    marginTop: 18,
    textAlign: "center",
  },
  previewDetailButton: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: "#FFFDF8",
  },
  previewDetailText: { color: "#654C40", fontSize: 13, fontWeight: "600" },

  screen: { flex: 1, alignItems: "center", backgroundColor: colors.canvas },
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
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: colors.soft,
  },
  navButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: { fontSize: 12, color: colors.primary },
  activeText: { color: colors.surface },
  ticketButton: {
    width: 100,
    height: 100,
    marginTop: -30,
    marginBottom: -34,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  ticketImage: { width: 79, height: 78 },
});
