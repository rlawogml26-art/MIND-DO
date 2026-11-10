import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 사진 보기 링크는 이 파일의 createPhotoViewUrl로만 만든다 (AGENTS.md: 사진 링크 함수는 서버에 하나).
// 나중에 CloudFront 등으로 바꾸면 이 파일만 고친다.

let s3Client: S3Client | undefined;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`환경변수 ${name}이(가) 필요합니다.`);
  return value;
}

function getBucket(): string {
  return requireEnv("S3_BUCKET_NAME");
}

function getClient(): S3Client {
  if (!s3Client) s3Client = new S3Client({ region: requireEnv("AWS_REGION") });
  return s3Client;
}

function getViewUrlExpiresInSeconds(): number {
  const raw = requireEnv("S3_VIEW_URL_EXPIRES_IN_SECONDS");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      "환경변수 S3_VIEW_URL_EXPIRES_IN_SECONDS은(는) 양의 정수여야 합니다.",
    );
  }
  return value;
}

export async function createPhotoViewUrl(photoKey: string): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getBucket(), Key: photoKey }),
    { expiresIn: getViewUrlExpiresInSeconds() },
  );
}

export async function photoObjectExists(photoKey: string): Promise<boolean> {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: photoKey }),
    );
    return true;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.name === "NotFound" || error.name === "NoSuchKey")
    ) {
      return false;
    }
    throw error;
  }
}
