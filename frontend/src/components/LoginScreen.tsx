import SignupScreen from "./SignupScreen";
import { authEmailSchema, authPasswordSchema } from "@mind-do/shared";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import logo from "../../assets/images/memore/logo.png";

const palette = {
  canvas: "#FFF8EF",
  surface: "#FFFDF8",
  brown: "#654C40",
  muted: "#987966",
  border: "#E8D8CA",
  accent: "#CF897C",
  error: "#B85E5C",
};

type LoginScreenProps = {
  // 서버 연결 전 홈 화면 이동을 확인하는 기존 콜백입니다.
  onPreviewHome: () => void;
};

export default function LoginScreen({ onPreviewHome }: LoginScreenProps) {
  const [splashVisible, setSplashVisible] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // 기존 시작 로고 화면을 1.5초 동안 표시합니다.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const emailValid = authEmailSchema.safeParse(email.trim()).success;
  const passwordValid = authPasswordSchema.safeParse(password).success;

  // 피그마 오류 화면처럼 두 입력란에 공통 오류 상태를 적용합니다.
  const hasError = submitted && (!emailValid || !passwordValid);

  const tryLogin = () => {
    setSubmitted(true);

    if (!emailValid || !passwordValid) return;

    Keyboard.dismiss();

    // 후속 Issue #51: 실제 로그인 API 요청과 쿠키 인증으로 교체한다.
    // 현재는 계정을 인증하지 않고 홈 화면 이동만 확인합니다.
    Alert.alert(
      "로그인 화면 테스트",
      "아직 실제 계정 인증은 연결되지 않았어요. 화면 확인용으로 홈에 들어갈까요?",
      [
        { text: "취소", style: "cancel" },
        { text: "홈으로 이동", onPress: onPreviewHome },
      ],
    );
  };

  const showPending = (name: string) => {
    // 후속 Issue #51: 이메일·비밀번호 찾기를 확정된 API로 연결한다.
    Alert.alert(name, "아직 연결되지 않은 기능이에요.");
  };

  if (showSignup) {
    return <SignupScreen onBack={() => setShowSignup(false)} />;
  }

  if (splashVisible) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.splash}>
          <Image
            source={logo}
            resizeMode="contain"
            style={styles.splashLogo}
            accessibilityLabel="MEMO:RE"
          />
          <Text style={styles.tagline}>오늘의 감정을 티켓에 담아 보세요</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginPage}>
            {/* 2번 참고 화면처럼 로그인 입력란 위에 MEMO:RE 로고를 배치합니다. */}
            <View style={styles.brandArea}>
              <Image
                source={logo}
                resizeMode="contain"
                style={styles.brandLogo}
                accessibilityLabel="MEMO:RE"
              />
              <Text style={styles.brandCaption}>
                오늘의 경험을 대표하는 한 장의 사진
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={[styles.label, hasError && styles.labelError]}>
                이메일
              </Text>

              <TextInput
                accessibilityLabel="이메일 입력"
                style={[styles.input, hasError && styles.inputError]}
                placeholder="example@example.com"
                placeholderTextColor={palette.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
              />

              <Text
                style={[
                  styles.label,
                  styles.passwordLabel,
                  hasError && styles.labelError,
                ]}
              >
                비밀번호
              </Text>

              <TextInput
                accessibilityLabel="비밀번호 입력"
                style={[styles.input, hasError && styles.inputError]}
                placeholder="8글자 이상 비밀번호 입력"
                placeholderTextColor={palette.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={tryLogin}
              />

              {/* 오류 유무와 관계없이 공간을 확보해 버튼 위치를 유지합니다. */}
              <View style={styles.errorSlot}>
                {hasError && (
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    [오류] 이메일 주소 또는 비밀번호를 확인해 주세요.
                  </Text>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="로그인"
                onPress={tryLogin}
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.loginButtonText}>로그인</Text>
              </Pressable>

              <View style={styles.links}>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => showPending("이메일 찾기")}
                >
                  <Text style={styles.linkText}>이메일 찾기</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => showPending("비밀번호 찾기")}
                >
                  <Text style={styles.linkText}>비밀번호 찾기</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setShowSignup(true)}
                >
                  <Text style={styles.linkText}>회원가입</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  fill: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  splashLogo: {
    width: 265,
    height: 110,
  },
  tagline: {
    marginTop: 8,
    fontSize: 12,
    color: palette.brown,
    textAlign: "center",
  },
  scrollContent: {
    flexGrow: 1,
  },
  loginPage: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  brandArea: {
    alignItems: "center",
    marginBottom: 140,
  },
  brandLogo: {
    width: 184,
    height: 74,
  },
  brandCaption: {
    color: palette.brown,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  label: {
    color: palette.brown,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: 0.1,
    marginBottom: 6,
  },
  passwordLabel: {
    marginTop: 23,
  },
  labelError: {
    color: palette.accent,
  },
  input: {
    width: "100%",
    height: 51,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 0,
    color: palette.brown,
    fontSize: 14,
    letterSpacing: 0.25,
  },
  inputError: {
    borderWidth: 2,
    borderColor: palette.accent,
  },
  errorSlot: {
    minHeight: 37,
    paddingTop: 10,
    paddingBottom: 7,
    justifyContent: "center",
  },
  errorText: {
    color: palette.error,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  loginButton: {
    width: "100%",
    height: 52,
    borderRadius: 13,
    backgroundColor: palette.brown,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    columnGap: 24,
    rowGap: 12,
    marginTop: 13,
  },
  linkText: {
    color: palette.brown,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
