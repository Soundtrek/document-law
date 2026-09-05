import { createHash, randomBytes } from "node:crypto";
import type { createPrismaClient, Prisma } from "@samma/database";
import { strings } from "./record-access";

type Database = ReturnType<typeof createPrismaClient>;
type Tx = Prisma.TransactionClient;
export type Actor = { accountId: string; sessionToken?: string };
const denied = () => new Error("This action is unavailable. Check your access and try again.");
export const normalEmail = (value: string) => value.trim().toLowerCase();
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function manualInvitationsEnabled() { return process.env.SAMMA_ENV === "development"; }

async function activeActor(tx: Tx, actor: Actor) {
  const account = await tx.account.findFirst({ where: { id: actor.accountId, status: "ACTIVE", emailVerified: true } });
  if (!account) throw denied();
  if (actor.sessionToken && !await tx.authSession.findFirst({ where: { sessionToken: actor.sessionToken, accountId: account.id, expires: { gt: new Date() } } })) throw denied();
  return account;
}
async function transaction<T>(db: Database, operation: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(operation, { isolationLevel: "Serializable", timeout: 10000 }); }
    catch (error) {
      if (attempt >= 2 || !(error && typeof error === "object" && "code" in error && error.code === "P2034")) throw error;
    }
  }
}
async function lockCompany(tx: Tx, companyId: string) {
  await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${companyId} FOR UPDATE`;
}
export async function companyAccess(db: Pick<Tx, "companyMember">, accountId: string, companyId: string) {
  const member = await db.companyMember.findFirst({ where: { companyId, accountId, status: "ACTIVE", account: { status: "ACTIVE", emailVerified: true }, company: { status: "ACTIVE" } }, include: { company: true, roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  if (!member) throw denied();
  const capabilities = member.roleGrants.flatMap(grant => strings(grant.functionalRole.capabilities));
  return { member, capabilities, manage: capabilities.includes("company.members.manage"), viewPeople: capabilities.includes("company.members.manage") || capabilities.includes("relationship.view") };
}
async function manager(tx: Tx, accountId: string, companyId: string) {
  const access = await companyAccess(tx, accountId, companyId);
  if (!access.manage) throw denied();
  return access;
}
async function personFor(tx: Tx, accountId: string) {
  const existing = await tx.person.findUnique({ where: { accountId } });
  if (existing) return existing;
  const person = await tx.person.create({ data: { accountId, displayName: "Your personal account" } });
  await tx.activityEvent.create({ data: { type: "PERSON_CREATED", actorAccountId: accountId, personId: person.id, summary: "Personal account onboarding completed" } });
  return person;
}
export async function ensurePerson(db: Database, actor: Actor) {
  return transaction(db, async tx => {
    await activeActor(tx, actor);
    await tx.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR UPDATE`;
    return personFor(tx, actor.accountId);
  });
}
export async function createCompany(db: Database, actor: Actor, name: string) {
  name = name.trim();
  if (!name || name.length > 160) throw denied();
  return transaction(db, async tx => {
    await activeActor(tx, actor);
    const owner = await tx.functionalRoleDefinition.findFirst({ where: { code: "OWNER", active: true } });
    if (!owner || !strings(owner.capabilities).includes("company.members.manage")) throw new Error("Company setup is temporarily unavailable. The approved Owner role must be configured.");
    const company = await tx.company.create({ data: { name } });
    await tx.companyMember.create({ data: { companyId: company.id, accountId: actor.accountId, status: "ACTIVE", roleGrants: { create: { functionalRoleId: owner.id } } } });
    for (const type of ["COMPANY_CREATED", "COMPANY_MEMBER_CREATED", "COMPANY_ROLE_GRANTED"]) await tx.activityEvent.create({ data: { type, actorAccountId: actor.accountId, companyId: company.id, summary: "Company created with initial Owner membership" } });
    return company;
  });
}
export async function invite(db: Database, actor: Actor, input: { companyId: string; email: string; kind: "EMPLOYMENT" | "MEMBERSHIP"; roleIds?: string[]; refresh?: boolean }) {
  if (!manualInvitationsEnabled()) throw denied();
  const email = normalEmail(input.email);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw denied();
  const token = randomBytes(32).toString("base64url");
  return transaction(db, async tx => {
    await activeActor(tx, actor); await lockCompany(tx, input.companyId); await manager(tx, actor.accountId, input.companyId);
    const matches = await tx.account.findMany({ where: { primaryEmail: { equals: email, mode: "insensitive" } }, take: 2 });
    if (matches.length > 1 || matches.some(account => !account.emailVerified || account.status !== "ACTIVE")) throw denied();
    const intended = matches[0];
    const existing = await tx.companyInvitation.findUnique({ where: { companyId_email_kind: { companyId: input.companyId, email, kind: input.kind } } });
    if (existing && (existing.acceptedAt || existing.revokedAt || !input.refresh)) return { invitationId: existing.id, token: null, state: existing.acceptedAt ? "Accepted" : existing.revokedAt ? "Revoked" : "Already invited. Use Refresh link to replace the previous link." };
    if (input.kind === "EMPLOYMENT" && intended) {
      const relationship = await tx.personCompanyRelationship.findFirst({ where: { companyId: input.companyId, person: { accountId: intended.id }, status: "ACTIVE" } });
      if (relationship) return { invitationId: null, token: null, state: "A current relationship already exists." };
    }
    if (input.kind === "MEMBERSHIP" && intended && await tx.companyMember.findFirst({ where: { companyId: input.companyId, accountId: intended.id, status: "ACTIVE" } })) return { invitationId: null, token: null, state: "Active team membership already exists." };
    const roleIds = input.kind === "MEMBERSHIP" ? [...new Set(input.roleIds ?? [])] : [];
    if (roleIds.length > 20 || await tx.functionalRoleDefinition.count({ where: { id: { in: roleIds }, active: true } }) !== roleIds.length) throw denied();
    const data = { companyId: input.companyId, email, kind: input.kind, intendedAccountId: intended?.id ?? null, invitedByAccountId: actor.accountId, roleIds, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 24 * 3600000) };
    const invitation = existing ? await tx.companyInvitation.update({ where: { id: existing.id }, data }) : await tx.companyInvitation.create({ data });
    await tx.activityEvent.create({ data: { type: existing ? "COMPANY_INVITATION_REFRESHED" : "COMPANY_INVITATION_CREATED", actorAccountId: actor.accountId, companyId: input.companyId, summary: "DEV manual invitation prepared; no email sent" } });
    return { invitationId: invitation.id, token, state: "DEV invitation ready. No email was sent. Link expires in 24 hours." };
  });
}
export async function acceptInvitation(db: Database, actor: Actor, token: string) {
  if (!manualInvitationsEnabled() || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw denied();
  return transaction(db, async tx => {
    const account = await activeActor(tx, actor);
    const invitation = await tx.companyInvitation.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!invitation || invitation.revokedAt || invitation.email !== normalEmail(account.primaryEmail) || (invitation.intendedAccountId && invitation.intendedAccountId !== account.id)) throw denied();
    if (invitation.acceptedAt) {
      if (invitation.acceptedByAccountId !== account.id) throw denied();
      return { companyId: invitation.companyId, relationshipId: invitation.relationshipId, kind: invitation.kind };
    }
    if (invitation.expiresAt <= new Date()) throw denied();
    await lockCompany(tx, invitation.companyId);
    await manager(tx, invitation.invitedByAccountId, invitation.companyId);
    const person = await personFor(tx, account.id);
    let relationshipId: string | null = null;
    if (invitation.kind === "EMPLOYMENT") {
      let relationship = await tx.personCompanyRelationship.findFirst({ where: { personId: person.id, companyId: invitation.companyId, status: { in: ["PENDING", "ACTIVE"] } }, orderBy: { createdAt: "asc" } });
      if (relationship) relationship = await tx.personCompanyRelationship.update({ where: { id: relationship.id }, data: { status: "ACTIVE", startedAt: relationship.startedAt ?? new Date() } });
      else relationship = await tx.personCompanyRelationship.create({ data: { personId: person.id, companyId: invitation.companyId, relationshipType: "EMPLOYMENT", status: "ACTIVE", startedAt: new Date() } });
      relationshipId = relationship.id;
      await tx.activityEvent.create({ data: { type: "RELATIONSHIP_ACTIVATED", actorAccountId: account.id, companyId: invitation.companyId, personId: person.id, relationshipId, summary: "Employee accepted company relationship" } });
    } else {
      const roleIds = strings(invitation.roleIds);
      if (await tx.functionalRoleDefinition.count({ where: { id: { in: roleIds }, active: true } }) !== roleIds.length) throw denied();
      const previous = await tx.companyMember.findUnique({ where: { companyId_accountId: { companyId: invitation.companyId, accountId: account.id } } });
      // A disabled/removed membership requires explicit owner review, never invitation resurrection.
      if (previous && previous.status !== "INVITED" && previous.status !== "ACTIVE") throw denied();
      const member = await tx.companyMember.upsert({ where: { companyId_accountId: { companyId: invitation.companyId, accountId: account.id } }, create: { companyId: invitation.companyId, accountId: account.id, status: "ACTIVE" }, update: { status: "ACTIVE" } });
      for (const functionalRoleId of roleIds) if (!await tx.companyRoleGrant.findFirst({ where: { companyMemberId: member.id, functionalRoleId, revokedAt: null } })) {
        await tx.companyRoleGrant.create({ data: { companyMemberId: member.id, functionalRoleId } });
        await tx.activityEvent.create({ data: { type: "COMPANY_ROLE_GRANTED", actorAccountId: account.id, companyId: invitation.companyId, summary: "Approved invitation role granted" } });
      }
      await tx.activityEvent.create({ data: { type: "COMPANY_MEMBER_CREATED", actorAccountId: account.id, companyId: invitation.companyId, summary: "Team invitation accepted" } });
    }
    await tx.companyInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date(), acceptedByAccountId: account.id, intendedAccountId: account.id, relationshipId } });
    await tx.activityEvent.create({ data: { type: "COMPANY_INVITATION_ACCEPTED", actorAccountId: account.id, companyId: invitation.companyId, personId: person.id, relationshipId, summary: "Invitation bound to authenticated stable account" } });
    return { companyId: invitation.companyId, relationshipId, kind: invitation.kind };
  });
}
export async function changeTeam(db: Database, actor: Actor, input: { companyId: string; memberId?: string; roleId?: string; invitationId?: string; action: "grant" | "revoke" | "remove" | "cancel" }) {
  return transaction(db, async tx => {
    await activeActor(tx, actor); await lockCompany(tx, input.companyId); await manager(tx, actor.accountId, input.companyId);
    if (input.action === "cancel") {
      const changed = await tx.companyInvitation.updateMany({ where: { id: input.invitationId ?? "", companyId: input.companyId, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      if (!changed.count) throw denied();
    } else {
      const member = await tx.companyMember.findFirst({ where: { id: input.memberId ?? "", companyId: input.companyId, status: "ACTIVE" } });
      if (!member) throw denied();
      const role = input.roleId ? await tx.functionalRoleDefinition.findFirst({ where: { id: input.roleId, active: true } }) : null;
      if (input.action !== "remove" && !role) throw denied();
      if (input.action === "remove" || (input.action === "revoke" && role?.code === "OWNER")) {
        const ownerGrants = await tx.companyRoleGrant.findMany({ where: { revokedAt: null, functionalRole: { code: "OWNER", active: true }, companyMember: { companyId: input.companyId, status: "ACTIVE" } } });
        if (ownerGrants.some(grant => grant.companyMemberId === member.id) && !ownerGrants.some(grant => grant.companyMemberId !== member.id)) throw new Error("Keep at least one active Company Owner.");
      }
      if (input.action === "grant" && role) {
        if (!await tx.companyRoleGrant.findFirst({ where: { companyMemberId: member.id, functionalRoleId: role.id, revokedAt: null } })) await tx.companyRoleGrant.create({ data: { companyMemberId: member.id, functionalRoleId: role.id } });
      } else {
        await tx.companyRoleGrant.updateMany({ where: { companyMemberId: member.id, revokedAt: null, ...(input.action === "revoke" ? { functionalRoleId: role!.id } : {}) }, data: { revokedAt: new Date() } });
        if (input.action === "remove") await tx.companyMember.update({ where: { id: member.id }, data: { status: "REMOVED" } });
      }
    }
    await tx.activityEvent.create({ data: { type: `COMPANY_ACCESS_${input.action.toUpperCase()}`, actorAccountId: actor.accountId, companyId: input.companyId, summary: `Company access ${input.action}; target ${input.memberId ?? input.invitationId}` } });
  });
}
export async function relationshipProfile(db: Database, accountId: string, relationshipId: string) {
  const relationship = await db.personCompanyRelationship.findUnique({ where: { id: relationshipId }, include: { person: { include: { account: { select: { primaryEmail: true } } } }, company: true } });
  if (!relationship || !(await companyAccess(db, accountId, relationship.companyId)).viewPeople) throw denied();
  return relationship;
}
