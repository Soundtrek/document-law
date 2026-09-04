export type Id = string;

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type MembershipStatus = "INVITED" | "ACTIVE" | "DISABLED" | "REMOVED";
export type RelationshipStatus = "PENDING" | "ACTIVE" | "FORMER" | "ENDED";
export type RecordContext = "PERSON" | "COMPANY" | "RELATIONSHIP";
export type RecordDirection = "PERSON_TO_COMPANY" | "COMPANY_TO_PERSON" | "INTERNAL_COMPANY" | "BIDIRECTIONAL";
export type DataClassification = "PUBLIC" | "INTERNAL" | "PERSONAL" | "SENSITIVE" | "HIGHLY_SENSITIVE";
export type RecordStatus = "ACTIVE" | "SUPERSEDED" | "ARCHIVED" | "RETAINED" | "DELETED";
export type ScanStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type LegalGrantStatus = "PENDING" | "ACTIVE" | "REVOKED" | "EXPIRED";

export interface Account {
  readonly id: Id;
  readonly primaryEmail: string;
  readonly emailVerified: boolean;
  readonly status: AccountStatus;
  readonly createdAt: string;
}

export interface AccountIdentity {
  readonly id: Id;
  readonly accountId: Id;
  readonly provider: string;
  readonly providerSubject: string;
  readonly emailAtProvider?: string;
  readonly linkedAt: string;
}

export interface Person {
  readonly id: Id;
  readonly accountId: Id;
  readonly displayName: string;
  readonly createdAt: string;
}

export interface Company {
  readonly id: Id;
  readonly name: string;
  readonly status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  readonly createdAt: string;
}

export interface CompanyMember {
  readonly id: Id;
  readonly companyId: Id;
  readonly accountId: Id;
  readonly status: MembershipStatus;
  readonly createdAt: string;
}

export interface FunctionalRoleDefinition {
  readonly id: Id;
  readonly code: string;
  readonly label: string;
  readonly capabilities: readonly string[];
  readonly active: boolean;
}

export interface CompanyRoleGrant {
  readonly id: Id;
  readonly companyMemberId: Id;
  readonly roleCode: string;
  readonly grantedAt: string;
  readonly revokedAt?: string;
}

export interface PersonCompanyRelationship {
  readonly id: Id;
  readonly personId: Id;
  readonly companyId: Id;
  readonly relationshipType: string;
  readonly status: RelationshipStatus;
  readonly externalReference?: string;
  readonly startedAt?: string;
  readonly endedAt?: string;
  readonly createdAt: string;
}

export interface RecordDefinitionVersion {
  readonly id: Id;
  readonly definitionId: Id;
  readonly version: number;
  readonly name: string;
  readonly category: string;
  readonly context: RecordContext;
  readonly direction: RecordDirection;
  readonly classification: DataClassification;
  readonly allowedCompanyRoles: readonly string[];
  readonly personVisible: boolean;
  readonly retentionMonths?: number;
  readonly reviewMonths?: number;
  readonly notificationPolicy: "NONE" | "NEW_RECORD" | "REVIEW_DUE" | "NEW_RECORD_AND_REVIEW_DUE";
  readonly active: boolean;
  readonly createdAt: string;
}

export interface RecordFile {
  readonly id: Id;
  readonly recordId: Id;
  readonly storageKey: string;
  readonly originalFilename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly scanStatus: ScanStatus;
  readonly createdAt: string;
  readonly acceptedAt?: string;
}

export interface RecordEntry {
  readonly id: Id;
  readonly definitionVersionId: Id;
  readonly context: RecordContext;
  readonly personId?: Id;
  readonly companyId?: Id;
  readonly relationshipId?: Id;
  readonly title: string;
  readonly periodLabel?: string;
  readonly uploadedByAccountId: Id;
  readonly createdAt: string;
  readonly retainUntil?: string;
  readonly reviewDueAt?: string;
  readonly status: RecordStatus;
  readonly replacedByRecordId?: Id;
  readonly currentFileId?: Id;
}

export interface LegalAccessGrant {
  readonly id: Id;
  readonly grantedToAccountId: Id;
  readonly relationshipId: Id;
  readonly grantedByAccountId: Id;
  readonly represents: "COMPANY" | "PERSON";
  readonly allowedDefinitionIds: readonly Id[];
  readonly allowedCategories: readonly string[];
  readonly canView: boolean;
  readonly canDownload: boolean;
  readonly startsAt: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
  readonly status: LegalGrantStatus;
}

export interface ActivityEvent {
  readonly id: Id;
  readonly type: string;
  readonly actorAccountId?: Id;
  readonly companyId?: Id;
  readonly personId?: Id;
  readonly relationshipId?: Id;
  readonly recordId?: Id;
  readonly occurredAt: string;
  readonly summary: string;
}

export interface CompanyActorContext {
  readonly accountId: Id;
  readonly companyId: Id;
  readonly membershipStatus: MembershipStatus;
  readonly roleCodes: readonly string[];
}
