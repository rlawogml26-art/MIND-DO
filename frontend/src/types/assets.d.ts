/// <reference types="expo/types" />

declare module "*.png" {
  const source: import("react-native").ImageSourcePropType;
  export default source;
}

// 티켓 디자인 그림은 WebP로 내보낸다 (용량)
declare module "*.webp" {
  const source: import("react-native").ImageSourcePropType;
  export default source;
}
