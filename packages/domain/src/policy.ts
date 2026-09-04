import type {
  CompanyActorContext,
  LegalAccessGrant,
  PersonCompanyRelationship,
  RecordDefinitionVersion,
  RecordEntry,
} from "./model.js";

const addUtcMonths = (iso: string, months: number): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid ISO date");
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString();
};

export const deriveRecordDates = (
  definition: Pick<RecordDefinitionVersion, "retentionMonths" | "reviewMonths">,
  createdAt: string,
): { retainUntil?: string; reviewDueAt?: string } => {
  const result: { retainUntil?: string; reviewDueAt?: string } = {};
  if (definition.retentionMonths !== undefined) result.retainUntil = addUtcMonths(createdAt, definition.retentionMonths);
  if (definition.reviewMonths !== undefined) result.reviewDueAt = addUtcMonths(createdAt, definition.reviewMonths);
  return result;
};

export const validateRecordContext = (record: RecordEntry): boolean => {
  if (record.context === "PERSON") return Boolean(record.personId) && !record.relationshipId;
  if (record.context === "COMPANY") return Boolean(record.companyId) && !record.relationshipId;
  return Boolean(record.personId && record.companyId && record.relationshipId);
};

export const canPersonViewRecord = (
  personId: string,
  record: RecordEntry,
  definition: RecordDefinitionVersion,
): boolean => Boolean(definition.personVisible && record.personId === personId && record.status !== "DELETED");

export const canCompanyMemberViewRecord = (
  actor: CompanyActorContext,
  record: RecordEntry,
  definition: RecordDefinitionVersion,
): boolean => {
  if (actor.membershipStatus !== "ACTIVE") return false;
  if (record.companyId !== actor.companyId) return false;
  if (record.status === "DELETED") return false;
  return definition.allowedCompanyRoles.some((role) => actor.roleCodes.includes(role));
};

export const isLegalGrantActive = (grant: LegalAccessGrant, atIso: string): boolean => {
  if (grant.status !== "ACTIVE" || grant.revokedAt) return false;
  const at = new Date(atIso).getTime();
  return at >= new Date(grant.startsAt).getTime() && at < new Date(grant.expiresAt).getTime();
};

export const canLegalProfessionalViewRecord = (
  grant: LegalAccessGrant,
  relationship: PersonCompanyRelationship,
  record: RecordEntry,
  definition: RecordDefinitionVersion,
  atIso: string,
): boolean => {
  if (!grant.canView || !isLegalGrantActive(grant, atIso)) return false;
  if (grant.relationshipId !== relationship.id || record.relationshipId !== relationship.id) return false;
  if (record.status === "DELETED") return false;

  const definitionMatch = grant.allowedDefinitionIds.length === 0 || grant.allowedDefinitionIds.includes(definition.definitionId);
  const categoryMatch = grant.allowedCategories.length === 0 || grant.allowedCategories.includes(definition.category);
  return definitionMatch && categoryMatch;
};

export const shouldFlagReview = (record: RecordEntry, atIso: string): boolean => {
  if (!record.reviewDueAt || record.status !== "ACTIVE") return false;
  return new Date(record.reviewDueAt).getTime() <= new Date(atIso).getTime();
};
