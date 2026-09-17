-- CreateEnum
CREATE TYPE "StorageConfigurationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateTable
CREATE TABLE "StorageConfiguration" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'S3',
    "endpoint" TEXT,
    "region" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "forcePathStyle" BOOLEAN NOT NULL,
    "requestTimeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "encryptedCredentials" TEXT NOT NULL,
    "status" "StorageConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
    "lastTestFingerprint" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByAccountId" TEXT NOT NULL,
    "activatedByAccountId" TEXT,

    CONSTRAINT "StorageConfiguration_pkey" PRIMARY KEY ("id")
);

-- Only one database-managed storage configuration can be active.
CREATE UNIQUE INDEX "StorageConfiguration_single_active_idx"
ON "StorageConfiguration" ((status)) WHERE status = 'ACTIVE';

CREATE INDEX "StorageConfiguration_status_updatedAt_idx"
ON "StorageConfiguration"("status", "updatedAt");

ALTER TABLE "StorageConfiguration"
ADD CONSTRAINT "StorageConfiguration_createdByAccountId_fkey"
FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StorageConfiguration"
ADD CONSTRAINT "StorageConfiguration_activatedByAccountId_fkey"
FOREIGN KEY ("activatedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
