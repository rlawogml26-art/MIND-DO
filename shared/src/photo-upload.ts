// 사진 업로드 공통 제한 (AI 초안과 사진 업로드 API가 함께 사용)
export const PHOTO_UPLOAD_MIN_COUNT = 1;
export const PHOTO_UPLOAD_MAX_COUNT = 4;
export const PHOTO_UPLOAD_MIN_SIZE_BYTES = 1;
export const PHOTO_UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png"] as const;
