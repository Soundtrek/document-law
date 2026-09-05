import "server-only";
import { createPrismaClient } from "@samma/database";
const globalDb = globalThis as unknown as { sammaDb?: ReturnType<typeof createPrismaClient> };
export const db = globalDb.sammaDb ??= createPrismaClient();
