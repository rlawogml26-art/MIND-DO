import { useState } from "react";
import { authEmailSchema, authPasswordSchema } from "@mind-do/shared";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SignupScreenProps = {
  onBack: () => void;
};

export default function SignupScreen({ onBack }: SignupScreenProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [preview, setPreview] = useState<"none" | "duplicate" | "available">(
    "none",
  );
  const showDuplicatePreview = preview === "duplicate";
  const showAvailablePreview = preview === "available";
  const checkEmail = () => {
    if (!authEmailSchema.safeParse(email.trim()).success) {
      setMessage("이메일 주소를 확인해 주세요.");
      return;
    }
    // 후속 Issue #51: 실제 API로 이메일 중복 여부를 확인한다.
    setPreview("available");
    setMessage("사용 가능한 이메일 주소입니다.");
  };
  const sendVerificationCode = () => {
    // 후속 Issue #51: 실제 인증번호 발송 API로 교체한다.
    setIsCodeSent(true);
    setMessage("인증번호를 입력해 주세요. (화면 테스트)");
  };
  // 발송 버튼을 누르면 인증번호 입력 화면을 표시합니다.
  const checkPassword = () => {
    if (!authPasswordSchema.safeParse(password).success) {
      setPasswordError("비밀번호는 8~64자로 입력해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setPasswordError("");
    // 후속 Issue #51: 회원가입 API 성공 시 쿠키 인증 상태로 홈에 진입한다.
    Alert.alert(
      "비밀번호 설정 확인",
      "비밀번호 설정을 확인했어요.\n현재는 화면 테스트이며 실제 계정은 생성되지 않았어요. 로그인 화면으로 돌아갑니다.",
      [{ text: "확인", onPress: onBack }],
    );
  };
  // 비밀번호 설정 화면은 인증번호 입력 화면보다 먼저 표시합니다.
  if (isSettingPassword) {
    return (
      <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="인증번호 입력으로 돌아가기"
              style={styles.backButton}
              onPress={() => {
                setPassword("");
                setPasswordConfirm("");
                setPasswordError("");
                setMessage("");
                setIsSettingPassword(false);
              }}
            >
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              회원가입
            </Text>
          </View>
          <Text style={styles.title}>비밀번호 설정</Text>
          <View style={styles.field}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              accessibilityLabel="비밀번호"
              style={[
                styles.input,
                passwordError !== "" &&
                  !authPasswordSchema.safeParse(password).success &&
                  styles.duplicateInput,
              ]}
              placeholder="비밀번호 8~64자"
              placeholderTextColor="#987966"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setPasswordError("");
                setMessage("");
              }}
            />
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>비밀번호 확인</Text>
              <TextInput
                accessibilityLabel="비밀번호 확인"
                style={[
                  styles.input,
                  passwordError !== "" &&
                    authPasswordSchema.safeParse(password).success &&
                    password !== passwordConfirm &&
                    styles.duplicateInput,
                ]}
                placeholder="비밀번호를 다시 입력해 주세요"
                placeholderTextColor="#987966"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                value={passwordConfirm}
                onChangeText={(value) => {
                  setPasswordConfirm(value);
                  setPasswordError("");
                  setMessage("");
                }}
              />
            </View>
            {passwordError !== "" && (
              <Text
                accessibilityRole="alert"
                style={[styles.duplicateMessage, { marginTop: 8 }]}
              >
                {passwordError}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              style={[styles.checkButton, { marginTop: 100 }]}
              onPress={checkPassword}
            >
              <Text style={styles.checkButtonText}>다음</Text>
            </Pressable>
            {message !== "" && (
              <Text style={[styles.message, { marginTop: 8 }]}>{message}</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (isCodeSent) {
    return (
      <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이메일 단계로 돌아가기"
              style={styles.backButton}
              onPress={() => {
                setIsCodeSent(false);
                setVerificationCode("");
                setMessage("사용 가능한 이메일 주소입니다.");
              }}
            >
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              회원가입
            </Text>
          </View>
          <Text style={styles.title}>인증번호 입력</Text>
          <View style={styles.field}>
            <Text style={styles.label}>인증번호</Text>
            <TextInput
              accessibilityLabel="인증번호"
              style={styles.input}
              placeholder="인증번호 6자리"
              placeholderTextColor="#987966"
              keyboardType="number-pad"
              value={verificationCode}
              onChangeText={(value) => {
                setVerificationCode(value.replace(/[^0-9]/g, "").slice(0, 6));
                setMessage("");
              }}
            />
            <Pressable
              accessibilityRole="button"
              disabled={verificationCode.length !== 6}
              style={[
                styles.checkButton,
                {
                  marginTop: 150,
                },
                verificationCode.length !== 6 && { opacity: 0.4 },
              ]}
              onPress={() => {
                // 후속 Issue #51: 고정 테스트 번호를 서버 인증번호 검증으로 교체한다.
                if (verificationCode !== "123456") {
                  setMessage(
                    "인증번호가 일치하지 않습니다. 다시 입력해 주세요.",
                  );
                  return;
                }
                setMessage("");
                setIsSettingPassword(true);
              }}
            >
              <Text style={styles.checkButtonText}>인증하기</Text>
            </Pressable>
            {message ===
              "인증번호가 일치하지 않습니다. 다시 입력해 주세요." && (
              <Text accessibilityRole="alert" style={styles.duplicateMessage}>
                {message}
              </Text>
            )}
            {message === "인증번호가 일치해요. (화면 테스트)" && (
              <Text style={styles.message}>{message}</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="로그인으로 돌아가기"
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            회원가입
          </Text>
        </View>
        <Text style={styles.title}>
          {showDuplicatePreview ? "이메일 중복 확인" : "이메일 주소 입력"}
        </Text>
        <View style={styles.field}>
          <Text style={styles.label}>이메일 주소</Text>
          <TextInput
            accessibilityLabel="이메일 주소"
            style={[
              styles.input,
              showDuplicatePreview && styles.duplicateInput,
            ]}
            placeholder="name@example.com"
            placeholderTextColor="#987966"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            editable={!showDuplicatePreview}
            onChangeText={(value) => {
              setEmail(value);
              setMessage("");
              setPreview("none");
              setIsCodeSent(false);
              setVerificationCode("");
            }}
            returnKeyType="done"
            onSubmitEditing={showDuplicatePreview ? undefined : checkEmail}
          />
        </View>
        {/* 안내가 표시되어도 버튼 위치가 바뀌지 않도록 공간을 확보합니다. */}
        <View
          style={[
            styles.messageSlot,
            showDuplicatePreview && styles.duplicateMessageSlot,
          ]}
        >
          {showDuplicatePreview ? (
            <Text accessibilityRole="alert" style={styles.duplicateMessage}>
              이미 가입된 이메일 주소입니다.
            </Text>
          ) : message !== "" ? (
            <Text accessibilityRole="alert" style={styles.message}>
              {message}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.checkButton}
          onPress={
            showDuplicatePreview
              ? () => {
                  setPreview("none");
                  setMessage("");
                }
              : showAvailablePreview
                ? sendVerificationCode
                : checkEmail
          }
        >
          <Text style={styles.checkButtonText}>
            {showDuplicatePreview
              ? "다른 이메일 사용"
              : showAvailablePreview
                ? "인증번호 발송"
                : "이메일 중복 확인"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[
            styles.previewLink,
            showDuplicatePreview && styles.duplicateLink,
          ]}
          onPress={
            showDuplicatePreview ? onBack : () => setPreview("duplicate")
          }
        >
          <Text style={styles.previewLinkText}>
            {showDuplicatePreview
              ? "로그인하기"
              : "중복된 이메일 오류 화면 보기"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EF",
  },
  content: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 39,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  backButton: {
    width: 40,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#FFFDF8",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "#654C40",
    fontSize: 24,
    lineHeight: 32,
  },
  headerTitle: {
    color: "#654C40",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  title: {
    marginTop: 169,
    color: "#654C40",
    fontSize: 22,
    lineHeight: 28,
  },
  field: {
    marginTop: 52,
  },
  label: {
    marginBottom: 6,
    color: "#654C40",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  input: {
    height: 51,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    backgroundColor: "#FFFDF8",
    paddingHorizontal: 12,
    paddingVertical: 0,
    color: "#654C40",
    fontSize: 14,
    letterSpacing: 0.25,
  },
  messageSlot: {
    minHeight: 151,
    paddingTop: 10,
  },
  message: {
    color: "#654C40",
    fontSize: 12,
    lineHeight: 16,
  },
  checkButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#654C40",
    alignItems: "center",
    justifyContent: "center",
  },
  checkButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  previewLink: {
    marginTop: 21,
    minHeight: 35,
    alignItems: "center",
    paddingTop: 8,
  },
  previewLinkText: {
    color: "#987966",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  duplicateInput: {
    borderColor: "#B85E5C",
  },
  duplicateMessageSlot: {
    minHeight: 155,
  },
  duplicateMessage: {
    color: "#B85E5C",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    paddingHorizontal: 10,
  },
  duplicateLink: {
    marginTop: 20,
  },
});
