import type { ActivityEvent, CompanyActorContext, PersonCompanyRelationship, RecordDefinitionVersion, RecordEntry, RecordFile } from "@samma/domain";
import { canCompanyMemberViewRecord, deriveRecordDates, validateRecordContext } from "@samma/domain";
import { createRecordObjectKey, contentInfo, type StorageProvider, type UploadContent } from "@samma/storage";
export interface Clock { now(): string }
export interface IdGenerator { next(prefix: string): string }
export type ScanResult = "CLEAN" | "REJECTED" | "NOT_SCANNED_DEV";
export interface UploadScanner { scan(input: { readonly contentType: string } & UploadContent): Promise<ScanResult> }
export class RecordMetadataWriteError extends Error {
  constructor(readonly rolledBack: boolean) { super(rolledBack ? "Metadata transaction rolled back" : "Metadata transaction outcome unknown"); }
}
export interface RecordRepository {
  // Metadata/current-version change and success activity must commit atomically.
  createRecord(input: { readonly record: RecordEntry; readonly file: RecordFile; readonly activity: ActivityEvent }): Promise<void>;
  isFileCommitted(fileId: string): Promise<boolean>;
  appendActivity(event: ActivityEvent): Promise<void>;
}
export type CreateRelationshipRecordInput = {
  readonly actor: CompanyActorContext; readonly relationship: PersonCompanyRelationship;
  readonly definition: RecordDefinitionVersion; readonly title: string; readonly periodLabel?: string;
  readonly originalFilename: string; readonly contentType: string;
  readonly existingRecord?: RecordEntry;
} & UploadContent;
export interface CreateRelationshipRecordResult { readonly record: RecordEntry; readonly file: RecordFile }
export interface ScanPolicy { readonly environment: string; readonly allowUnscannedDev: boolean }
export const scanAccepted = (scan: ScanResult, policy: ScanPolicy): boolean => scan === "CLEAN" ||
  (scan === "NOT_SCANNED_DEV" && policy.environment === "development" && policy.allowUnscannedDev);
export class RecordIntakeService {
  constructor(private readonly storage: StorageProvider, private readonly scanner: UploadScanner,
    private readonly repository: RecordRepository, private readonly ids: IdGenerator, private readonly clock: Clock,
    private readonly policy: ScanPolicy = { environment: "production", allowUnscannedDev: false }) {}
  async createRelationshipRecord(input: CreateRelationshipRecordInput): Promise<CreateRelationshipRecordResult> {
    if (!input.definition.active || input.definition.context !== "RELATIONSHIP") throw new Error("Record definition is not valid for a relationship record");
    if (input.relationship.companyId !== input.actor.companyId) throw new Error("Company context mismatch");
    if (input.relationship.status !== "ACTIVE") throw new Error("Relationship must be active to add a new record");
    if (input.actor.membershipStatus !== "ACTIVE" || !input.definition.allowedCompanyRoles.some(role => input.actor.roleCodes.includes(role))) throw new Error("Functional role is not authorised for this record definition");
    if (!input.title.trim()) throw new Error("Record title is required");
    const info = contentInfo(input);
    if (info.sizeBytes === 0) throw new Error("Empty files are not accepted");
    if (info.sizeBytes > 25 * 1024 * 1024) throw new Error("File exceeds safety limit");
    if (input.existingRecord && (input.existingRecord.relationshipId !== input.relationship.id || input.existingRecord.companyId !== input.actor.companyId || input.existingRecord.personId !== input.relationship.personId || input.existingRecord.definitionVersionId !== input.definition.id || input.existingRecord.status !== "ACTIVE")) throw new Error("Invalid replacement context");
    const createdAt = this.clock.now(), recordId = input.existingRecord?.id ?? this.ids.next("record"), fileId = this.ids.next("file");
    const storageKey = createRecordObjectKey(recordId, fileId);
    const record: RecordEntry = input.existingRecord ? { ...input.existingRecord, currentFileId: fileId } : {
      id: recordId, definitionVersionId: input.definition.id, context: "RELATIONSHIP", personId: input.relationship.personId,
      companyId: input.relationship.companyId, relationshipId: input.relationship.id, title: input.title.trim(),
      ...(input.periodLabel ? { periodLabel: input.periodLabel } : {}), uploadedByAccountId: input.actor.accountId,
      createdAt, ...deriveRecordDates(input.definition, createdAt), status: "ACTIVE", currentFileId: fileId,
    };
    if (!validateRecordContext(record) || !canCompanyMemberViewRecord(input.actor, record, input.definition)) throw new Error("Invalid record context");
    const activity = (type: string, summary: string): ActivityEvent => ({ id: this.ids.next("activity"), type,
      actorAccountId: input.actor.accountId, companyId: input.actor.companyId, personId: input.relationship.personId,
      relationshipId: input.relationship.id, recordId, occurredAt: createdAt, summary });
    const content = "bytes" in input ? { bytes: input.bytes } : { source: input.source };
    try {
      await this.storage.putQuarantined({ key: storageKey, contentType: input.contentType, ...content });
    } catch (error) {
      await this.repository.appendActivity(activity("RECORD_STORAGE_WRITE_FAILED", "Storage intake failed; inspect unlinked quarantine objects for this record before cleanup."));
      throw error;
    }
    let uncertainCommit = false;
    try {
      const scan = await this.scanner.scan({ contentType: input.contentType, ...content });
      if (!scanAccepted(scan, this.policy)) {
        await this.storage.reject(storageKey);
        await this.repository.appendActivity(activity("RECORD_FILE_REJECTED", "Upload rejected by scan policy; no clean result claimed."));
        throw new Error("File failed upload safety checks");
      }
      const accepted = await this.storage.accept(storageKey);
      const file: RecordFile = { id: fileId, recordId, storageKey, originalFilename: input.originalFilename,
        contentType: input.contentType, sizeBytes: accepted.sizeBytes, checksumSha256: accepted.checksumSha256,
        scanStatus: scan === "NOT_SCANNED_DEV" ? "NOT_SCANNED_DEV" : "ACCEPTED", createdAt, acceptedAt: createdAt };
      try {
        await this.repository.createRecord({ record, file, activity: activity(input.existingRecord ? "RECORD_FILE_REPLACED" : "RECORD_CREATED",
          scan === "NOT_SCANNED_DEV" ? "File accepted for DEV; NOT_SCANNED_DEV. No malware scan performed." : "File accepted after clean scanner result.") });
      } catch (error) {
        // A negative read can race an in-flight COMMIT. Only a known rollback
        // permits deletion; otherwise preserve the object even if absent now.
        uncertainCommit = !(error instanceof RecordMetadataWriteError && error.rolledBack);
        if (await this.repository.isFileCommitted(fileId)) return { record, file };
        throw error;
      }
      return { record, file };
    } catch (error) {
      if (uncertainCommit) throw new Error("Metadata outcome unknown; preserve object for reconciliation");
      let committed: boolean;
      try { committed = await this.repository.isFileCommitted(fileId); }
      catch { throw new Error("Metadata outcome unknown; preserve object for reconciliation"); }
      if (!committed) {
        try { await this.storage.delete(storageKey); }
        catch {
          await this.repository.appendActivity(activity("RECORD_OBJECT_CLEANUP_REQUIRED", "Unlinked object cleanup requires operator reconciliation."));
          throw new Error("Upload failed; storage reconciliation required");
        }
      }
      throw error;
    }
  }
}
export class FixedClock implements Clock { constructor(private readonly value: string) {} now() { return this.value; } }
export class SequenceIdGenerator implements IdGenerator { private counter = 0; next(prefix: string) { return `${prefix}_${++this.counter}`; } }
// Unit-test fixture only. Runtime wiring must explicitly choose a scanner policy.
export class AllowAllSyntheticScanner implements UploadScanner { async scan(): Promise<"CLEAN"> { return "CLEAN"; } }
export class NotScannedDevScanner implements UploadScanner { async scan(): Promise<"NOT_SCANNED_DEV"> { return "NOT_SCANNED_DEV"; } }
export class InMemoryRecordRepository implements RecordRepository {
  readonly records: Array<{ readonly record: RecordEntry; readonly file: RecordFile }> = [];
  readonly activities: ActivityEvent[] = [];
  async createRecord(input: { readonly record: RecordEntry; readonly file: RecordFile; readonly activity: ActivityEvent }) { this.records.push(input); this.activities.push(input.activity); }
  async isFileCommitted(fileId: string) { return this.records.some(row => row.file.id === fileId); }
  async appendActivity(event: ActivityEvent) { this.activities.push(event); }
}
