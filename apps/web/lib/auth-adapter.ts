import type { Adapter, AdapterUser } from "@auth/core/adapters";
import type { createPrismaClient } from "@samma/database";

type Database = ReturnType<typeof createPrismaClient>;
export interface LoginContext { identityId?: string; accountId?: string; mfaSatisfied?: boolean; idToken?: string | null }
export interface LogoutContext { completed?: boolean; idToken?: string | null }
const userProjection = (account: { id: string; primaryEmail: string; emailVerified: boolean }): AdapterUser => ({
  id: account.id, email: account.primaryEmail, emailVerified: account.emailVerified ? new Date(0) : null,
});

export async function resolveDatabaseSession(db: Database, token: string) {
  const session = await db.authSession.findUnique({ where: { sessionToken: token }, include: { account: true, identity: true } });
  if (!session || session.expires <= new Date() || session.account.status !== "ACTIVE" ||
      !session.account.emailVerified || session.identity.accountId !== session.accountId) return null;
  return session;
}

export function sammaAdapter(db: Database, issuer: string, login: LoginContext, logout: LogoutContext = {}): Adapter {
  const closed = async (): Promise<never> => { throw new Error("Controlled onboarding required"); };
  return {
    createUser: closed, updateUser: closed, linkAccount: closed,
    // Only resolve provider subjects. The verified callback owns transactional onboarding;
    // Auth.js generic create/link methods remain closed and email matching never links accounts.
    getUserByEmail: async () => null,
    async getUser(id) {
      const account = await db.account.findUnique({ where: { id } });
      return account?.status === "ACTIVE" && account.emailVerified ? userProjection(account) : null;
    },
    async getUserByAccount({ provider, providerAccountId }) {
      if (provider !== "keycloak") return null;
      const link = await db.accountIdentity.findUnique({
        where: { provider_providerSubject: { provider: issuer, providerSubject: providerAccountId } }, include: { account: true },
      });
      return link?.account.status === "ACTIVE" && link.account.emailVerified ? userProjection(link.account) : null;
    },
    async createSession(input) {
      if (!login.identityId || login.accountId !== input.userId) throw new Error("Verified identity required");
      const identity = await db.accountIdentity.findUnique({ where: { id: login.identityId }, include: { account: true } });
      if (!identity || identity.accountId !== input.userId || identity.account.status !== "ACTIVE" || !identity.account.emailVerified) throw new Error("Authentication unavailable");
      await db.authSession.deleteMany({ where: { expires: { lte: new Date() } } });
      await db.authSession.create({ data: {
        sessionToken: input.sessionToken, accountId: input.userId, identityId: identity.id,
        mfaSatisfied: login.mfaSatisfied === true, expires: input.expires, idToken: login.idToken ?? null,
      } });
      return input;
    },
    async getSessionAndUser(token) {
      const row = await resolveDatabaseSession(db, token);
      return row && row.identity.provider === issuer ? { user: userProjection(row.account), session: { sessionToken: token, userId: row.accountId, expires: row.expires } } : null;
    },
    async updateSession(input) {
      // Absolute expiration: a refreshed cookie must never extend the database deadline.
      const row = await resolveDatabaseSession(db, input.sessionToken);
      return row ? { sessionToken: row.sessionToken, userId: row.accountId, expires: row.expires } : null;
    },
    async deleteSession(token) {
      // Keep the hint tied to this browser session, never to the account's latest login.
      const row = await db.$transaction(async transaction => {
        const session = await transaction.authSession.findUnique({ where: { sessionToken: token }, include: { identity: true } });
        await transaction.authSession.deleteMany({ where: { sessionToken: token } });
        return session;
      });
      logout.completed = true;
      logout.idToken = row?.identity.provider === issuer ? row.idToken : null;
      return row ? { sessionToken: row.sessionToken, userId: row.accountId, expires: row.expires } : null;
    },
  };
}

export async function revokeAccountSessions(db: Database, accountId: string, actorAccountId: string) {
  await db.$transaction([
    db.authSession.deleteMany({ where: { accountId } }),
    db.activityEvent.create({ data: { type: "AUTH_SESSIONS_REVOKED", actorAccountId, summary: `Sessions revoked for account ${accountId}` } }),
  ]);
}
