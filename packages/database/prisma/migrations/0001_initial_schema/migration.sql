-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED', 'REMOVED');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'FORMER', 'ENDED');

-- CreateEnum
CREATE TYPE "RecordContext" AS ENUM ('PERSON', 'COMPANY', 'RELATIONSHIP');

-- CreateEnum
CREATE TYPE "RecordDirection" AS ENUM ('PERSON_TO_COMPANY', 'COMPANY_TO_PERSON', 'INTERNAL_COMPANY', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'PERSONAL', 'SENSITIVE', 'HIGHLY_SENSITIVE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'RETAINED', 'DELETED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LegalGrantStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RepresentedParty" AS ENUM ('COMPANY', 'PERSON');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "primaryEmail" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountIdentity" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "emailAtProvider" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionalRoleDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capabilities" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunctionalRoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRoleGrant" (
    "id" TEXT NOT NULL,
    "companyMemberId" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CompanyRoleGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonCompanyRelationship" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "externalReference" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonCompanyRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordDefinitionVersion" (
    "id" TEXT NOT NULL,
    "recordDefinitionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "context" "RecordContext" NOT NULL,
    "direction" "RecordDirection" NOT NULL,
    "classification" "DataClassification" NOT NULL,
    "allowedCompanyRoles" JSONB NOT NULL,
    "personVisible" BOOLEAN NOT NULL DEFAULT false,
    "retentionMonths" INTEGER,
    "reviewMonths" INTEGER,
    "notificationPolicy" TEXT NOT NULL DEFAULT 'NONE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordDefinitionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "definitionVersionId" TEXT NOT NULL,
    "context" "RecordContext" NOT NULL,
    "personId" TEXT,
    "companyId" TEXT,
    "relationshipId" TEXT,
    "title" TEXT NOT NULL,
    "periodLabel" TEXT,
    "uploadedByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "retainUntil" TIMESTAMP(3),
    "reviewDueAt" TIMESTAMP(3),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "replacedByRecordId" TEXT,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordFile" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "RecordFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAccessGrant" (
    "id" TEXT NOT NULL,
    "grantedToAccountId" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "grantedByAccountId" TEXT NOT NULL,
    "represents" "RepresentedParty" NOT NULL,
    "allowedDefinitionIds" JSONB NOT NULL,
    "allowedCategories" JSONB NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canDownload" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "status" "LegalGrantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceCapabilityGrant" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GovernanceCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionRequest" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "assignedToAccountId" TEXT,
    "recordId" TEXT,
    "typeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorAccountId" TEXT,
    "companyId" TEXT,
    "personId" TEXT,
    "relationshipId" TEXT,
    "recordId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "interval" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEntitlement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "ProductEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySubscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "provider" TEXT,
    "providerReference" TEXT,
    "currentPeriodEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_primaryEmail_key" ON "Account"("primaryEmail");

-- CreateIndex
CREATE INDEX "AccountIdentity_accountId_idx" ON "AccountIdentity"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountIdentity_provider_providerSubject_key" ON "AccountIdentity"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "Person_accountId_key" ON "Person"("accountId");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "CompanyMember_accountId_status_idx" ON "CompanyMember"("accountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_accountId_key" ON "CompanyMember"("companyId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "FunctionalRoleDefinition_code_key" ON "FunctionalRoleDefinition"("code");

-- CreateIndex
CREATE INDEX "CompanyRoleGrant_companyMemberId_revokedAt_idx" ON "CompanyRoleGrant"("companyMemberId", "revokedAt");

-- CreateIndex
CREATE INDEX "CompanyRoleGrant_functionalRoleId_revokedAt_idx" ON "CompanyRoleGrant"("functionalRoleId", "revokedAt");

-- CreateIndex
CREATE INDEX "PersonCompanyRelationship_personId_status_idx" ON "PersonCompanyRelationship"("personId", "status");

-- CreateIndex
CREATE INDEX "PersonCompanyRelationship_companyId_status_idx" ON "PersonCompanyRelationship"("companyId", "status");

-- CreateIndex
CREATE INDEX "PersonCompanyRelationship_companyId_externalReference_idx" ON "PersonCompanyRelationship"("companyId", "externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "RecordDefinition_key_key" ON "RecordDefinition"("key");

-- CreateIndex
CREATE INDEX "RecordDefinitionVersion_active_context_category_idx" ON "RecordDefinitionVersion"("active", "context", "category");

-- CreateIndex
CREATE UNIQUE INDEX "RecordDefinitionVersion_recordDefinitionId_version_key" ON "RecordDefinitionVersion"("recordDefinitionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Record_replacedByRecordId_key" ON "Record"("replacedByRecordId");

-- CreateIndex
CREATE INDEX "Record_personId_status_idx" ON "Record"("personId", "status");

-- CreateIndex
CREATE INDEX "Record_companyId_status_idx" ON "Record"("companyId", "status");

-- CreateIndex
CREATE INDEX "Record_relationshipId_status_idx" ON "Record"("relationshipId", "status");

-- CreateIndex
CREATE INDEX "Record_reviewDueAt_status_idx" ON "Record"("reviewDueAt", "status");

-- CreateIndex
CREATE INDEX "Record_retainUntil_status_idx" ON "Record"("retainUntil", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RecordFile_storageKey_key" ON "RecordFile"("storageKey");

-- CreateIndex
CREATE INDEX "RecordFile_recordId_isCurrent_idx" ON "RecordFile"("recordId", "isCurrent");

-- CreateIndex
CREATE INDEX "RecordFile_scanStatus_idx" ON "RecordFile"("scanStatus");

-- CreateIndex
CREATE INDEX "LegalAccessGrant_grantedToAccountId_status_expiresAt_idx" ON "LegalAccessGrant"("grantedToAccountId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "LegalAccessGrant_relationshipId_status_idx" ON "LegalAccessGrant"("relationshipId", "status");

-- CreateIndex
CREATE INDEX "GovernanceCapabilityGrant_accountId_revokedAt_idx" ON "GovernanceCapabilityGrant"("accountId", "revokedAt");

-- CreateIndex
CREATE INDEX "GovernanceCapabilityGrant_capability_revokedAt_idx" ON "GovernanceCapabilityGrant"("capability", "revokedAt");

-- CreateIndex
CREATE INDEX "ActionRequest_relationshipId_status_idx" ON "ActionRequest"("relationshipId", "status");

-- CreateIndex
CREATE INDEX "ActionRequest_assignedToAccountId_status_idx" ON "ActionRequest"("assignedToAccountId", "status");

-- CreateIndex
CREATE INDEX "ActivityEvent_companyId_occurredAt_idx" ON "ActivityEvent"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_personId_occurredAt_idx" ON "ActivityEvent"("personId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_relationshipId_occurredAt_idx" ON "ActivityEvent"("relationshipId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_recordId_occurredAt_idx" ON "ActivityEvent"("recordId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_key_key" ON "Product"("key");

-- CreateIndex
CREATE INDEX "ProductPrice_productId_active_idx" ON "ProductPrice"("productId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ProductEntitlement_productId_capability_key" ON "ProductEntitlement"("productId", "capability");

-- CreateIndex
CREATE INDEX "CompanySubscription_companyId_status_idx" ON "CompanySubscription"("companyId", "status");

-- CreateIndex
CREATE INDEX "CompanySubscription_provider_providerReference_idx" ON "CompanySubscription"("provider", "providerReference");

-- AddForeignKey
ALTER TABLE "AccountIdentity" ADD CONSTRAINT "AccountIdentity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRoleGrant" ADD CONSTRAINT "CompanyRoleGrant_companyMemberId_fkey" FOREIGN KEY ("companyMemberId") REFERENCES "CompanyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRoleGrant" ADD CONSTRAINT "CompanyRoleGrant_functionalRoleId_fkey" FOREIGN KEY ("functionalRoleId") REFERENCES "FunctionalRoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonCompanyRelationship" ADD CONSTRAINT "PersonCompanyRelationship_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonCompanyRelationship" ADD CONSTRAINT "PersonCompanyRelationship_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordDefinitionVersion" ADD CONSTRAINT "RecordDefinitionVersion_recordDefinitionId_fkey" FOREIGN KEY ("recordDefinitionId") REFERENCES "RecordDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_definitionVersionId_fkey" FOREIGN KEY ("definitionVersionId") REFERENCES "RecordDefinitionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "PersonCompanyRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_uploadedByAccountId_fkey" FOREIGN KEY ("uploadedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_replacedByRecordId_fkey" FOREIGN KEY ("replacedByRecordId") REFERENCES "Record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordFile" ADD CONSTRAINT "RecordFile_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAccessGrant" ADD CONSTRAINT "LegalAccessGrant_grantedToAccountId_fkey" FOREIGN KEY ("grantedToAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAccessGrant" ADD CONSTRAINT "LegalAccessGrant_grantedByAccountId_fkey" FOREIGN KEY ("grantedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAccessGrant" ADD CONSTRAINT "LegalAccessGrant_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "PersonCompanyRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCapabilityGrant" ADD CONSTRAINT "GovernanceCapabilityGrant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRequest" ADD CONSTRAINT "ActionRequest_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "PersonCompanyRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRequest" ADD CONSTRAINT "ActionRequest_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRequest" ADD CONSTRAINT "ActionRequest_assignedToAccountId_fkey" FOREIGN KEY ("assignedToAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRequest" ADD CONSTRAINT "ActionRequest_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEntitlement" ADD CONSTRAINT "ProductEntitlement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
