import type { createPrismaClient, Prisma } from "@samma/database";
import { canCompanyMemberViewRecord, canLegalProfessionalViewRecord, canPersonViewRecord, type RecordDefinitionVersion, type RecordEntry } from "@samma/domain";

type Database = ReturnType<typeof createPrismaClient>;
type StoredRecord = Prisma.RecordGetPayload<{ include: { definitionVersion: true } }>;
export const strings = (value: unknown): string[] => Array.isArray(value) && value.every(item => typeof item === "string") ? value : [];
export function domainRecord(row: StoredRecord): RecordEntry {
  return { id: row.id, definitionVersionId: row.definitionVersionId, context: row.context, title: row.title,
    status: row.status, uploadedByAccountId: row.uploadedByAccountId, createdAt: row.createdAt.toISOString(),
    ...(row.personId ? { personId: row.personId } : {}), ...(row.companyId ? { companyId: row.companyId } : {}),
    ...(row.relationshipId ? { relationshipId: row.relationshipId } : {}),
    ...(row.reviewDueAt ? { reviewDueAt: row.reviewDueAt.toISOString() } : {}), ...(row.retainUntil ? { retainUntil: row.retainUntil.toISOString() } : {}) };
}
export function domainDefinition(row: StoredRecord["definitionVersion"]): RecordDefinitionVersion {
  return { id: row.id, definitionId: row.recordDefinitionId, version: row.version, name: row.name, category: row.category,
    context: row.context, direction: row.direction, classification: row.classification, personVisible: row.personVisible,
    allowedCompanyRoles: strings(row.allowedCompanyRoles), active: row.active,
    createdAt: row.createdAt.toISOString(), notificationPolicy: "NONE",
    ...(row.retentionMonths !== null ? { retentionMonths: row.retentionMonths } : {}),
    ...(row.reviewMonths !== null ? { reviewMonths: row.reviewMonths } : {}),
  };
}
export async function canReadStoredRecord(db: Database, accountId: string, row: StoredRecord, operation: "view" | "download" = "view") {
  const record = domainRecord(row), definition = domainDefinition(row.definitionVersion);
  const person = await db.person.findUnique({ where: { accountId } });
  if (person && canPersonViewRecord(person.id, record, definition)) return true;
  // A private Person record must never enter a company/legal context via naming fields.
  if (row.context === "PERSON") return false;
  if (row.companyId) {
    const membership = await db.companyMember.findFirst({ where: { accountId, companyId: row.companyId, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
    if (membership && canCompanyMemberViewRecord({ accountId, companyId: row.companyId, membershipStatus: membership.status, roleCodes: membership.roleGrants.map(grant => grant.functionalRole.code) }, record, definition)) return true;
  }
  if (!row.relationshipId || row.context !== "RELATIONSHIP") return false;
  const relationship = await db.personCompanyRelationship.findUnique({ where: { id: row.relationshipId } });
  if (!relationship || relationship.personId !== row.personId || relationship.companyId !== row.companyId) return false;
  const now = new Date();
  const grants = await db.legalAccessGrant.findMany({ where: { grantedToAccountId: accountId, relationshipId: relationship.id, status: "ACTIVE", revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } } });
  return grants.some(grant => (operation !== "download" || grant.canDownload) && Array.isArray(grant.allowedDefinitionIds) && grant.allowedDefinitionIds.every(item => typeof item === "string") &&
    Array.isArray(grant.allowedCategories) && grant.allowedCategories.every(item => typeof item === "string") && canLegalProfessionalViewRecord({ id: grant.id, grantedToAccountId: grant.grantedToAccountId, relationshipId: grant.relationshipId, grantedByAccountId: grant.grantedByAccountId,
    represents: grant.represents, allowedDefinitionIds: strings(grant.allowedDefinitionIds), allowedCategories: strings(grant.allowedCategories), canView: grant.canView, canDownload: grant.canDownload,
    startsAt: grant.startsAt.toISOString(), expiresAt: grant.expiresAt.toISOString(), status: grant.status },
    { id: relationship.id, personId: relationship.personId, companyId: relationship.companyId, relationshipType: relationship.relationshipType, status: relationship.status, createdAt: relationship.createdAt.toISOString() }, record, definition, now.toISOString()));
}
