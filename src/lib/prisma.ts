import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const PRISMA_CLIENT_SIGNATURE = "screening-session-duplicate-policy-v3";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaSignature?: string;
};

const adapter = new PrismaBetterSqlite3({
  url: path.join(process.cwd(), "prisma", "dev.db"),
});

export const prisma =
  globalForPrisma.prisma &&
  globalForPrisma.prismaSignature === PRISMA_CLIENT_SIGNATURE
    ? globalForPrisma.prisma
    : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSignature = PRISMA_CLIENT_SIGNATURE;
}
