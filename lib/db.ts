import { PrismaClient } from "@prisma/client";

function cleanDatabaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let cleaned = url.trim();
  if (cleaned.startsWith("psql ")) {
    cleaned = cleaned.slice(5).trim();
  }
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

const cleanedUrl = cleanDatabaseUrl(process.env.DATABASE_URL);
if (cleanedUrl) {
  process.env.DATABASE_URL = cleanedUrl;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasourceUrl: cleanedUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;

