import type { createPrismaClient, Prisma } from "@samma/database";
import { DefinitionError, hasDocumentSettingsCapability, parseDefinitionPolicy } from "./definition-policy";
export { DefinitionError } from "./definition-policy";
type Database = ReturnType<typeof createPrismaClient>;
type Tx = Prisma.TransactionClient;
export interface DefinitionActor { sessionToken: string; issuer: string; mfaRequired: boolean }
const versions = { orderBy: { version: "desc" as const } };
async function transaction<T>(db: Database, fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(fn, { isolationLevel: "Serializable", timeout: 10000 }); }
    catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2002") throw new DefinitionError("conflict");
      if (code !== "P2034") throw error;
      if (attempt >= 3) throw new DefinitionError("conflict");
    }
  }
}
async function authorise(tx: Tx, actor: DefinitionActor, companyId: string | null) {
  const session = await tx.authSession.findUnique({ where: { sessionToken: actor.sessionToken }, include: { account: true, identity: true } });
  if (!session || session.expires <= new Date() || session.account.status !== "ACTIVE" || !session.account.emailVerified ||
    session.identity.accountId !== session.accountId || session.identity.provider !== actor.issuer) throw new DefinitionError("denied");
  if (companyId === null) {
    if (actor.mfaRequired && !session.mfaSatisfied) throw new DefinitionError("denied");
    if (!await tx.governanceCapabilityGrant.findFirst({ where: { accountId: session.accountId, revokedAt: null, capability: "platform.definitions.manage" } })) throw new DefinitionError("denied");
  } else {
    const member = await tx.companyMember.findFirst({ where: { accountId: session.accountId, companyId, status: "ACTIVE", company: { status: "ACTIVE" } },
      include: { roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
    if (!member || !hasDocumentSettingsCapability(member.roleGrants)) throw new DefinitionError("denied");
  }
  return session.accountId;
}
export async function definitionCatalogue(db: Database, actor: DefinitionActor, companyId: string | null) {
  return transaction(db, async tx => {
    await authorise(tx, actor, companyId);
    const definitions = await tx.recordDefinition.findMany({ where: companyId === null ? { companyId: null } : { OR: [{ companyId: null }, { companyId }] }, include: { versions }, orderBy: { code: "asc" } });
    const roles = await tx.functionalRoleDefinition.findMany({ where: { active: true }, select: { id: true, code: true, label: true }, orderBy: { code: "asc" } });
    const company = companyId ? await tx.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } }) : null;
    return { definitions, roles, company };
  });
}
export type DefinitionCatalogue = Awaited<ReturnType<typeof definitionCatalogue>>;
export type DefinitionRow = DefinitionCatalogue["definitions"][number];
export type DefinitionMutation = { action: "save"; definitionId?: string; expectedVersion?: number; policy: unknown } |
  { action: "activate" | "deactivate"; definitionId: string; expectedVersion: number };
// Shared configuration path for authenticated UI and the explicitly authorised DEV starter-pack installer.
// No record, file or actor policy ever switches on definition codes.
export async function writeDefinitionPolicy(tx: Tx, companyId: string | null, actorAccountId: string | null, input: DefinitionMutation) {
  const existing = input.definitionId ? await tx.recordDefinition.findFirst({ where: { id: input.definitionId, companyId }, include: { versions } }) : null;
  if (input.definitionId && !existing) throw new DefinitionError("denied");
  const latest = existing?.versions[0];
  if (existing && input.expectedVersion !== latest?.version) throw new DefinitionError("conflict");
  const prefix = companyId ? "COMPANY_DOCUMENT_DEFINITION" : "RECORD_DEFINITION";
  async function audit(type: string, definitionId: string, version: number) {
    await tx.activityEvent.create({ data: { type: `${prefix}_${type}`, actorAccountId, companyId, summary: JSON.stringify({ definitionId, version }) } });
  }
  if (input.action !== "save") {
    if (!existing || !latest) throw new DefinitionError("denied");
    const active = input.action === "activate";
    await tx.recordDefinition.update({ where: { id: existing.id }, data: { active } });
    if (existing.active !== active) await audit(active ? "ACTIVATED" : "DEACTIVATED", existing.id, latest.version);
    return { definitionId: existing.id, version: latest.version };
  }
  const policy = parseDefinitionPolicy(input.policy, existing?.code);
  if (existing && existing.code !== policy.code) throw new DefinitionError("invalid_policy");
  const roles = await tx.functionalRoleDefinition.findMany({ where: { id: { in: policy.roleIds }, active: true } });
  if (roles.length !== policy.roleIds.length) throw new DefinitionError("invalid_roles");
  const { code, active, roleIds: _roleIds, ...fields } = policy;
  void _roleIds;
  const definition = existing ?? await tx.recordDefinition.create({ data: { companyId, code, key: companyId ? `company:${companyId}:${code}` : code, active } });
  const version = (latest?.version ?? 0) + 1;
  await tx.recordDefinitionVersion.create({ data: { ...fields, recordDefinitionId: definition.id, version, context: "RELATIONSHIP", active: true, allowedCompanyRoles: roles.map(role => role.code).sort() } });
  if (existing) await tx.recordDefinition.update({ where: { id: existing.id }, data: { active } });
  await audit(existing ? "VERSION_CREATED" : "CREATED", definition.id, version);
  if (existing && existing.active !== active) await audit(active ? "ACTIVATED" : "DEACTIVATED", definition.id, version);
  return { definitionId: definition.id, version };
}
export async function mutateDefinition(db: Database, actor: DefinitionActor, companyId: string | null, input: DefinitionMutation) {
  return transaction(db, async tx => {
    const accountId = await authorise(tx, actor, companyId);
    return writeDefinitionPolicy(tx, companyId, accountId, input);
  });
}
