import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { listIssuedTickets } from "../storage/issued-tickets";

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
  onOpenTickets: (visitDate?: string) => void;
  dateSelectionMode?: boolean;
  onCancelDateSelection?: () => void;
};
function currentMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}
function showPendingFeature() {
  Alert.alert("안내", "아직 연결되지 않은 기능이에요.");
}

export default function HomeScreen({
  onOpenMy,
  onOpenTickets,
  dateSelectionMode = false,
  onCancelDateSelection,
}: HomeScreenProps) {
  const [loadError, setLoadError] = useState(false);
  const [monthDate, setMonthDate] = useState(currentMonth);
  const [issuedDates, setIssuedDates] = useState<Set<string>>(new Set());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  // 달을 바꾸거나 달력으로 돌아올 때 발권 완료된 날짜를 다시 확인합니다.
  useEffect(() => {
    let active = true;
    setIssuedDates(new Set());
    setLoadError(false);
    listIssuedTickets()
      .then((tickets) => {
        if (active)
          setIssuedDates(new Set(tickets.map((ticket) => ticket.visitDate)));
      })
      .catch(() => {
        if (active) {
          setIssuedDates(new Set());
          setLoadError(true);
        }
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
                dateSelectionMode ? onCancelDateSelection : showPendingFeature
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
              티켓에 기록할 날짜를 선택해 주세요.
            </Text>
          )}
          {loadError && (
            <Text accessibilityRole="alert" style={styles.dateSelectionHint}>
              발권 기록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.
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
                      const visitDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const issued = issuedDates.has(visitDate);
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${year}년 ${month + 1}월 ${day}일 ${issued ? "발권한 티켓 보기" : "티켓 만들기"}`}
                          onPress={() => onOpenTickets(visitDate)}
                          style={styles.dateButton}
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
              accessibilityLabel="SNS"
              onPress={showPendingFeature}
              style={styles.navButton}
            >
              <Text style={styles.navText}>SNS</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
