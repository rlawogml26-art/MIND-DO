// Prisma 7은 DB 주소와 seed 명령을 schema.prisma가 아니라 이 파일에서 읽는다.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // env() 대신 process.env를 쓴다. DB 주소가 없는 CI에서도 prisma generate가 실패하지 않게 하기 위해서다.
    url: process.env["DATABASE_URL"],
  },
});
