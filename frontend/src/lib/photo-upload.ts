import {
  PHOTO_UPLOAD_MAX_SIZE_BYTES,
  type SharedTicketPhotoUploadUrlsResponse,
} from "@mind-do/shared";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";

import { ApiError, NETWORK_ERROR, getPhotoUploadUrls } from "./api";

// 서버 제한(10MB)을 넘는 사진만 줄일 때의 긴 변과 화질. 넘지 않으면 원본 크기 그대로 JPEG로만 바꾼다
// 후속 Issue #93: 앱 쪽 축소 기준(긴 변·화질)을 팀에서 확정하면 이 값을 shared/로 옮긴다
const OVERSIZE_MAX_SIDE = 2048;
const JPEG_QUALITY = 0.9;
const OVERSIZE_JPEG_QUALITY = 0.85;
// S3 Presigned POST가 성공하면 돌려주는 상태 코드
const S3_POST_SUCCESS_STATUS = 204;

export const PHOTO_TOO_LARGE = "PHOTO_TOO_LARGE";
export const PHOTO_UPLOAD_FAILED = "PHOTO_UPLOAD_FAILED";

type PreparedPhoto = { uri: string; size: number };

const imageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
  );

async function toJpeg(
  uri: string,
  quality: number,
  maxSide?: number,
): Promise<PreparedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  if (maxSide !== undefined) {
    const { width, height } = await imageSize(uri);
    if (Math.max(width, height) > maxSide) {
      context.resize(
        width >= height ? { width: maxSide } : { height: maxSide },
      );
    }
  }
  const image = await context.renderAsync();
  const jpeg = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: quality,
  });
  const blob = await (await fetch(jpeg.uri)).blob();
  return { uri: jpeg.uri, size: blob.size };
}

// 기기 사진(JPEG·PNG·HEIC 등)을 JPEG로 바꾼다. 서버는 JPEG·PNG, 10MB 이하만 받는다.
async function preparePhoto(uri: string): Promise<PreparedPhoto> {
  const original = await toJpeg(uri, JPEG_QUALITY);
  if (original.size <= PHOTO_UPLOAD_MAX_SIZE_BYTES) return original;
  const reduced = await toJpeg(uri, OVERSIZE_JPEG_QUALITY, OVERSIZE_MAX_SIDE);
  if (reduced.size > PHOTO_UPLOAD_MAX_SIZE_BYTES) {
    throw new ApiError(0, PHOTO_TOO_LARGE);
  }
  return reduced;
}

async function postToS3(
  upload: SharedTicketPhotoUploadUrlsResponse["uploads"][number],
  photo: PreparedPhoto,
): Promise<void> {
  const form = new FormData();
  // 서명 조건(fields)을 파일보다 먼저 넣어야 S3가 받는다
  for (const [name, value] of Object.entries(upload.fields)) {
    form.append(name, value);
  }
  // React Native의 FormData는 { uri, name, type } 객체를 파일로 보낸다
  form.append("file", {
    uri: photo.uri,
    name: "photo.jpg",
    type: "image/jpeg",
  });

  let response: Response;
  try {
    response = await fetch(upload.url, { method: "POST", body: form });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }
  if (response.status !== S3_POST_SUCCESS_STATUS) {
    throw new ApiError(response.status, PHOTO_UPLOAD_FAILED);
  }
}

// 사진 1~4장을 준비해 S3에 직접 올리고, 순서대로 photoKey를 돌려준다.
// photoKey는 AI 초안과 저장(발권) 요청에 그대로 쓴다.
export async function uploadTicketPhotos(
  sharedTicketId: number,
  photoUris: string[],
): Promise<string[]> {
  const prepared = await Promise.all(photoUris.map(preparePhoto));
  const { uploads } = await getPhotoUploadUrls(sharedTicketId, {
    files: prepared.map((p) => ({ contentType: "image/jpeg", size: p.size })),
  });
  await Promise.all(uploads.map((upload, i) => postToS3(upload, prepared[i])));
  return uploads.map((upload) => upload.photoKey);
}
