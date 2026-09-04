import type {
  ActivityEvent,
  CompanyActorContext,
  PersonCompanyRelationship,
  RecordDefinitionVersion,
  RecordEntry,
  RecordFile,
} from "@juanity/domain";
import { canCompanyMemberViewRecord, deriveRecordDates, validateRecordContext } from "@juanity/domain";
import { createRecordObjectKey, type StorageProvider } from "@juanity/storage";

export interface Clock {
  now(): string;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface UploadScanner {
  scan(input: { readonly contentType: string; readonly bytes: Uint8Array }): Promise<"CLEAN" | "REJECTED">;
}

export interface RecordRepository {
  createRecord(input: { readonly record: RecordEntry; readonly file: RecordFile }): Promise<void>;
  appendActivity(event: ActivityEvent): Promise<void>;
}

export interface CreateRelationshipRecordInput {
  readonly actor: CompanyActorContext;
  readonly relationship: PersonCompanyRelationship;
  readonly definition: RecordDefinitionVersion;
  readonly title: string;
  readonly periodLabel?: string;
  readonly originalFilename: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

export interface CreateRelationshipRecordResult {
  readonly record: RecordEntry;
  readonly file: RecordFile;
}

const canUseDefinition = (actor: CompanyActorContext, definition: RecordDefinitionVersion): boolean =>
  actor.membershipStatus === "ACTIVE" && definition.allowedCompanyRoles.some((role) => actor.roleCodes.includes(role));

export class RecordIntakeService {
  constructor(
    private readonly storage: StorageProvider,
    private readonly scanner: UploadScanner,
    private readonly repository: RecordRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async createRelationshipRecord(input: CreateRelationshipRecordInput): Promise<CreateRelationshipRecordResult> {
    if (input.definition.context !== "RELATIONSHIP") throw new Error("Record definition is not valid for a relationship record");
    if (input.relationship.companyId !== input.actor.companyId) throw new Error("Company context mismatch");
    if (input.relationship.status !== "ACTIVE") throw new Error("Relationship must be active to add a new record");
    if (!canUseDefinition(input.actor, input.definition)) throw new Error("Functional role is not authorised for this record definition");
    if (!input.title.trim()) throw new Error("Record title is required");
    if (input.bytes.byteLength === 0) throw new Error("Empty files are not accepted");

    const createdAt = this.clock.now();
    const recordId = this.ids.next("record");
    const fileId = this.ids.next("file");
    const storageKey = createRecordObjectKey(recordId, fileId);
    const dates = deriveRecordDates(input.definition, createdAt);

    const quarantined = await this.storage.putQuarantined({
      key: storageKey,
      contentType: input.contentType,
      bytes: input.bytes,
    });

    const scan = await this.scanner.scan({ contentType: input.contentType, bytes: input.bytes });
    if (scan !== "CLEAN") {
      await this.storage.reject(storageKey);
      await this.repository.appendActivity({
        id: this.ids.next("activity"),
        type: "RECORD_FILE_REJECTED",
        actorAccountId: input.actor.accountId,
        companyId: input.relationship.companyId,
        personId: input.relationship.personId,
        relationshipId: input.relationship.id,
        occurredAt: createdAt,
        summary: "A record file was rejected during upload safety checks.",
      });
      throw new Error("File failed upload safety checks");
    }

    const accepted = await this.storage.accept(storageKey);
    const record: RecordEntry = {
      id: recordId,
      definitionVersionId: input.definition.id,
      context: "RELATIONSHIP",
      personId: input.relationship.personId,
      companyId: input.relationship.companyId,
      relationshipId: input.relationship.id,
      title: input.title.trim(),
      ...(input.periodLabel ? { periodLabel: input.periodLabel } : {}),
      uploadedByAccountId: input.actor.accountId,
      createdAt,
      ...dates,
      status: "ACTIVE",
      currentFileId: fileId,
    };

    if (!validateRecordContext(record)) throw new Error("Constructed record context is invalid");
    if (!canCompanyMemberViewRecord(input.actor, record, input.definition)) throw new Error("Created record would not be visible to the creating role");

    const file: RecordFile = {
      id: fileId,
      recordId,
      storageKey,
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      sizeBytes: accepted.sizeBytes,
      checksumSha256: accepted.checksumSha256,
      scanStatus: "ACCEPTED",
      createdAt,
      acceptedAt: createdAt,
    };

    try {
      await this.repository.createRecord({ record, file });
    } catch (error) {
      await this.repository.appendActivity({
        id: this.ids.next("activity"),
        type: "RECORD_METADATA_WRITE_FAILED",
        actorAccountId: input.actor.accountId,
        companyId: input.relationship.companyId,
        personId: input.relationship.personId,
        relationshipId: input.relationship.id,
        occurredAt: createdAt,
        summary: "An accepted object requires storage/database reconciliation.",
      });
      throw error;
    }

    await this.repository.appendActivity({
      id: this.ids.next("activity"),
      type: "RECORD_CREATED",
      actorAccountId: input.actor.accountId,
      companyId: input.relationship.companyId,
      personId: input.relationship.personId,
      relationshipId: input.relationship.id,
      recordId,
      occurredAt: createdAt,
      summary: "A new relationship record was added.",
    });

    return { record, file };
  }
}

export class FixedClock implements Clock {
  constructor(private readonly value: string) {}
  now(): string { return this.value; }
}

export class SequenceIdGenerator implements IdGenerator {
  private counter = 0;
  next(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter}`;
  }
}

export class AllowAllSyntheticScanner implements UploadScanner {
  async scan(): Promise<"CLEAN"> { return "CLEAN"; }
}

export class InMemoryRecordRepository implements RecordRepository {
  readonly records: Array<{ readonly record: RecordEntry; readonly file: RecordFile }> = [];
  readonly activities: ActivityEvent[] = [];

  async createRecord(input: { readonly record: RecordEntry; readonly file: RecordFile }): Promise<void> {
    this.records.push(input);
  }

  async appendActivity(event: ActivityEvent): Promise<void> {
    this.activities.push(event);
  }
}
