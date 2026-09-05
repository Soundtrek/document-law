-- CreateEnum
CREATE TYPE "InvitationKind" AS ENUM ('EMPLOYMENT', 'MEMBERSHIP');

-- CreateTable
CREATE TABLE "CompanyInvitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" "InvitationKind" NOT NULL,
    "intendedAccountId" TEXT,
    "invitedByAccountId" TEXT NOT NULL,
    "acceptedByAccountId" TEXT,
    "relationshipId" TEXT,
    "roleIds" JSONB NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInvitation_tokenHash_key" ON "CompanyInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "CompanyInvitation_email_expiresAt_idx" ON "CompanyInvitation"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInvitation_companyId_email_kind_key" ON "CompanyInvitation"("companyId", "email", "kind");

-- AddForeignKey
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_invitedByAccountId_fkey" FOREIGN KEY ("invitedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_intendedAccountId_fkey" FOREIGN KEY ("intendedAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_acceptedByAccountId_fkey" FOREIGN KEY ("acceptedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "PersonCompanyRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

