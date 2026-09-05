-- CreateTable
CREATE TABLE "AuthSession" (
    "sessionToken" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "mfaSatisfied" BOOLEAN NOT NULL DEFAULT false,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AuthSession_accountId_idx" ON "AuthSession"("accountId");

-- CreateIndex
CREATE INDEX "AuthSession_expires_idx" ON "AuthSession"("expires");

-- CreateIndex
CREATE INDEX "AuthRateLimit_expires_idx" ON "AuthRateLimit"("expires");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "AccountIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

