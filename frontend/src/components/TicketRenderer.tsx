import { PHOTO_UPLOAD_MAX_COUNT, type TicketDesign } from "@mind-do/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useId } from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import {
  FALLBACK_BACKGROUND,
  FALLBACK_TEMPLATE,
  LIGHT_CENTER_OPACITY,
  LIGHT_COLOR,
  LIGHT_EDGE_OPACITY,
  TICKET_ASPECT,
  slotsFor,
  type PhotoSlot,
} from "../lib/ticket-templates";

// 개인 티켓(2:1) 한 장을 서버 디자인 값으로 그린다.
// AI 초안 미리보기, 꾸미기·발권 미리보기, 일괄 보기가 모두 이 컴포넌트를 쓴다.
// 규칙(미소 님 시안): 사진은 칸을 꽉 채우고 가운데 기준으로 자름, 1번 사진이 맨 앞,
// 티켓 밖으로 나간 부분은 자름, 회전은 칸 가운데 기준.
type TicketRendererProps = {
  photos: { uri: string }[];
  design: TicketDesign | null;
  width: number;
  borderRadius?: number;
};

// 투명도 0~1을 8자리 hex 색의 뒤 두 자리로 바꾼다 (#RRGGBB + AA)
const withAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

export default function TicketRenderer({
  photos,
  design,
  width,
  borderRadius = 0,
}: TicketRendererProps) {
  const gradientId = `light-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const height = width / TICKET_ASPECT;
  const templateId =
    design?.method === "composite" ? design.templateId : FALLBACK_TEMPLATE;
  const background =
    design?.method === "composite"
      ? design.backgroundColor
      : FALLBACK_BACKGROUND;

  const shown = photos.slice(0, PHOTO_UPLOAD_MAX_COUNT);
  const slots = slotsFor(templateId, shown.length);

  const box = (s: PhotoSlot) => ({
    left: (s.x / 100) * width,
    top: (s.y / 100) * height,
    width: (s.w / 100) * width,
    height: (s.h / 100) * height,
    transform: [{ rotate: `${s.rotate}deg` }],
  });

  // light_basic 빛은 사진 칸 전체를 감싸는 영역에 한 장만 얹는다
  const area =
    slots.length > 0
      ? {
          left: Math.min(...slots.map((s) => s.x)),
          top: Math.min(...slots.map((s) => s.y)),
          right: Math.max(...slots.map((s) => s.x + s.w)),
          bottom: Math.max(...slots.map((s) => s.y + s.h)),
        }
      : null;

  return (
    <View
      style={[
        styles.ticket,
        { width, height, borderRadius, backgroundColor: background },
      ]}
    >
      {/* 1번 사진이 맨 앞에 오도록 뒤 번호부터 그린다 */}
      {slots
        .map((s, index) => ({ s, index }))
        .reverse()
        .map(({ s, index }) => (
          <View key={index} style={[styles.slot, box(s)]}>
            <Image
              source={{ uri: shown[index].uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            {templateId === "blend_fade" && (
              // 칸 맨 위 0% → 맨 아래 100% 배경색 (시안 값)
              <LinearGradient
                pointerEvents="none"
                colors={[withAlpha(background, 0), background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
          </View>
        ))}

      {templateId === "light_basic" && area && (
        <Svg
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (area.left / 100) * width,
            top: (area.top / 100) * height,
          }}
          width={((area.right - area.left) / 100) * width}
          height={((area.bottom - area.top) / 100) * height}
        >
          <Defs>
            {/* 사진 영역 하단 중앙이 중심, 가로·세로 반경은 영역의 절반 */}
            <RadialGradient
              id={gradientId}
              cx="50%"
              cy="100%"
              rx="50%"
              ry="50%"
              fx="50%"
              fy="100%"
            >
              <Stop
                offset="0"
                stopColor={LIGHT_COLOR}
                stopOpacity={LIGHT_CENTER_OPACITY}
              />
              <Stop
                offset="1"
                stopColor={LIGHT_COLOR}
                stopOpacity={LIGHT_EDGE_OPACITY}
              />
            </RadialGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${gradientId})`}
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { overflow: "hidden" },
  slot: { position: "absolute", overflow: "hidden" },
});
