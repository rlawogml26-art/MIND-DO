import {
  SIGNUP_PASSWORD_MAX,
  SIGNUP_PASSWORD_MIN,
  signupRequestSchema,
} from "@mind-do/shared";
import { useEffect, useState } from "react";
import {
  Alert,
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

const emailSchema = signupRequestSchema.shape.email;
const passwordSchema = signupRequestSchema.shape.password;
const palette = {
  background: "#FFFFFF",
  text: "#202431",
  muted: "#747B8A",
  line: "#E6EAF1",
  blue: "#174BE8",
  blueLine: "#C9D5FF",
  coral: "#FF7068",
  green: "#1A9873",
};

type SignupScreenProps = { onBack: () => void };
type SignupPhase = "email" | "verify" | "password";

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

export default function SignupScreen({ onBack }: SignupScreenProps) {
  const [phase, setPhase] = useState<SignupPhase>("email");
  const [email, setEmail] = useState("");
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [consented, setConsented] = useState(true);
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(180);

  useEffect(() => {
    if (phase !== "verify" || secondsLeft <= 0) return;
    const timer = setInterval(
      () => setSecondsLeft((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [phase, secondsLeft]);

  const checkEmail = () => {
    if (!emailSchema.safeParse(email.trim()).success) {
      setEmailAvailable(false);
      setMessage("이메일 주소를 확인해 주세요.");
      return;
    }
    Keyboard.dismiss();
    setEmailAvailable(true);
    setMessage("사용 가능한 이메일이에요.");
  };

  const sendCode = () => {
    if (!emailAvailable) {
      checkEmail();
      return;
    }
    if (!consented) {
      setMessage("이용약관과 개인정보 처리방침에 동의해 주세요.");
      return;
    }
    Keyboard.dismiss();
    setMessage("");
    setSecondsLeft(180);
    setPhase("verify");
  };

  const verifyCode = () => {
    if (verificationCode.length !== 6) {
      setMessage("인증번호 6자리를 입력해 주세요.");
      return;
    }
    // 화면 흐름 확인용 인증번호입니다. 실제 이메일 인증 API 연결이 필요합니다.
    if (verificationCode !== "123456") {
      setMessage("인증번호가 일치하지 않아요. 다시 확인해 주세요.");
      return;
    }
    Keyboard.dismiss();
    setMessage("");
    setPhase("password");
  };

  const finishSignup = () => {
    if (!passwordSchema.safeParse(password).success) {
      setMessage(
        `비밀번호는 ${SIGNUP_PASSWORD_MIN}~${SIGNUP_PASSWORD_MAX}자로 입력해 주세요.`,
      );
      return;
    }
    if (password !== passwordConfirm) {
      setMessage("비밀번호가 일치하지 않아요.");
      return;
    }
    Keyboard.dismiss();
    Alert.alert(
      "회원가입 준비 완료",
      "이메일 인증과 비밀번호 입력을 확인했어요. 계정 생성 API 연결 후 가입이 완료됩니다.",
      [{ text: "확인", onPress: onBack }],
    );
  };

  const goBack = () => {
    setMessage("");
    if (phase === "password") setPhase("verify");
    else if (phase === "verify") setPhase("email");
    else onBack();
  };

  const title =
    phase === "verify"
      ? "이메일 인증"
      : phase === "password"
        ? "비밀번호 설정"
        : "회원가입";
  const remainingTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 화면"
              onPress={goBack}
              style={styles.backButton}
            >
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {title}
            </Text>
          </View>

          {phase === "email" && (
            <View style={styles.form}>
              <Text style={styles.pageTitle}>이메일</Text>
              <Text style={styles.label}>이메일 주소</Text>
              <TextInput
                accessibilityLabel="이메일 주소"
                style={styles.lineInput}
                placeholder="이메일 주소"
                placeholderTextColor={palette.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setEmailAvailable(false);
                  setMessage("");
                }}
                returnKeyType="done"
                onSubmitEditing={checkEmail}
              />
              <View style={styles.emailMessageSlot}>
                {!!message && (
                  <Text
                    accessibilityRole="alert"
                    style={[
                      styles.message,
                      emailAvailable && styles.successMessage,
                    ]}
                  >
                    {message}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consented }}
                onPress={() => setConsented((value) => !value)}
                style={styles.consentRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    consented && styles.checkboxSelected,
                  ]}
                >
                  {consented && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.consentText}>
                  이용약관 및 개인정보 처리방침 동의
                </Text>
              </Pressable>
              <PrimaryButton
                label={emailAvailable ? "인증번호 받기" : "이메일 중복 확인"}
                onPress={emailAvailable ? sendCode : checkEmail}
              />
            </View>
          )}

          {phase === "verify" && (
            <View style={styles.form}>
              <Text style={styles.emailEcho}>{email.trim()}</Text>
              <Text style={styles.pageTitle}>인증번호</Text>
              <TextInput
                accessibilityLabel="인증번호 6자리"
                style={[styles.lineInput, styles.codeInput]}
                placeholder="0 0 0 0 0 0"
                placeholderTextColor={palette.muted}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                value={verificationCode}
                onChangeText={(value) => {
                  setVerificationCode(value.replace(/[^0-9]/g, "").slice(0, 6));
                  setMessage("");
                }}
              />
              <View style={styles.codeMeta}>
                <Text style={styles.countdown}>{remainingTime}</Text>
                <Pressable
                  onPress={() => {
                    setSecondsLeft(180);
                    setMessage("인증번호를 다시 보냈어요.");
                  }}
                >
                  <Text style={styles.resendLink}>인증번호 다시 받기</Text>
                </Pressable>
              </View>
              {!!message && (
                <Text accessibilityRole="alert" style={styles.message}>
                  {message}
                </Text>
              )}
              <PrimaryButton
                label="인증하기"
                onPress={verifyCode}
                style={styles.verifyButton}
              />
            </View>
          )}

          {phase === "password" && (
            <View style={styles.form}>
              <Text style={styles.pageTitle}>비밀번호</Text>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                accessibilityLabel="비밀번호 입력"
                style={styles.lineInput}
                placeholder="비밀번호 입력"
                placeholderTextColor={palette.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setMessage("");
                }}
              />
              <Text style={[styles.label, styles.confirmLabel]}>
                비밀번호 확인
              </Text>
              <TextInput
                accessibilityLabel="비밀번호 확인"
                style={styles.lineInput}
                placeholder="한 번 더 입력"
                placeholderTextColor={palette.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                value={passwordConfirm}
                onChangeText={(value) => {
                  setPasswordConfirm(value);
                  setMessage("");
                }}
                returnKeyType="done"
                onSubmitEditing={finishSignup}
              />
              <Text style={styles.passwordHint}>
                영문·숫자·특수문자를 조합해 주세요.
              </Text>
              <View style={styles.passwordMessageSlot}>
                {!!message && (
                  <Text accessibilityRole="alert" style={styles.message}>
                    {message}
                  </Text>
                )}
              </View>
              <PrimaryButton
                label="완료"
                onPress={finishSignup}
                style={styles.finishButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  fill: { flex: 1 },
  content: {
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
  },
  backButton: {
    position: "absolute",
    left: 0,
    width: 36,
    height: 40,
    justifyContent: "center",
  },
  backText: { color: palette.text, fontSize: 30, lineHeight: 36 },
  headerTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  form: { flex: 1, paddingTop: 108 },
  pageTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    marginBottom: 22,
  },
  label: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    marginBottom: 5,
  },
  lineInput: {
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingHorizontal: 0,
    paddingVertical: 8,
    color: palette.text,
    fontSize: 15,
  },
  emailMessageSlot: { minHeight: 40, paddingTop: 11 },
  message: { color: palette.coral, fontSize: 11, lineHeight: 16 },
  successMessage: { color: palette.green },
  consentRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.4,
    borderColor: palette.blueLine,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: palette.blue,
    borderColor: palette.blue,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  consentText: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  primaryButton: {
    alignSelf: "flex-end",
    minWidth: 106,
    height: 44,
    borderRadius: 24,
    backgroundColor: palette.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  emailEcho: {
    color: palette.blue,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  codeInput: { fontSize: 17, letterSpacing: 6 },
  codeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
  },
  countdown: { color: palette.coral, fontSize: 12, lineHeight: 18 },
  resendLink: { color: palette.blue, fontSize: 11, lineHeight: 18 },
  verifyButton: { marginTop: 52 },
  confirmLabel: { marginTop: 18 },
  passwordHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    marginTop: 18,
  },
  passwordMessageSlot: { minHeight: 52, paddingTop: 12 },
  finishButton: { marginTop: 10 },
  pressed: { opacity: 0.76 },
});
