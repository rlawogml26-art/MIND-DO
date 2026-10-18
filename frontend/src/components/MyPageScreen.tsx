import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import {
  listIssuedTickets,
  type IssuedTicket,
} from "../storage/issued-tickets";

const colors = {
  "background/canvas": "#FFF8EF",
  "background/surface": "#FFFDF8",
  "text/primary": "#654C40",
  "text/secondary": "#987966",
  "brand/primary": "#987966",
  "accent/primary": "#CF897C",
  "accent/soft": "#F0C8BE",
  "border/default": "#E8D8CA",
};
import defaultProfileImage from "../../assets/images/memore/ticket-icon.png";

type Profile = {
  nickname: string;
  introduction: string;
  username: string;
  photoUri: string | null;
};

type MyScreen = "profile" | "edit" | "tickets" | "following" | "followers";

const initialProfile: Profile = {
  nickname: "닉네임 입력",
  introduction: "나를 소개해보세요.",
  username: "my.memory",
  photoUri: null,
};

export default function MyPageScreen({
  onOpenTickets,
  onOpenHome,
}: {
  onOpenTickets: (date?: string) => void;
  onOpenHome: () => void;
}) {
  const [screen, setScreen] = useState<MyScreen>("profile");
  const [tickets, setTickets] = useState<IssuedTicket[]>([]);
  const [ticketLoadError, setTicketLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    listIssuedTickets()
      .then((items) => {
        if (active) setTickets(items);
      })
      .catch(() => {
        if (active) setTicketLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [draftProfile, setDraftProfile] = useState(initialProfile);

  const isEditing = screen === "edit";
  const visibleProfile = isEditing ? draftProfile : savedProfile;

  function openEditor() {
    setDraftProfile({ ...savedProfile });
    setScreen("edit");
  }

  function updateProfile(field: "nickname" | "introduction", value: string) {
    setDraftProfile((previous) => ({
      ...previous,
      [field]: value.slice(0, 15),
    }));
  }
  function deleteProfilePhoto() {
    setDraftProfile((previous) => ({
      ...previous,
      photoUri: null,
    }));
  }
  function saveProfile() {
    Keyboard.dismiss();
    setSavedProfile({ ...draftProfile });
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

            <Text style={styles.ticketListTitle}>티켓 모아보기</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.ticketListContent}
          >
            {ticketLoadError ? (
              <Text style={styles.textMenuLabel}>
                티켓을 불러오지 못했어요. 잠시 후 다시 열어 주세요.
              </Text>
            ) : tickets.length === 0 ? (
              <Text style={styles.textMenuLabel}>
                아직 발권한 티켓이 없어요.
              </Text>
            ) : (
              tickets.map((ticket) => (
                <Pressable
                  key={ticket.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${ticket.date} ${ticket.ticketTitle} 티켓 보기`}
                  onPress={() => onOpenTickets(ticket.date)}
                  style={styles.textMenuButton}
                >
                  <Text style={styles.textMenuLabel}>{ticket.ticketTitle}</Text>
                  <Text style={styles.username}>
                    {ticket.date} · {ticket.ticketPlace}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? "프로필 편집" : "마이페이지"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="메뉴"
              onPress={showPendingFeature}
              style={styles.menuButton}
            >
              <Text style={styles.menuText}>≡</Text>
            </Pressable>
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
                    resizeMode="contain"
                    accessibilityLabel="프로필 사진"
                    style={styles.profileImage}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={showPendingFeature}
                  style={styles.photoDeleteButton}
                >
                  <Text style={styles.buttonText}>프로필 사진 변경</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="프로필 사진 삭제"
                  onPress={deleteProfilePhoto}
                  style={styles.photoDeleteButton}
                >
                  <Text style={styles.buttonText}>프로필 사진 삭제</Text>
                </Pressable>
              </View>

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>닉네임</Text>
                  <TextInput
                    accessibilityLabel="닉네임"
                    maxLength={15}
                    value={draftProfile.nickname}
                    onChangeText={(value) => updateProfile("nickname", value)}
                    placeholder="닉네임 입력"
                    placeholderTextColor={colors["text/secondary"]}
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>소개</Text>
                  <TextInput
                    accessibilityLabel="소개"
                    maxLength={15}
                    value={draftProfile.introduction}
                    onChangeText={(value) =>
                      updateProfile("introduction", value)
                    }
                    placeholder="자기소개 입력"
                    placeholderTextColor={colors["text/secondary"]}
                    style={styles.input}
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
                <Text style={styles.saveText}>저장하기</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Image
                    source={
                      savedProfile.photoUri
                        ? { uri: savedProfile.photoUri }
                        : defaultProfileImage
                    }
                    resizeMode="contain"
                    accessibilityLabel="프로필 사진"
                    style={styles.profileImage}
                  />
                </View>
                <View style={styles.profileInfo}>
                  <View style={styles.profileInfo}>
                    <Text style={styles.nickname}>
                      {savedProfile.nickname.trim() || "닉네임"}
                    </Text>

                    <Text style={styles.username}>
                      @{savedProfile.username}
                    </Text>

                    {savedProfile.introduction.trim().length > 0 && (
                      <Text style={styles.introduction}>
                        {savedProfile.introduction}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {ticketLoadError ? "-" : tickets.length}
                  </Text>
                  <Text style={styles.statLabel}>내 티켓</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="팔로잉 목록 보기"
                  onPress={() => setScreen("following")}
                  style={styles.stat}
                >
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>팔로잉</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="팔로워 목록 보기"
                  onPress={() => setScreen("followers")}
                  style={styles.stat}
                >
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>팔로워</Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={openEditor}
                style={styles.outlineButton}
              >
                <Text style={styles.buttonText}>프로필 편집</Text>
              </Pressable>

              <View style={styles.ticketSection}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="내 티켓 모아보기"
                  onPress={() => setScreen("tickets")}
                  style={styles.textMenuButton}
                >
                  <Text style={styles.textMenuLabel}>내 티켓 모아보기</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={showPendingFeature}
                  style={styles.textMenuButton}
                >
                  <Text style={styles.textMenuLabel}>구독 및 구매</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
        {!isEditing && (
          <View style={styles.bottomNav}>
            {["Home", "SNS", "♥", "Store", "My"].map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityLabel={tab === "♥" ? "티켓" : tab}
                accessibilityState={{ selected: tab === "My" }}
                onPress={() => {
                  if (tab === "Home") {
                    onOpenHome();
                  } else if (tab === "♥") {
                    onOpenTickets();
                  } else if (tab === "My") {
                    returnToMy();
                  } else {
                    showPendingFeature();
                  }
                }}
                style={[
                  styles.navButton,
                  tab === "♥" && styles.navTicketButton,
                ]}
              >
                {tab === "♥" ? (
                  <Image
                    source={defaultProfileImage}
                    resizeMode="contain"
                    style={styles.navTicketImage}
                  />
                ) : (
                  <Text
                    style={[
                      styles.navText,
                      tab === "My" && styles.activeTabText,
                    ]}
                  >
                    {tab}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
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
  photoDeleteButton: {
    minHeight: 30,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  photoDeleteText: {
    fontSize: 14,
    color: colors["text/secondary"],
  },
  screen: {
    flex: 1,
    backgroundColor: colors["background/canvas"],
    alignItems: "center",
  },
  app: { flex: 1, width: "100%", maxWidth: 420 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 17, fontWeight: "600", color: colors["text/primary"] },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors["background/surface"],
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { fontSize: 24, color: colors["text/primary"] },
  subtitle: { marginTop: 24, fontSize: 12, color: colors["text/secondary"] },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
    gap: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors["border/default"],
    alignItems: "center",
    justifyContent: "center",
  },
  largeAvatar: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { fontSize: 28, color: colors["accent/primary"] },
  profileInfo: { flex: 1, gap: 5 },
  nickname: { fontSize: 20, color: colors["text/primary"] },
  username: { fontSize: 13, color: colors["text/secondary"] },
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
  introduction: {
    marginTop: 1,
    lineHeight: 16,
    fontSize: 12,
    color: colors["text/secondary"],
  },
  textMenuButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  textMenuLabel: { fontSize: 13, color: colors["text/primary"] },
  ticketSection: { marginTop: 32, gap: 16 },
  ticketPlaceholder: {
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors["background/surface"],
  },
  placeholderText: { fontSize: 12, color: colors["text/secondary"] },
  editPhotoSection: { alignItems: "center", marginTop: 32, gap: 5 },
  photoButton: { width: "70%" },
  form: { marginTop: 40, gap: 28 },
  field: { gap: 8 },
  label: { fontSize: 14, color: colors["text/primary"] },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors["border/default"],
    borderRadius: 10,
    backgroundColor: colors["background/surface"],
    fontSize: 14,
    color: colors["text/primary"],
  },
  saveButton: {
    minHeight: 50,
    marginTop: 240,
    borderRadius: 10,
    backgroundColor: colors["text/primary"],
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontSize: 14, color: colors["background/surface"] },
  pressed: { opacity: 0.8 },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: colors["accent/soft"],
  },
  navButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: { fontSize: 12, color: colors["text/primary"] },
  heartText: { fontSize: 28 },
  activeTab: { backgroundColor: colors["accent/primary"] },
  activeTabText: { color: colors["background/surface"], fontWeight: "600" },
  ticketListHeader: {
    paddingTop: 42,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  ticketListBackButton: {
    width: 40,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketListBackText: {
    fontSize: 32,
    color: colors["text/primary"],
  },
  ticketListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors["text/primary"],
  },
  ticketListContent: {
    flexGrow: 1,
    paddingHorizontal: 29,
    paddingBottom: 24,
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
  navTicketButton: {
    flex: 0,
    width: 100,
    height: 100,
    marginTop: -30,
    marginBottom: -34,
    borderRadius: 50,
    backgroundColor: colors["accent/primary"],
  },
  navTicketImage: {
    width: 79,
    height: 78,
  },
});
