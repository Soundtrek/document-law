import { randomUUID } from "node:crypto";
import type { createPrismaClient } from "@samma/database";
import { RecordIntakeService, type RecordRepository, type UploadScanner, type ScanPolicy } from "@samma/application";
import type { StorageProvider, UploadSource } from "@samma/storage";
import { domainDefinition, domainRecord } from "./record-access";
type Database = ReturnType<typeof createPrismaClient>;
type Reader = Pick<Database, "companyMember" | "personCompanyRelationship" | "recordDefinitionVersion" | "record">;
export async function uploadContext(db: Reader, accountId: string, relationshipId: string, definitionId: string, recordId?: string) {
  const relationship = await db.personCompanyRelationship.findFirst({ where: { id: relationshipId, status: "ACTIVE", company: { status: "ACTIVE" } } });
  if (!relationship) throw new Error("Upload not authorised");
  const member = await db.companyMember.findFirst({ where: { companyId: relationship.companyId, accountId, status: "ACTIVE" }, include: { roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  const definition = await db.recordDefinitionVersion.findUnique({ where: { id: definitionId }, include: { recordDefinition: true } });
  if (!member || !definition || !definition.active || !definition.recordDefinition.active || definition.context !== "RELATIONSHIP") throw new Error("Upload not authorised");
  const actor = { accountId, companyId: relationship.companyId, membershipStatus: member.status, roleCodes: member.roleGrants.map(grant => grant.functionalRole.code) };
  if (!domainDefinition(definition).allowedCompanyRoles.some(role => actor.roleCodes.includes(role))) throw new Error("Upload not authorised");
  const existing = recordId ? await db.record.findUnique({ where: { id: recordId }, include: { definitionVersion: true } }) : null;
  if (recordId && (!existing || existing.relationshipId !== relationshipId || existing.companyId !== relationship.companyId || existing.personId !== relationship.personId || existing.definitionVersionId !== definition.id || existing.status !== "ACTIVE")) throw new Error("Upload not authorised");
  return { actor, relationship, definition, existing };
}
export async function persistRelationshipUpload(db: Database, storage: StorageProvider, scanner: UploadScanner, policy: ScanPolicy, input: {
  accountId: string; relationshipId: string; definitionId: string; title: string; filename: string; contentType: string; source: UploadSource; recordId?: string; sessionToken?: string;
}) {
  const context = await uploadContext(db, input.accountId, input.relationshipId, input.definitionId, input.recordId);
  const repository: RecordRepository = {
    isFileCommitted: async fileId => Boolean(await db.recordFile.findUnique({ where: { id: fileId }, select: { id: true } })),
    appendActivity: async activity => { await db.activityEvent.create({ data: { ...activity, occurredAt: new Date(activity.occurredAt) } }); },
    createRecord: async ({ record, file, activity }) => {
      await db.$transaction(async tx => {
        if (input.recordId) await tx.$queryRaw`SELECT id FROM "Record" WHERE id = ${input.recordId} FOR UPDATE`;
        // Re-read current session/account and permissions inside the serializable transaction.
        const account = await tx.account.findFirst({ where: { id: input.accountId, status: "ACTIVE", emailVerified: true } });
        if (!account) throw new Error("Upload not authorised");
        if (input.sessionToken) {
          const session = await tx.authSession.findFirst({ where: { sessionToken: input.sessionToken, accountId: input.accountId, expires: { gt: new Date() } } });
          if (!session) throw new Error("Upload session revoked");
        }
        await uploadContext(tx, input.accountId, input.relationshipId, input.definitionId, input.recordId);
        if (!input.recordId) {
          await tx.record.create({ data: { id: record.id, definitionVersionId: record.definitionVersionId, context: record.context,
            personId: record.personId!, companyId: record.companyId!, relationshipId: record.relationshipId!, title: record.title,
            uploadedByAccountId: record.uploadedByAccountId, createdAt: new Date(record.createdAt),
            ...(record.retainUntil ? { retainUntil: new Date(record.retainUntil) } : {}), ...(record.reviewDueAt ? { reviewDueAt: new Date(record.reviewDueAt) } : {}) } });
        } else await tx.recordFile.updateMany({ where: { recordId: record.id, isCurrent: true }, data: { isCurrent: false } });
        await tx.recordFile.create({ data: { ...file, createdAt: new Date(file.createdAt), acceptedAt: new Date(file.acceptedAt!), isCurrent: true } });
        await tx.activityEvent.create({ data: { ...activity, occurredAt: new Date(activity.occurredAt) } });
      }, { isolationLevel: "Serializable", timeout: 10000 });
    },
  };
  const service = new RecordIntakeService(storage, scanner, repository, { next: () => randomUUID() }, { now: () => new Date().toISOString() }, policy);
  return service.createRelationshipRecord({ actor: context.actor,
    relationship: { id: context.relationship.id, personId: context.relationship.personId, companyId: context.relationship.companyId,
      status: context.relationship.status, relationshipType: context.relationship.relationshipType, createdAt: context.relationship.createdAt.toISOString() },
    definition: domainDefinition(context.definition), title: input.title, originalFilename: input.filename, contentType: input.contentType,
    source: input.source, ...(context.existing ? { existingRecord: domainRecord(context.existing) } : {}) });
}
