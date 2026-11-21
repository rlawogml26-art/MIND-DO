// React Native의 FormData는 파일을 { uri, name, type } 객체로 받는다 (브라우저 타입에는 없는 형태).
// 실제 동작에 맞는 타입을 더해 S3 사진 업로드에서 타입 단언(as) 없이 쓰기 위함.
interface FormData {
  append(
    name: string,
    value: { uri: string; name: string; type: string },
  ): void;
}
