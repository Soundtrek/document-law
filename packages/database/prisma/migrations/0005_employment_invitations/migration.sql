-- Generated with Prisma migrate diff; reviewed: one additive table only.
CREATE TABLE "EmploymentInvitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedAccountId" TEXT,
    "invitedByAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "relationshipId" TEXT,
    CONSTRAINT "EmploymentInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmploymentInvitation_tokenHash_key" ON "EmploymentInvitation"("tokenHash");
CREATE INDEX "EmploymentInvitation_companyId_invitedEmail_idx" ON "EmploymentInvitation"("companyId", "invitedEmail");
CREATE INDEX "EmploymentInvitation_invitedEmail_expiresAt_idx" ON "EmploymentInvitation"("invitedEmail", "expiresAt");
CREATE INDEX "EmploymentInvitation_open_idx" ON "EmploymentInvitation"("companyId", "acceptedAt", "declinedAt", "revokedAt", "expiresAt");
ALTER TABLE "EmploymentInvitation" ADD CONSTRAINT "EmploymentInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmploymentInvitation" ADD CONSTRAINT "EmploymentInvitation_invitedAccountId_fkey" FOREIGN KEY ("invitedAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmploymentInvitation" ADD CONSTRAINT "EmploymentInvitation_invitedByAccountId_fkey" FOREIGN KEY ("invitedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmploymentInvitation" ADD CONSTRAINT "EmploymentInvitation_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "PersonCompanyRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additional invariant checks (Prisma does not model PostgreSQL CHECK constraints).
ALTER TABLE "EmploymentInvitation"
  ADD CONSTRAINT "EmploymentInvitation_normalized_email_check" CHECK ("invitedEmail" = lower(btrim("invitedEmail"))),
  ADD CONSTRAINT "EmploymentInvitation_hash_check" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "EmploymentInvitation_expiry_check" CHECK ("expiresAt" > "createdAt"),
  ADD CONSTRAINT "EmploymentInvitation_resolution_check" CHECK (num_nonnulls("acceptedAt", "declinedAt", "revokedAt") <= 1),
  ADD CONSTRAINT "EmploymentInvitation_relationship_check" CHECK (("acceptedAt" IS NULL) = ("relationshipId" IS NULL));
-- Open company/email uniqueness is serialized by the service advisory lock and
-- Serializable retries. Expiry is time-dependent, so a UNIQUE WHERE now() index
-- is not valid; expired rows remain untouched and can be re-invited immediately.
