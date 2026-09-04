import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client.js";

export const createPrismaClient = (connectionString = process.env.DATABASE_URL): PrismaClient => {
  if (!connectionString) throw new Error("DATABASE_URL is required to create the Juanity Prisma client");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};
