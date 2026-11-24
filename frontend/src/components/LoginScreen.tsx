import {
  ErrorCode,
  signupRequestSchema,
  type LoginResponse,
} from "@mind-do/shared";
import { ApiError, login, NETWORK_ERROR } from "../lib/api";
import SignupScreen from "./SignupScreen";
import { useState, type ComponentProps } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text as NativeText,
  type TextProps,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import mascot from "../../assets/memo-re-mascot.png";
import wordmark from "../../assets/memo-re-wordmark.png";

const authEmailSchema = signupRequestSchema.shape.email;
const authPasswordSchema = signupRequestSchema.shape.password;
const color = {
  background: "#FFFFFF",
  text: "#202431",
  muted: "#747B8A",
  line: "#E6EAF1",
  blue: "#174BE8",
  blueSoft: "#EAF0FF",
  coral: "#FF7068",
};

type LoginScreenProps = { onLoggedIn: (user: LoginResponse) => void };
type AuthView = "start" | "login" | "recover";

function Text(props: TextProps) {
  return (
    <NativeText
      {...props}
      style={[
        { fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" },
        props.style,
      ]}
    />
  );
}

export default function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [view, setView] = useState<AuthView>("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<"email" | "password">("email");

  const emailValid = authEmailSchema.safeParse(email.trim()).success;
  const passwordValid = authPasswordSchema.safeParse(password).success;
  const hasError = submitted && (!emailValid || !passwordValid);

  const tryLogin = async () => {
    setSubmitted(true);
    if (!emailValid || !passwordValid || loggingIn) return;
    Keyboard.dismiss();
    setLoggingIn(true);
    try {
      const user = await login({ email: email.trim(), password });
      onLoggedIn(user);
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        error.code === ErrorCode.INVALID_CREDENTIALS
      ) {
        Alert.alert("로그인 실패", "이메일 또는 비밀번호가 맞지 않아요.");
      } else if (error instanceof ApiError && error.code === NETWORK_ERROR) {
        Alert.alert(
          "연결 오류",
          "서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.",
        );
      } else {
        Alert.alert("로그인 오류", "잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  if (showSignup) {
    return (
      <SignupScreen
        onBack={() => {
          setShowSignup(false);
          setView("login");
        }}
      />
    );
  }

  if (view === "start") {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.startPage}>
          <View style={styles.brandLockup}>
            <Image
              source={wordmark}
              resizeMode="contain"
              style={styles.wordmarkImage}
              accessibilityLabel="MEMO:RE"
            />
          </View>
          <View style={styles.mascotWrap}>
            <Image
              source={mascot}
              resizeMode="contain"
              style={styles.mascot}
              accessibilityLabel="MEMO:RE 캐릭터"
            />
          </View>
          <View style={styles.startActions}>
            <PrimaryButton label="로그인" onPress={() => setView("login")} />
            <SecondaryButton
              label="새 계정 만들기"
              onPress={() => setShowSignup(true)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (view === "recover") {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.page}>
          <AuthHeader title="계정 찾기" onBack={() => setView("login")} />
          <View style={styles.recoveryTabs}>
            <Pressable
              onPress={() => setRecoveryTab("email")}
              style={styles.recoveryTab}
            >
              <Text
                style={[
                  styles.recoveryTabText,
                  recoveryTab === "email" && styles.recoveryTabActive,
                ]}
              >
                이메일 확인
              </Text>
              {recoveryTab === "email" && <View style={styles.tabIndicator} />}
            </Pressable>
            <Pressable
              onPress={() => setRecoveryTab("password")}
              style={styles.recoveryTab}
            >
              <Text
                style={[
                  styles.recoveryTabText,
                  recoveryTab === "password" && styles.recoveryTabActive,
                ]}
              >
                비밀번호 재설정
              </Text>
              {recoveryTab === "password" && (
                <View style={styles.tabIndicator} />
              )}
            </Pressable>
          </View>
          <Text style={styles.recoveryLabel}>이메일</Text>
          <LineInput
            accessibilityLabel="가입한 이메일 주소"
            placeholder="가입한 이메일 주소"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <PrimaryButton
            label="인증번호 받기"
            style={styles.recoveryPrimary}
            onPress={() => {
              if (!authEmailSchema.safeParse(email.trim()).success) {
                Alert.alert(
                  "이메일 확인",
                  "가입한 이메일 주소를 입력해 주세요.",
                );
                return;
              }
              Alert.alert(
                "인증번호 전송",
                "이메일 찾기 기능은 서버 연결 후 사용할 수 있어요.",
              );
            }}
          />
          <SecondaryButton
            label={recoveryTab === "email" ? "계정 확인" : "비밀번호 재설정"}
            style={styles.recoverySecondary}
            onPress={() =>
              Alert.alert(
                "계정 확인",
                "계정 찾기 기능은 서버 연결 후 사용할 수 있어요.",
              )
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader
            title="로그인"
            onBack={() => {
              setView("start");
              setSubmitted(false);
            }}
          />
          <View style={styles.loginForm}>
            <Text style={styles.fieldLabel}>이메일</Text>
            <LineInput
              accessibilityLabel="이메일 주소"
              placeholder="이메일 주소"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setSubmitted(false);
              }}
            />
            <Text style={[styles.fieldLabel, styles.passwordLabel]}>
              비밀번호
            </Text>
            <LineInput
              accessibilityLabel="비밀번호"
              placeholder="비밀번호"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setSubmitted(false);
              }}
              returnKeyType="done"
              onSubmitEditing={tryLogin}
            />
            <View style={styles.loginMessageSlot}>
              {hasError && (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  이메일 주소와 비밀번호를 확인해 주세요.
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setView("recover");
                setRecoveryTab("email");
              }}
              hitSlop={8}
            >
              <Text style={styles.forgotLink}>비밀번호 재설정</Text>
            </Pressable>
            <PrimaryButton
              label={loggingIn ? "로그인 중..." : "로그인"}
              style={styles.loginPrimary}
              onPress={() => void tryLogin()}
            />
            <SecondaryButton
              label="회원가입"
              style={styles.loginSecondary}
              onPress={() => setShowSignup(true)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="이전 화면"
        onPress={onBack}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.headerTitle}>
        {title}
      </Text>
    </View>
  );
}

function LineInput(props: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={color.muted}
      style={[styles.lineInput, props.style]}
    />
  );
}

function PrimaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  startPage: {
    flex: 1,
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
  },
  brandLockup: { alignItems: "center", marginTop: 66 },
  wordmarkImage: { width: 270, height: 60 },
  mascotWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  mascot: { width: 220, height: 190 },
  startTagline: {
    color: color.blue,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 24,
  },
  startActions: { alignItems: "flex-end", gap: 12, paddingBottom: 8 },
  page: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 46,
  },
  backButton: {
    position: "absolute",
    left: 0,
    width: 36,
    height: 40,
    justifyContent: "center",
  },
  backText: { color: color.text, fontSize: 30, lineHeight: 36 },
  headerTitle: {
    color: color.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  loginForm: { paddingTop: 0 },
  fieldLabel: {
    color: color.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    marginBottom: 6,
  },
  passwordLabel: { marginTop: 20 },
  lineInput: {
    minHeight: 40,
    paddingHorizontal: 0,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    color: color.text,
    fontSize: 15,
  },
  loginMessageSlot: { height: 12, marginTop: 4 },
  errorText: { color: color.coral, fontSize: 11, lineHeight: 16 },
  forgotLink: {
    color: color.blue,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  primaryButton: {
    minWidth: 106,
    height: 44,
    borderRadius: 24,
    backgroundColor: color.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  secondaryButton: {
    minWidth: 106,
    height: 42,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#C9D5FF",
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: color.blue,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  loginPrimary: { alignSelf: "flex-end", marginTop: 48 },
  loginSecondary: { alignSelf: "flex-end", marginTop: 12 },
  recoveryTabs: {
    flexDirection: "row",
    marginTop: 24,
    marginBottom: 38,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  recoveryTab: { flex: 1, alignItems: "center", paddingBottom: 9 },
  recoveryTabText: { color: color.muted, fontSize: 12, lineHeight: 18 },
  recoveryTabActive: { color: color.text, fontWeight: "600" },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: color.coral,
  },
  recoveryLabel: { color: color.text, fontSize: 13, lineHeight: 18 },
  recoveryPrimary: { alignSelf: "flex-end", marginTop: 28 },
  recoverySecondary: { alignSelf: "flex-start", marginTop: 18, minWidth: 120 },
  pressed: { opacity: 0.75 },
});
