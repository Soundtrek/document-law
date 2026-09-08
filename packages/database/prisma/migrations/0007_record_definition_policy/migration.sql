-- One definition engine; NULL companyId is SYSTEM scope. Existing keys remain intact.
CREATE TYPE "RetentionMode" AS ENUM ('NONE', 'FIXED_FROM_CREATED', 'FIXED_FROM_RELATIONSHIP_END');
ALTER TABLE "RecordDefinition" ADD COLUMN "code" TEXT NOT NULL DEFAULT '', ADD COLUMN "companyId" TEXT;
UPDATE "RecordDefinition" SET "code" = "key";
CREATE UNIQUE INDEX "RecordDefinition_companyId_code_key" ON "RecordDefinition"("companyId", "code");
ALTER TABLE "RecordDefinition" ADD CONSTRAINT "RecordDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecordDefinitionVersion" ADD COLUMN "description" TEXT NOT NULL DEFAULT '', ADD COLUMN "retentionMode" "RetentionMode" NOT NULL DEFAULT 'FIXED_FROM_CREATED';
-- Legacy month policies continue to mean from creation. No historic version is repinned.
