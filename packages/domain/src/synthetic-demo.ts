import type {
  Account,
  ActivityEvent,
  Company,
  CompanyActorContext,
  CompanyMember,
  CompanyRoleGrant,
  LegalAccessGrant,
  Person,
  PersonCompanyRelationship,
  RecordDefinitionVersion,
  RecordEntry,
  RecordFile,
} from "./model";
import { deriveRecordDates } from "./policy";

const payslipCreatedAt = "2026-09-01T08:00:00.000Z";
const proofCreatedAt = "2025-08-15T08:00:00.000Z";

export const syntheticAccounts: readonly Account[] = [
  { id: "acct-owner", primaryEmail: "owner@example.test", emailVerified: true, status: "ACTIVE", createdAt: "2026-08-01T08:00:00.000Z" },
  { id: "acct-payroll", primaryEmail: "payroll@example.test", emailVerified: true, status: "ACTIVE", createdAt: "2026-08-01T08:05:00.000Z" },
  { id: "acct-employee", primaryEmail: "employee@example.test", emailVerified: true, status: "ACTIVE", createdAt: "2026-08-01T08:10:00.000Z" },
  { id: "acct-lawyer", primaryEmail: "lawyer@example.test", emailVerified: true, status: "ACTIVE", createdAt: "2026-08-01T08:15:00.000Z" },
];

export const syntheticPerson: Person = {
  id: "person-alex",
  accountId: "acct-employee",
  displayName: "Alex Example",
  createdAt: "2026-08-01T08:10:00.000Z",
};

export const syntheticCompany: Company = {
  id: "company-acme",
  name: "Acme Example (Synthetic)",
  status: "ACTIVE",
  createdAt: "2026-08-01T08:00:00.000Z",
};

export const syntheticMembers: readonly CompanyMember[] = [
  { id: "member-owner", companyId: syntheticCompany.id, accountId: "acct-owner", status: "ACTIVE", createdAt: "2026-08-01T08:00:00.000Z" },
  { id: "member-payroll", companyId: syntheticCompany.id, accountId: "acct-payroll", status: "ACTIVE", createdAt: "2026-08-01T08:05:00.000Z" },
];

export const syntheticRoleGrants: readonly CompanyRoleGrant[] = [
  { id: "grant-owner", companyMemberId: "member-owner", roleCode: "OWNER", grantedAt: "2026-08-01T08:00:00.000Z" },
  { id: "grant-owner-hr", companyMemberId: "member-owner", roleCode: "HR", grantedAt: "2026-08-01T08:01:00.000Z" },
  { id: "grant-payroll", companyMemberId: "member-payroll", roleCode: "PAYROLL", grantedAt: "2026-08-01T08:05:00.000Z" },
];

export const syntheticRelationship: PersonCompanyRelationship = {
  id: "relationship-alex-acme",
  personId: syntheticPerson.id,
  companyId: syntheticCompany.id,
  relationshipType: "EMPLOYEE",
  status: "ACTIVE",
  externalReference: "EMP-DEMO-001",
  startedAt: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-08-01T08:20:00.000Z",
};

export const syntheticDefinitions: readonly RecordDefinitionVersion[] = [
  {
    id: "defv-payslip-1",
    definitionId: "def-payslip",
    version: 1,
    name: "Payslip (synthetic demo policy)",
    category: "Payroll",
    context: "RELATIONSHIP",
    direction: "COMPANY_TO_PERSON",
    classification: "HIGHLY_SENSITIVE",
    allowedCompanyRoles: ["PAYROLL", "HR"],
    personVisible: true,
    retentionMonths: 84,
    notificationPolicy: "NEW_RECORD",
    active: true,
    createdAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "defv-proof-address-1",
    definitionId: "def-proof-address",
    version: 1,
    name: "Proof of Address (synthetic demo policy)",
    category: "Verification",
    context: "RELATIONSHIP",
    direction: "PERSON_TO_COMPANY",
    classification: "SENSITIVE",
    allowedCompanyRoles: ["HR", "CLERK"],
    personVisible: true,
    retentionMonths: 36,
    reviewMonths: 12,
    notificationPolicy: "NEW_RECORD_AND_REVIEW_DUE",
    active: true,
    createdAt: "2026-08-01T09:05:00.000Z",
  },
];

const payslipDates = deriveRecordDates(syntheticDefinitions[0]!, payslipCreatedAt);
const proofDates = deriveRecordDates(syntheticDefinitions[1]!, proofCreatedAt);

export const syntheticRecords: readonly RecordEntry[] = [
  {
    id: "record-payslip-2026-08",
    definitionVersionId: "defv-payslip-1",
    context: "RELATIONSHIP",
    personId: syntheticPerson.id,
    companyId: syntheticCompany.id,
    relationshipId: syntheticRelationship.id,
    title: "August 2026 payslip",
    periodLabel: "2026-08",
    uploadedByAccountId: "acct-payroll",
    createdAt: payslipCreatedAt,
    ...payslipDates,
    status: "ACTIVE",
    currentFileId: "file-payslip-2026-08",
  },
  {
    id: "record-proof-address",
    definitionVersionId: "defv-proof-address-1",
    context: "RELATIONSHIP",
    personId: syntheticPerson.id,
    companyId: syntheticCompany.id,
    relationshipId: syntheticRelationship.id,
    title: "Proof of address",
    uploadedByAccountId: "acct-employee",
    createdAt: proofCreatedAt,
    ...proofDates,
    status: "ACTIVE",
    currentFileId: "file-proof-address",
  },
];

export const syntheticFiles: readonly RecordFile[] = [
  {
    id: "file-payslip-2026-08",
    recordId: "record-payslip-2026-08",
    storageKey: "records/record-payslip-2026-08/files/file-payslip-2026-08",
    originalFilename: "synthetic-payslip.pdf",
    contentType: "application/pdf",
    sizeBytes: 48123,
    checksumSha256: "0".repeat(64),
    scanStatus: "ACCEPTED",
    createdAt: payslipCreatedAt,
    acceptedAt: payslipCreatedAt,
  },
  {
    id: "file-proof-address",
    recordId: "record-proof-address",
    storageKey: "records/record-proof-address/files/file-proof-address",
    originalFilename: "synthetic-proof-address.pdf",
    contentType: "application/pdf",
    sizeBytes: 23911,
    checksumSha256: "1".repeat(64),
    scanStatus: "ACCEPTED",
    createdAt: proofCreatedAt,
    acceptedAt: proofCreatedAt,
  },
];

export const syntheticActivities: readonly ActivityEvent[] = [
  {
    id: "activity-payslip",
    type: "RECORD_CREATED",
    actorAccountId: "acct-payroll",
    companyId: syntheticCompany.id,
    personId: syntheticPerson.id,
    relationshipId: syntheticRelationship.id,
    recordId: "record-payslip-2026-08",
    occurredAt: payslipCreatedAt,
    summary: "A new employment record was added.",
  },
  {
    id: "activity-proof",
    type: "RECORD_REVIEW_DUE",
    companyId: syntheticCompany.id,
    personId: syntheticPerson.id,
    relationshipId: syntheticRelationship.id,
    recordId: "record-proof-address",
    occurredAt: "2026-08-15T08:00:00.000Z",
    summary: "A verification record is due for review.",
  },
];

export const syntheticLegalGrant: LegalAccessGrant = {
  id: "legal-grant-demo",
  grantedToAccountId: "acct-lawyer",
  relationshipId: syntheticRelationship.id,
  grantedByAccountId: "acct-owner",
  represents: "COMPANY",
  allowedDefinitionIds: ["def-payslip"],
  allowedCategories: [],
  canView: true,
  canDownload: false,
  startsAt: "2026-09-01T00:00:00.000Z",
  expiresAt: "2026-10-01T00:00:00.000Z",
  status: "ACTIVE",
};

export const syntheticOwnerActor: CompanyActorContext = {
  accountId: "acct-owner",
  companyId: syntheticCompany.id,
  membershipStatus: "ACTIVE",
  roleCodes: ["OWNER", "HR"],
};

export const syntheticPayrollActor: CompanyActorContext = {
  accountId: "acct-payroll",
  companyId: syntheticCompany.id,
  membershipStatus: "ACTIVE",
  roleCodes: ["PAYROLL"],
};
