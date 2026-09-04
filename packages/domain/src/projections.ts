import type {
  ActivityEvent,
  CompanyActorContext,
  LegalAccessGrant,
  PersonCompanyRelationship,
  RecordDefinitionVersion,
  RecordEntry,
} from "./model.js";
import { canCompanyMemberViewRecord, canLegalProfessionalViewRecord, canPersonViewRecord, shouldFlagReview } from "./policy.js";

export interface RecordProjection {
  readonly record: RecordEntry;
  readonly definition: RecordDefinitionVersion;
  readonly reviewDue: boolean;
}

const indexDefinitions = (definitions: readonly RecordDefinitionVersion[]): Map<string, RecordDefinitionVersion> =>
  new Map(definitions.map((definition) => [definition.id, definition]));

export const buildPersonRecordProjection = (
  personId: string,
  records: readonly RecordEntry[],
  definitions: readonly RecordDefinitionVersion[],
  atIso: string,
): readonly RecordProjection[] => {
  const byId = indexDefinitions(definitions);
  return records.flatMap((record) => {
    const definition = byId.get(record.definitionVersionId);
    if (!definition || !canPersonViewRecord(personId, record, definition)) return [];
    return [{ record, definition, reviewDue: shouldFlagReview(record, atIso) }];
  });
};

export const buildCompanyEmployeeRecordProjection = (
  actor: CompanyActorContext,
  relationship: PersonCompanyRelationship,
  records: readonly RecordEntry[],
  definitions: readonly RecordDefinitionVersion[],
  atIso: string,
): readonly RecordProjection[] => {
  const byId = indexDefinitions(definitions);
  return records.flatMap((record) => {
    if (record.relationshipId !== relationship.id) return [];
    const definition = byId.get(record.definitionVersionId);
    if (!definition || !canCompanyMemberViewRecord(actor, record, definition)) return [];
    return [{ record, definition, reviewDue: shouldFlagReview(record, atIso) }];
  });
};

export const buildLegalRecordProjection = (
  grant: LegalAccessGrant,
  relationship: PersonCompanyRelationship,
  records: readonly RecordEntry[],
  definitions: readonly RecordDefinitionVersion[],
  atIso: string,
): readonly RecordProjection[] => {
  const byId = indexDefinitions(definitions);
  return records.flatMap((record) => {
    const definition = byId.get(record.definitionVersionId);
    if (!definition || !canLegalProfessionalViewRecord(grant, relationship, record, definition, atIso)) return [];
    return [{ record, definition, reviewDue: shouldFlagReview(record, atIso) }];
  });
};

export const recentActivityForRelationship = (
  relationshipId: string,
  activities: readonly ActivityEvent[],
  limit = 10,
): readonly ActivityEvent[] =>
  activities
    .filter((event) => event.relationshipId === relationshipId)
    .toSorted((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
