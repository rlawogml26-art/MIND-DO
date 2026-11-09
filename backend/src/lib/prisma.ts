import { readFileSync } from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

let prisma: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (prisma) return prisma;

  const rawDatabaseUrl = process.env["DATABASE_URL"];
  if (!rawDatabaseUrl) {
    throw new Error("환경변수 DATABASE_URL이 필요합니다.");
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(rawDatabaseUrl);
  } catch {
    throw new Error("환경변수 DATABASE_URL 형식이 올바르지 않습니다.");
  }

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
  prisma = new PrismaClient({ adapter });
  return prisma;
}
