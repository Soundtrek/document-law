import { createHash, randomBytes } from "node:crypto";
import type { createPrismaClient, Prisma } from "@samma/database";
import type { MailProvider } from "@samma/integrations";
import { invitationManager, normalizedInvitationEmail, EmploymentError } from "./employment-service";

type Database = ReturnType<typeof createPrismaClient>;
type Tx = Prisma.TransactionClient;
export interface TeamInvitationActor { sessionToken: string; issuer: string }
export class TeamInvitationError extends Error {
  constructor(readonly code: "denied" | "unavailable" | "invalid_email" | "invalid_roles") { super(code); }
}
const pending = { acceptedAt: null, declinedAt: null, revokedAt: null } as const;
const publicInvitation = { id: true, invitedEmail: true, expiresAt: true, company: { select: { name: true } },
  initialRoles: { select: { functionalRole: { select: { id: true, code: true, label: true } } } } } as const;
function email(value: unknown) {
  try { return normalizedInvitationEmail(value); }
  catch { throw new TeamInvitationError("invalid_email"); }
}
async function transaction<T>(db: Database, action: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(action, { isolationLevel: "Serializable", timeout: 10000 }); }
    catch (error) {
      const failure = error as { code?: string; meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } } } | null;
      const retry = failure?.code === "P2034" || (failure?.code === "P2010" && ["40001", "40P01"].includes(failure.meta?.code ?? failure.meta?.driverAdapterError?.cause?.originalCode ?? ""));
      if (!retry || attempt >= 4) throw error;
    }
  }
}
async function authenticated(tx: Tx, actor: TeamInvitationActor) {
  const session = await tx.authSession.findUnique({ where: { sessionToken: actor.sessionToken }, include: { account: true, identity: true } });
  if (!session || session.expires <= new Date() || session.account.status !== "ACTIVE" || !session.account.emailVerified ||
      session.identity.accountId !== session.accountId || session.identity.provider !== actor.issuer) throw new TeamInvitationError("denied");
  return session.account;
}
async function manager(tx: Tx, accountId: string, companyId: string) {
  try { return await invitationManager(tx, accountId, companyId); }
  catch (error) { if (error instanceof EmploymentError) throw new TeamInvitationError("denied"); throw error; }
}
function ownerSelection(member: Awaited<ReturnType<typeof manager>>, roles: { code: string }[]) {
  if (roles.some(role => role.code === "OWNER") && !member.roleGrants.some(grant => grant.functionalRole.code === "OWNER")) throw new TeamInvitationError("denied");
}
export async function recipientTeamInvitations(db: Database, actor: TeamInvitationActor) {
  return transaction(db, async tx => {
    const account = await authenticated(tx, actor);
    return tx.companyTeamInvitation.findMany({ where: { ...pending, expiresAt: { gt: new Date() }, invitedEmail: email(account.primaryEmail),
      OR: [{ invitedAccountId: null }, { invitedAccountId: account.id }], company: { status: "ACTIVE" } }, select: publicInvitation, orderBy: { createdAt: "desc" } });
  });
}
export async function companyTeamInvitations(db: Database, actor: TeamInvitationActor, companyId: string) {
  return transaction(db, async tx => {
    const account = await authenticated(tx, actor);
    await manager(tx, account.id, companyId);
    return tx.companyTeamInvitation.findMany({ where: { companyId, ...pending, expiresAt: { gt: new Date() } }, select: publicInvitation, orderBy: { createdAt: "desc" } });
  });
}
export async function sendTeamInvitation(db: Database, actor: TeamInvitationActor, input: { companyId: string; email: unknown; roleIds: string[] }, mail: () => MailProvider, policy: { baseUrl: string; ttlHours: number }) {
  const invitedEmail = email(input.email);
  if (!Number.isFinite(policy.ttlHours) || policy.ttlHours <= 0 || policy.ttlHours > 168 || new URL(policy.baseUrl).protocol !== "https:") throw new Error("Invalid invitation configuration");
  const result = await transaction(db, async tx => {
    // Serializable predicate reads plus this lock also cover expiry/re-invite races.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["team-send", input.companyId, invitedEmail])}, 0))::text`;
    const account = await authenticated(tx, actor);
    const member = await manager(tx, account.id, input.companyId);
    const roles = await tx.functionalRoleDefinition.findMany({ where: { id: { in: input.roleIds }, active: true }, orderBy: { code: "asc" } });
    if (new Set(input.roleIds).size !== input.roleIds.length || roles.length !== input.roleIds.length) throw new TeamInvitationError("invalid_roles");
    ownerSelection(member, roles);
    const now = new Date();
    const existing = await tx.companyTeamInvitation.findFirst({ where: { companyId: input.companyId, invitedEmail, ...pending, expiresAt: { gt: now } } });
    if (existing) return { invitationId: existing.id, created: false, companyName: member.company.name, roles };
    const recipients = await tx.account.findMany({ where: { primaryEmail: { equals: invitedEmail, mode: "insensitive" }, emailVerified: true }, select: { id: true }, take: 2 });
    // Refuse ambiguous legacy casing instead of binding to an arbitrary Account.
    if (recipients.length > 1) throw new TeamInvitationError("unavailable");
    // V1 uses the authenticated inbox, never a bearer URL. Raw bytes are discarded immediately.
    const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
    const invitation = await tx.companyTeamInvitation.create({ data: { companyId: input.companyId, invitedEmail, invitedAccountId: recipients[0]?.id ?? null,
      invitedByAccountId: account.id, tokenHash, expiresAt: new Date(now.getTime() + policy.ttlHours * 3600000),
      initialRoles: { create: roles.map(role => ({ functionalRoleId: role.id })) } } });
    await tx.activityEvent.create({ data: { type: "COMPANY_TEAM_INVITATION_CREATED", actorAccountId: account.id, companyId: input.companyId, summary: JSON.stringify({ invitationId: invitation.id, roleCodes: roles.map(role => role.code) }) } });
    return { invitationId: invitation.id, created: true, companyName: member.company.name, roles };
  });
  let mailDelivered = false;
  if (result.created) {
    try {
      await mail().send({ to: invitedEmail, subject: `SAMMA — Company access invitation from ${result.companyName}`,
        text: `${result.companyName} has invited you to join its SAMMA team.\n\nAssigned access:\n${result.roles.map(role => role.code).join("\n") || "No functional roles selected"}\n\nIf you already have a SAMMA account:\nSign in and open Company access invitations.\n\nIf new:\nRegister using this email, verify, sign in, then accept.\n\nOpen SAMMA: ${new URL("/person#company-access-invitations", policy.baseUrl).href}\n` });
      mailDelivered = true;
    } catch { /* Preserve the inbox invitation; never log mail payloads or provider errors. */ }
  }
  return { invitationId: result.invitationId, created: result.created, mailDelivered };
}
export async function resolveTeamInvitation(db: Database, actor: TeamInvitationActor, invitationId: string, action: "accept" | "decline" | "revoke") {
  return transaction(db, async tx => {
    await tx.$queryRaw`SELECT "id" FROM "CompanyTeamInvitation" WHERE "id" = ${invitationId} FOR UPDATE`;
    const account = await authenticated(tx, actor);
    const invitation = await tx.companyTeamInvitation.findUnique({ where: { id: invitationId }, include: { company: true, initialRoles: { include: { functionalRole: true } } } });
    if (!invitation) throw new TeamInvitationError("denied");
    if (action === "revoke") await manager(tx, account.id, invitation.companyId);
    else if (email(account.primaryEmail) !== invitation.invitedEmail || (invitation.invitedAccountId !== null && invitation.invitedAccountId !== account.id)) throw new TeamInvitationError("denied");
    if (invitation.company.status !== "ACTIVE") throw new TeamInvitationError("unavailable");
    // Retry returns attribution only: it never restores removed membership or revoked roles.
    if (action === "accept" && invitation.acceptedAt && invitation.companyMemberId) return { companyMemberId: invitation.companyMemberId };
    if (invitation.acceptedAt || invitation.declinedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new TeamInvitationError("unavailable");
    if (action === "revoke" || action === "decline") {
      await tx.companyTeamInvitation.update({ where: { id: invitation.id }, data: action === "revoke" ? { revokedAt: new Date() } : { declinedAt: new Date() } });
      await tx.activityEvent.create({ data: { type: action === "revoke" ? "COMPANY_TEAM_INVITATION_REVOKED" : "COMPANY_TEAM_INVITATION_DECLINED", actorAccountId: account.id,
        companyId: invitation.companyId, summary: JSON.stringify({ invitationId: invitation.id }) } });
      return { companyMemberId: null };
    }
    const inviter = await manager(tx, invitation.invitedByAccountId, invitation.companyId);
    const roles = invitation.initialRoles.map(row => row.functionalRole);
    if (roles.some(role => !role.active)) throw new TeamInvitationError("unavailable");
    ownerSelection(inviter, roles);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["team-member", invitation.companyId, account.id])}, 0))::text`;
    let member = await tx.companyMember.findUnique({ where: { companyId_accountId: { companyId: invitation.companyId, accountId: account.id } } });
    const event = (type: string, details: object) => tx.activityEvent.create({ data: { type, actorAccountId: account.id, companyId: invitation.companyId,
      summary: JSON.stringify({ invitationId: invitation.id, ...details }) } });
    if (!member) {
      member = await tx.companyMember.create({ data: { companyId: invitation.companyId, accountId: account.id, status: "ACTIVE" } });
      await event("COMPANY_MEMBER_CREATED", { companyMemberId: member.id, targetAccountId: account.id });
    } else if (member.status !== "ACTIVE") {
      // Unique company/account semantics: reuse attribution, never revive stale privileges.
      const stale = await tx.companyRoleGrant.findMany({ where: { companyMemberId: member.id, revokedAt: null }, include: { functionalRole: true } });
      await tx.companyRoleGrant.updateMany({ where: { companyMemberId: member.id, revokedAt: null }, data: { revokedAt: new Date() } });
      for (const grant of stale) await event("COMPANY_ROLE_REVOKED", { companyMemberId: member.id, targetAccountId: account.id, roleCode: grant.functionalRole.code });
      const previousStatus = member.status;
      member = await tx.companyMember.update({ where: { id: member.id }, data: { status: "ACTIVE" } });
      await event("COMPANY_MEMBER_REACTIVATED", { companyMemberId: member.id, targetAccountId: account.id, previousStatus });
    }
    for (const role of roles) {
      const existing = await tx.companyRoleGrant.findFirst({ where: { companyMemberId: member.id, functionalRoleId: role.id, revokedAt: null } });
      if (!existing) {
        await tx.companyRoleGrant.create({ data: { companyMemberId: member.id, functionalRoleId: role.id } });
        await event("COMPANY_ROLE_GRANTED", { companyMemberId: member.id, targetAccountId: account.id, roleCode: role.code });
      }
    }
    await tx.companyTeamInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date(), companyMemberId: member.id, invitedAccountId: account.id } });
    await event("COMPANY_TEAM_INVITATION_ACCEPTED", { companyMemberId: member.id, targetAccountId: account.id });
    return { companyMemberId: member.id };
  });
}
