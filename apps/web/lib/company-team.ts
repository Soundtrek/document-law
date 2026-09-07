import type { createPrismaClient, Prisma } from "@samma/database";
import { invitationManager, EmploymentError } from "./employment-service";

type Database = ReturnType<typeof createPrismaClient>;
type Actor = { sessionToken: string; issuer: string };
export class TeamAccessError extends Error {
  constructor(readonly code: "denied" | "invalid_roles" | "last_owner" | "conflict") { super(code); }
}
export interface TeamRole { id: string; code: string; label: string }
export interface TeamMember {
  id: string; name: string; email: string; status: string; roles: TeamRole[];
}
async function transaction<T>(db: Database, action: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(action, { isolationLevel: "Serializable", timeout: 10000 }); }
    catch (error) {
      if ((error as { code?: string })?.code !== "P2034") throw error;
      if (attempt >= 4) throw new TeamAccessError("conflict");
    }
  }
}
async function manager(tx: Prisma.TransactionClient, actor: Actor, companyId: string) {
  const session = await tx.authSession.findUnique({ where: { sessionToken: actor.sessionToken }, include: { account: true, identity: true } });
  if (!session || session.expires <= new Date() || session.account.status !== "ACTIVE" || !session.account.emailVerified ||
      session.identity.accountId !== session.accountId || session.identity.provider !== actor.issuer) throw new TeamAccessError("denied");
  try { return await invitationManager(tx, session.accountId, companyId); }
  catch (error) { if (error instanceof EmploymentError) throw new TeamAccessError("denied"); throw error; }
}
const currentRoles = { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } as const;
export async function companyTeam(db: Database, actor: Actor, companyId: string) {
  return transaction(db, async tx => {
    const viewer = await manager(tx, actor, companyId);
    const roles = await tx.functionalRoleDefinition.findMany({ where: { active: true }, select: { id: true, code: true, label: true }, orderBy: { code: "asc" } });
    const rows = await tx.companyMember.findMany({ where: { companyId }, orderBy: { createdAt: "asc" },
      include: { account: { select: { primaryEmail: true, person: { select: { displayName: true } } } }, roleGrants: currentRoles } });
    const members: TeamMember[] = rows.map(row => ({ id: row.id, name: row.account.person?.displayName.trim() || row.account.primaryEmail,
      email: row.account.primaryEmail, status: row.status, roles: roles.filter(role => row.roleGrants.some(grant => grant.functionalRoleId === role.id)) }));
    return { company: { id: companyId, name: viewer.company.name }, viewerRoles: viewer.roleGrants.map(grant => grant.functionalRole.label), members, roles };
  });
}
export async function saveCompanyMemberRoles(db: Database, actor: Actor, input: { companyId: string; memberId: string; roleIds: string[] }) {
  return transaction(db, async tx => {
    const viewer = await manager(tx, actor, input.companyId);
    const target = await tx.companyMember.findFirst({ where: { id: input.memberId, companyId: input.companyId, status: "ACTIVE" }, include: { roleGrants: currentRoles } });
    if (!target) throw new TeamAccessError("denied");
    const roles = await tx.functionalRoleDefinition.findMany({ where: { active: true } });
    const selected = new Set(input.roleIds);
    if (selected.size !== input.roleIds.length || input.roleIds.some(id => !roles.some(role => role.id === id))) throw new TeamAccessError("invalid_roles");
    const owner = roles.find(role => role.code === "OWNER");
    if (owner && !selected.has(owner.id) && target.roleGrants.some(grant => grant.functionalRoleId === owner.id)) {
      // Serializable predicate reads prevent concurrent owners from removing each other/self.
      const otherOwners = await tx.companyMember.count({ where: { companyId: input.companyId, id: { not: target.id }, status: "ACTIVE",
        account: { status: "ACTIVE", emailVerified: true }, roleGrants: { some: { functionalRoleId: owner.id, revokedAt: null, functionalRole: { active: true } } } } });
      if (!otherOwners) throw new TeamAccessError("last_owner");
    }
    for (const role of roles) {
      const grants = target.roleGrants.filter(grant => grant.functionalRoleId === role.id);
      const grant = selected.has(role.id) && !grants.length;
      const revoke = !selected.has(role.id) && grants.length > 0;
      if (!grant && !revoke) continue;
      if (grant) await tx.companyRoleGrant.create({ data: { companyMemberId: target.id, functionalRoleId: role.id } });
      else await tx.companyRoleGrant.updateMany({ where: { companyMemberId: target.id, functionalRoleId: role.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.activityEvent.create({ data: { type: grant ? "COMPANY_ROLE_GRANTED" : "COMPANY_ROLE_REVOKED", companyId: input.companyId,
        actorAccountId: viewer.accountId, summary: JSON.stringify({ companyMemberId: target.id, targetAccountId: target.accountId, roleCode: role.code }) } });
    }
    return { saved: true };
  });
}
