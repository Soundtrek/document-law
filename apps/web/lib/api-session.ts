import "server-only";
import { cookies } from "next/headers";
import { db } from "./database";
import { resolveDatabaseSession } from "./auth-adapter";
import { authSettings, sessionCookieName } from "./auth";
export async function apiSession() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  const session = token ? await resolveDatabaseSession(db, token) : null;
  return session?.identity.provider === authSettings().issuer ? session : null;
}
