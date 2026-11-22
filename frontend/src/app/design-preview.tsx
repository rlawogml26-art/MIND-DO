import { DESIGNS, PHOTO_UPLOAD_MAX_COUNT } from "@mind-do/shared";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import TicketRenderer from "../components/TicketRenderer";

// 디자인 확인 화면: 디자이너 PR을 승인하기 전에 팀장이 실제 사진으로 디자인을 본다 (AGENTS.md "티켓 디자인").
// 일반 사용자 흐름에는 연결하지 않는다. Expo Go에서 주소 끝에 /--/design-preview를 붙여 연다.
const SAMPLE_VALUES = {
  title: "홍대 카페 브라운",
  date: "2026-11-20",
  groupName: "마인두",
  participants: ["재희", "지원", "미소", "영환"],
};

// 이 화면은 앱 첫 화면(index)의 SafeAreaProvider 밖에 있어서 따로 감싼다
export default function DesignPreviewScreen() {
  return (
    <SafeAreaProvider>
      <DesignPreview />
    </SafeAreaProvider>
  );
}

function DesignPreview() {
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [emptyTitle, setEmptyTitle] = useState(false);

  const pick = async () => {
    // 기본 사진 선택 창은 사진첩 권한 없이 동작해 Expo Go에서도 쓸 수 있다
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: PHOTO_UPLOAD_MAX_COUNT,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    setPhotos(uris);
    setCount(Math.max(1, Math.min(uris.length, PHOTO_UPLOAD_MAX_COUNT)));
  };

  const values = {
    ...SAMPLE_VALUES,
    title: emptyTitle ? "" : SAMPLE_VALUES.title,
  };
  const ticketWidth = width - 32;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          디자인 확인 ({DESIGNS.length}개)
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable onPress={pick} style={button}>
            <Text>사진 고르기 ({photos.length}장)</Text>
          </Pressable>
          {[1, 2, 3, 4].map((n) => (
            <Pressable
              key={n}
              onPress={() => setCount(n)}
              style={[button, count === n && selected]}
            >
              <Text>{n}장 판</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setEmptyTitle((v) => !v)}
            style={[button, emptyTitle && selected]}
          >
            <Text>제목 비우기</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
        {photos.length === 0 && (
          <Text>사진을 고르면 1~4장 판을 모두 확인할 수 있어요.</Text>
        )}
        {DESIGNS.map((d) => (
          <View key={d.id} style={{ gap: 6 }}>
            <Text>
              {d.name} · {d.id} · {d.category}
            </Text>
            <TicketRenderer
              designId={d.id}
              // 사진이 판보다 적으면 있는 사진을 돌려 써서 판 모양을 확인한다
              photoUris={
                photos.length
                  ? Array.from(
                      { length: count },
                      (_, i) => photos[i % photos.length] ?? "",
                    )
                  : []
              }
              values={values}
              width={ticketWidth}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const button = {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#cccccc",
};
const selected = { backgroundColor: "#e6f0ff", borderColor: "#3b82f6" };
