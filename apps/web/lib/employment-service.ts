import { createHash, randomBytes } from "node:crypto";
import type { createPrismaClient, Prisma } from "@samma/database";
import type { MailProvider } from "@samma/integrations";

type Database = ReturnType<typeof createPrismaClient>;
type Tx = Prisma.TransactionClient;
export interface EmploymentActor { sessionToken: string; issuer: string }
export class EmploymentError extends Error {
  constructor(readonly code: "denied" | "unavailable" | "invalid_email") { super(code); }
}
const pending = { acceptedAt: null, declinedAt: null, revokedAt: null } as const;
export function normalizedInvitationEmail(value: unknown): string {
  if (typeof value !== "string") throw new EmploymentError("invalid_email");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) || email.split("@")[0]!.length > 64) throw new EmploymentError("invalid_email");
  return email;
}
export function hasInvitationCapability(grants: { functionalRole: { capabilities: unknown } }[]): boolean {
  return grants.some(({ functionalRole }) => Array.isArray(functionalRole.capabilities) && functionalRole.capabilities.includes("company.members.manage"));
}
async function transaction<T>(db: Database, action: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(action, { isolationLevel: "Serializable", timeout: 10000 }); }
    catch (error) {
      // Prisma wraps SQLSTATE failures from explicit row locks as P2010;
      // ORM write conflicts use P2034. Both mean the transaction rolled back.
      const failure = error as { code?: string; meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } } } | null;
      const retry = failure?.code === "P2034" || (failure?.code === "P2010" && ["40001", "40P01"].includes(failure.meta?.code ?? failure.meta?.driverAdapterError?.cause?.originalCode ?? ""));
      if (!retry || attempt >= 4) throw error;
    }
  }
}
async function authenticated(tx: Tx, actor: EmploymentActor) {
  const session = await tx.authSession.findUnique({ where: { sessionToken: actor.sessionToken }, include: { account: { include: { person: true } }, identity: true } });
  if (!session || session.expires <= new Date() || session.account.status !== "ACTIVE" || !session.account.emailVerified ||
      session.identity.accountId !== session.accountId || session.identity.provider !== actor.issuer) throw new EmploymentError("denied");
  return session.account;
}
export async function invitationManager(tx: Pick<Tx, "companyMember">, accountId: string, companyId: string) {
  const member = await tx.companyMember.findFirst({ where: { accountId, companyId, status: "ACTIVE", account: { status: "ACTIVE", emailVerified: true }, company: { status: "ACTIVE" } },
    include: { company: true, roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  if (!member || !hasInvitationCapability(member.roleGrants)) throw new EmploymentError("denied");
  return member;
}
const publicInvitation = { id: true, companyId: true, invitedEmail: true, expiresAt: true, company: { select: { name: true } } } as const;

export async function personInvitations(db: Database, actor: EmploymentActor) {
  return transaction(db, async tx => {
    const account = await authenticated(tx, actor);
    if (!account.person) throw new EmploymentError("denied");
    return tx.employmentInvitation.findMany({ where: { ...pending, expiresAt: { gt: new Date() }, invitedEmail: normalizedInvitationEmail(account.primaryEmail),
      OR: [{ invitedAccountId: null }, { invitedAccountId: account.id }], company: { status: "ACTIVE" } }, select: publicInvitation, orderBy: { createdAt: "desc" } });
  });
}
export async function companyInvitations(db: Database, actor: EmploymentActor, companyId: string) {
  return transaction(db, async tx => {
    const account = await authenticated(tx, actor);
    await invitationManager(tx, account.id, companyId);
    return tx.employmentInvitation.findMany({ where: { companyId, ...pending, expiresAt: { gt: new Date() } }, select: publicInvitation, orderBy: { createdAt: "desc" } });
  });
}

export async function sendEmploymentInvitation(db: Database, actor: EmploymentActor, input: { companyId: string; email: unknown }, mail: () => MailProvider, policy: { baseUrl: string; ttlHours: number }) {
  const email = normalizedInvitationEmail(input.email);
  if (!Number.isFinite(policy.ttlHours) || policy.ttlHours <= 0 || policy.ttlHours > 168 || new URL(policy.baseUrl).protocol !== "https:") throw new Error("Invalid invitation configuration");
  const result = await transaction(db, async tx => {
    // Includes expired/re-invite races without overwriting any completed history.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["employment-send", input.companyId, email])}, 0))::text`;
    const account = await authenticated(tx, actor);
    const member = await invitationManager(tx, account.id, input.companyId);
    const now = new Date();
    const existing = await tx.employmentInvitation.findFirst({ where: { companyId: input.companyId, invitedEmail: email, ...pending, expiresAt: { gt: now } } });
    if (existing) return { invitationId: existing.id, created: false, companyName: member.company.name };
    const recipient = await tx.account.findFirst({ where: { primaryEmail: { equals: email, mode: "insensitive" }, emailVerified: true }, select: { id: true } });
    // No bearer-token link in V1: the authenticated inbox is sufficient. Raw bytes
    // exist only while hashing, and never enter persistence, mail, audit or output.
    const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
    const invitation = await tx.employmentInvitation.create({ data: { companyId: input.companyId, invitedEmail: email, invitedAccountId: recipient?.id ?? null,
      invitedByAccountId: account.id, tokenHash, expiresAt: new Date(now.getTime() + policy.ttlHours * 3600000) } });
    await tx.activityEvent.create({ data: { type: "EMPLOYMENT_INVITATION_CREATED", actorAccountId: account.id, companyId: input.companyId, summary: `Employment invitation ${invitation.id} created` } });
    return { invitationId: invitation.id, created: true, companyName: member.company.name };
  });
  // Send only after commit; SMTP must not be repeated by transaction retries.
  // Mail failure preserves the valid inbox invitation and is reported honestly.
  let mailDelivered = false;
  if (result.created) {
    try {
      await mail().send({ to: email, subject: `SAMMA — Employment records invitation from ${result.companyName}`,
        text: `${result.companyName} has invited you to connect on SAMMA for employment records.\n\nIf you already have a SAMMA account:\nSign in and open Pending invitations.\n\nIf you're new to SAMMA:\nCreate a Person account using this email address, verify it, then open Pending invitations.\n\nOpen SAMMA: ${new URL("/person", policy.baseUrl).href}\n` });
      mailDelivered = true;
    } catch { /* Never log provider payloads, addresses or raw errors. */ }
  }
  return { invitationId: result.invitationId, created: result.created, mailDelivered };
}

export async function resolveEmploymentInvitation(db: Database, actor: EmploymentActor, invitationId: string, action: "accept" | "decline" | "revoke") {
  return transaction(db, async tx => {
    await tx.$queryRaw`SELECT "id" FROM "EmploymentInvitation" WHERE "id" = ${invitationId} FOR UPDATE`;
    const account = await authenticated(tx, actor);
    const invitation = await tx.employmentInvitation.findUnique({ where: { id: invitationId }, include: { company: true } });
    if (!invitation) throw new EmploymentError("denied");
    if (action === "revoke") {
      await invitationManager(tx, account.id, invitation.companyId);
    } else {
      if (!account.person || normalizedInvitationEmail(account.primaryEmail) !== invitation.invitedEmail ||
          (invitation.invitedAccountId !== null && invitation.invitedAccountId !== account.id)) throw new EmploymentError("denied");
    }
    if (invitation.company.status !== "ACTIVE") throw new EmploymentError("unavailable");
    // Authorise the current recipient even on a retry. Never recreate an ended relationship.
    if (action === "accept" && invitation.acceptedAt && invitation.relationshipId) return { relationshipId: invitation.relationshipId };
    if (invitation.acceptedAt || invitation.declinedAt || invitation.revokedAt || invitation.expiresAt <= new Date() || invitation.company.status !== "ACTIVE") throw new EmploymentError("unavailable");
    if (action === "revoke" || action === "decline") {
      await tx.employmentInvitation.update({ where: { id: invitation.id }, data: action === "revoke" ? { revokedAt: new Date() } : { declinedAt: new Date() } });
      await tx.activityEvent.create({ data: { type: action === "revoke" ? "EMPLOYMENT_INVITATION_REVOKED" : "EMPLOYMENT_INVITATION_DECLINED", actorAccountId: account.id, companyId: invitation.companyId,
        ...(action === "decline" ? { personId: account.person!.id } : {}), summary: `Employment invitation ${invitation.id} ${action === "revoke" ? "revoked" : "declined"}` } });
      return { relationshipId: null };
    }
    // Require the original inviter to retain current permission at acceptance.
    await invitationManager(tx, invitation.invitedByAccountId, invitation.companyId);
    const personId = account.person!.id;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["employment-relationship", invitation.companyId, personId])}, 0))::text`;
    const where = { personId, companyId: invitation.companyId, relationshipType: "EMPLOYMENT" };
    let relationship = await tx.personCompanyRelationship.findFirst({ where: { ...where, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
    let activated = false;
    if (!relationship) {
      const waiting = await tx.personCompanyRelationship.findFirst({ where: { ...where, status: "PENDING" }, orderBy: { createdAt: "asc" } });
      relationship = waiting
        ? await tx.personCompanyRelationship.update({ where: { id: waiting.id }, data: { status: "ACTIVE", startedAt: waiting.startedAt ?? new Date() } })
        : await tx.personCompanyRelationship.create({ data: { ...where, status: "ACTIVE", startedAt: new Date() } });
      activated = true;
    }
    await tx.employmentInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date(), relationshipId: relationship.id } });
    await tx.activityEvent.createMany({ data: [
      { type: "EMPLOYMENT_INVITATION_ACCEPTED", summary: `Employment invitation ${invitation.id} accepted` },
      ...(activated ? [{ type: "EMPLOYMENT_RELATIONSHIP_ACTIVATED", summary: "Employment relationship activated by verified recipient" }] : []),
    ].map(event => ({ ...event, actorAccountId: account.id, companyId: invitation.companyId, personId, relationshipId: relationship.id })) });
    return { relationshipId: relationship.id };
  });
}
