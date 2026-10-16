// 테스트 사용자 seed. 로그인 기능이 붙기 전까지 서버는 이 사용자를 요청자로 쓴다.
// 이메일·비밀번호는 코드에 쓰지 않고 환경변수(.env.example 참고)로만 받는다.
import { readFileSync } from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name}가 비어 있습니다.`);
  }
  return value;
}

// 접속 정보는 DATABASE_URL 하나만 두고, 어댑터가 받는 형태로 나눠서 넘긴다.
const databaseUrl = new URL(requireEnv("DATABASE_URL"));
// AGENTS.md: DB_SSL_CA_PATH가 있으면 그 인증서로 TLS 연결, 없으면 TLS 없이(로컬 개발용) 연결한다.
const caPath = process.env["DB_SSL_CA_PATH"];
const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.slice(1),
  connectionLimit: 1,
  ...(caPath ? { ssl: { ca: readFileSync(caPath, "utf8") } } : {}),
});
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 10;

async function main() {
  const email = requireEnv("SEED_USER_EMAIL");
  const name = requireEnv("SEED_USER_NAME");
  const passwordHash = await bcrypt.hash(
    requireEnv("SEED_USER_PASSWORD"),
    BCRYPT_ROUNDS,
  );

  // 여러 번 실행해도 사용자가 하나만 남도록 email 기준 upsert
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
    select: { id: true },
  });

  console.log(`테스트 사용자 준비 완료 (userId: ${user.id})`);
}

main()
  .catch((error: unknown) => {
    console.error("seed 실패", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
