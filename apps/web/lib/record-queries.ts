import type { createPrismaClient, Prisma } from "@samma/database";
import { buildCompanyEmployeeRecordProjection, buildPersonRecordProjection } from "@samma/domain";
import type { RecordListItem } from "../components/record-list";
import { domainDefinition, domainRecord, isDownloadableFile } from "./record-access";

type Database = ReturnType<typeof createPrismaClient>;
const recordInclude = {
  definitionVersion: true,
  company: { select: { name: true } },
  files: { where: { isCurrent: true }, orderBy: { createdAt: "desc" }, take: 1,
    select: { id: true, acceptedAt: true, scanStatus: true } },
} satisfies Prisma.RecordInclude;
type ListedRecord = Prisma.RecordGetPayload<{ include: typeof recordInclude }>;

function present(records: readonly Omit<RecordListItem, "companyName" | "downloadFileId">[], stored: ListedRecord[]): RecordListItem[] {
  const byId = new Map(stored.map(row => [row.id, row]));
  return records.map(item => {
    const row = byId.get(item.record.id)!;
    const file = row.files[0];
    return { ...item, ...(row.company ? { companyName: row.company.name } : {}),
      ...(file && isDownloadableFile(file) ? { downloadFileId: file.id } : {}) };
  });
}

export async function personRecords(db: Database, personId: string): Promise<RecordListItem[]> {
  const stored = await db.record.findMany({ where: { personId, status: { not: "DELETED" }, definitionVersion: { personVisible: true } },
    include: recordInclude, orderBy: { createdAt: "desc" } });
  return present(buildPersonRecordProjection(personId, stored.map(domainRecord), stored.map(row => domainDefinition(row.definitionVersion)), new Date().toISOString()), stored);
}

export async function relationshipRecords(db: Database, accountId: string, relationshipId: string): Promise<RecordListItem[]> {
  const relationship = await db.personCompanyRelationship.findFirst({ where: { id: relationshipId, company: { status: "ACTIVE" } } });
  if (!relationship) return [];
  const membership = await db.companyMember.findFirst({ where: { accountId, companyId: relationship.companyId, status: "ACTIVE" },
    include: { roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  if (!membership) return [];
  const stored = await db.record.findMany({ where: { relationshipId, companyId: relationship.companyId, personId: relationship.personId,
    context: "RELATIONSHIP", status: { not: "DELETED" } }, include: recordInclude, orderBy: { createdAt: "desc" } });
  const actor = { accountId, companyId: relationship.companyId, membershipStatus: membership.status,
    roleCodes: membership.roleGrants.map(grant => grant.functionalRole.code) };
  return present(buildCompanyEmployeeRecordProjection(actor, { id: relationship.id, companyId: relationship.companyId,
    personId: relationship.personId, status: relationship.status, relationshipType: relationship.relationshipType, createdAt: relationship.createdAt.toISOString() },
    stored.map(domainRecord), stored.map(row => domainDefinition(row.definitionVersion)), new Date().toISOString()), stored);
}
