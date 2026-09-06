import type { createPrismaClient, Prisma } from "@samma/database";

type Database = ReturnType<typeof createPrismaClient>;
type Authorise = (capabilities: readonly string[]) => Promise<{ accountId: string }>;
export const userDirectoryCapability = "platform.security.review";
const pageSize = 50;
const accountFields = {
  id: true, primaryEmail: true, emailVerified: true, status: true, createdAt: true,
  governanceGrants: { where: { revokedAt: null }, select: { capability: true }, orderBy: { capability: "asc" } },
} satisfies Prisma.AccountSelect;

// These explicit projections never read records, files, identities, tokens or event payloads.
export function governanceUserDirectory(db: Database, authorise: Authorise) {
  return {
    async list(search = "", page = 1) {
      await authorise([userDirectoryCapability]);
      const query = search.trim().slice(0, 200);
      const currentPage = Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1;
      const rows = await db.account.findMany({
        where: query ? { OR: [
          { primaryEmail: { contains: query, mode: "insensitive" } },
          { person: { is: { displayName: { contains: query, mode: "insensitive" } } } },
        ] } : {},
        orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (currentPage - 1) * pageSize, take: pageSize + 1,
        select: { ...accountFields, person: { select: { displayName: true, _count: { select: { relationships: true } } } }, _count: { select: { companyMemberships: true } } },
      });
      return { users: rows.slice(0, pageSize), hasNext: rows.length > pageSize, page: currentPage, query };
    },
    async detail(accountId: string) {
      const viewer = await authorise([userDirectoryCapability]);
      const account = await db.account.findUnique({
        where: { id: accountId },
        select: { ...accountFields,
          person: { select: { displayName: true, relationships: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, relationshipType: true, company: { select: { name: true } } } } } },
          companyMemberships: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, company: { select: { name: true, status: true } }, roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, select: { functionalRole: { select: { code: true, label: true } } } } } },
        },
      });
      if (!account) return null;
      // Record the target's stable ID without copying contact information into logs.
      await db.activityEvent.create({ data: { type: "GOVERNANCE_USER_VIEWED", actorAccountId: viewer.accountId, summary: `User directory account viewed: ${account.id}` } });
      const activity = await db.activityEvent.findMany({
        where: { actorAccountId: account.id, type: { in: ["AUTH_LOGIN", "AUTH_LOGOUT", "AUTH_LOGIN_DENIED", "AUTH_SESSIONS_REVOKED", "GOVERNANCE_ACCESS", "GOVERNANCE_DENIED"] }, recordId: null, relationshipId: null, companyId: null, personId: null },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 20,
        select: { id: true, type: true, occurredAt: true },
      });
      return { ...account, activity };
    },
  };
}

export type UserDirectoryList = Awaited<ReturnType<ReturnType<typeof governanceUserDirectory>["list"]>>;
export type UserDirectoryDetail = NonNullable<Awaited<ReturnType<ReturnType<typeof governanceUserDirectory>["detail"]>>>;
