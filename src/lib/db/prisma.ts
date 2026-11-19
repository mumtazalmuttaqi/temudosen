import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  const fallbackUrl =
    process.env.DATABASE_URL_POOLED ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL;
  if (fallbackUrl) {
    process.env.DATABASE_URL = fallbackUrl;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

