-- CreateTable
CREATE TABLE "CompanyTeamInvitation" (
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
    "companyMemberId" TEXT,

    CONSTRAINT "CompanyTeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyTeamInvitationRole" (
    "invitationId" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,

    CONSTRAINT "CompanyTeamInvitationRole_pkey" PRIMARY KEY ("invitationId","functionalRoleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTeamInvitation_tokenHash_key" ON "CompanyTeamInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "CompanyTeamInvitation_companyId_invitedEmail_idx" ON "CompanyTeamInvitation"("companyId", "invitedEmail");

-- CreateIndex
CREATE INDEX "CompanyTeamInvitation_invitedEmail_expiresAt_idx" ON "CompanyTeamInvitation"("invitedEmail", "expiresAt");

-- CreateIndex
CREATE INDEX "CompanyTeamInvitation_open_idx" ON "CompanyTeamInvitation"("companyId", "acceptedAt", "declinedAt", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "CompanyTeamInvitationRole_functionalRoleId_idx" ON "CompanyTeamInvitationRole"("functionalRoleId");

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitation" ADD CONSTRAINT "CompanyTeamInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitation" ADD CONSTRAINT "CompanyTeamInvitation_invitedAccountId_fkey" FOREIGN KEY ("invitedAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitation" ADD CONSTRAINT "CompanyTeamInvitation_invitedByAccountId_fkey" FOREIGN KEY ("invitedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitation" ADD CONSTRAINT "CompanyTeamInvitation_companyMemberId_fkey" FOREIGN KEY ("companyMemberId") REFERENCES "CompanyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitationRole" ADD CONSTRAINT "CompanyTeamInvitationRole_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "CompanyTeamInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitationRole" ADD CONSTRAINT "CompanyTeamInvitationRole_functionalRoleId_fkey" FOREIGN KEY ("functionalRoleId") REFERENCES "FunctionalRoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additional invariant checks; Prisma does not model PostgreSQL CHECK constraints.
ALTER TABLE "CompanyTeamInvitation"
  ADD CONSTRAINT "CompanyTeamInvitation_normalized_email_check" CHECK ("invitedEmail" = lower(btrim("invitedEmail"))),
  ADD CONSTRAINT "CompanyTeamInvitation_hash_check" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "CompanyTeamInvitation_expiry_check" CHECK ("expiresAt" > "createdAt"),
  ADD CONSTRAINT "CompanyTeamInvitation_resolution_check" CHECK (num_nonnulls("acceptedAt", "declinedAt", "revokedAt") <= 1),
  ADD CONSTRAINT "CompanyTeamInvitation_member_check" CHECK (("acceptedAt" IS NULL) = ("companyMemberId" IS NULL));
-- One unexpired open company/email invite is enforced by service advisory locks
-- and Serializable predicate reads/retries. Expired rows remain unchanged.
