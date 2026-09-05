import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createPrismaClient } from "@samma/database";
import { createStorageProvider } from "@samma/storage";
const db = createPrismaClient(), file = "/validation/storage-fixture.json";
const action = process.argv[2];
try {
  if (action === "seed") {
    const tag = `storage-test-${randomUUID()}`;
    const link = (JSON.parse(readFileSync("/validation-links.json", "utf8")) as { email: string; verified: boolean }[]).find(row => row.verified)!;
    const actor = await db.account.findUniqueOrThrow({ where: { primaryEmail: link.email }, include: { person: true } });
    const company = await db.company.create({ data: { name: "Synthetic Storage Company" } });
    const role = await db.functionalRoleDefinition.create({ data: { code: tag, label: "Synthetic records role", capabilities: [] } });
    const member = await db.companyMember.create({ data: { accountId: actor.id, companyId: company.id, status: "ACTIVE", roleGrants: { create: { functionalRoleId: role.id } } }, include: { roleGrants: true } });
    const relationship = await db.personCompanyRelationship.create({ data: { companyId: company.id, personId: actor.person!.id, relationshipType: "EMPLOYMENT", status: "ACTIVE" } });
    const definition = await db.recordDefinition.create({ data: { key: tag } });
    const version = await db.recordDefinitionVersion.create({ data: { recordDefinitionId: definition.id, version: 1, name: "Synthetic storage document", category: "TEST", context: "RELATIONSHIP", direction: "BIDIRECTIONAL", classification: "INTERNAL", allowedCompanyRoles: [tag], personVisible: true } });
    const identities = [];
    for (const label of ["outsider", "lawyer"]) {
      const account = await db.account.create({ data: { primaryEmail: `${tag}-${label}@example.test`, emailVerified: true, person: { create: { displayName: `Synthetic ${label}` } }, identities: { create: { provider: process.env.SAMMA_OIDC_ISSUER!, providerSubject: `${tag}-${label}` } } }, include: { identities: true } });
      const token = randomUUID(); await db.authSession.create({ data: { sessionToken: token, accountId: account.id, identityId: account.identities[0]!.id, expires: new Date(Date.now() + 4 * 3600000) } });
      identities.push({ label, accountId: account.id, token });
    }
    const legal = await db.legalAccessGrant.create({ data: { grantedToAccountId: identities[1]!.accountId, grantedByAccountId: actor.id, relationshipId: relationship.id,
      represents: "PERSON", allowedDefinitionIds: [definition.id], allowedCategories: ["TEST"], canView: true, canDownload: false, startsAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 4 * 3600000), status: "ACTIVE" } });
    writeFileSync(file, JSON.stringify({ actorId: actor.id, companyId: company.id, roleId: role.id, memberId: member.id, roleGrantId: member.roleGrants[0]!.id, relationshipId: relationship.id, definitionId: definition.id, versionId: version.id, legalId: legal.id, identities }), { mode: 0o600 });
    console.log("PASS isolated synthetic storage fixture created; tokens not displayed");
  } else {
    const f = JSON.parse(readFileSync(file, "utf8"));
    if (action === "verify") {
      const records = await db.record.findMany({ where: { relationshipId: f.relationshipId }, include: { files: true } });
      const storage = createStorageProvider();
      for (const row of records) for (const item of row.files) {
        const metadata = await storage.metadata(item.storageKey);
        if (!metadata || metadata.checksumSha256 !== item.checksumSha256 || metadata.sizeBytes !== item.sizeBytes || item.scanStatus !== "NOT_SCANNED_DEV" || !/^records\/[0-9a-f-]{36}\/files\/[0-9a-f-]{36}$/.test(item.storageKey)) throw new Error("File verification failed");
      }
      if (!records.length || records.some(row => row.files.filter(item => item.isCurrent).length !== 1)) throw new Error("Current version linkage failed");
      writeFileSync("/validation/storage-records.json", JSON.stringify(records.map(row => ({ id: row.id, files: row.files.map(item => ({ id: item.id, key: item.storageKey, checksum: item.checksumSha256, current: item.isCurrent })) }))), { mode: 0o600 });
      console.log(`PASS DB/S3 checksum, opaque keys, scan state and current-version linkage (${records.length} record(s))`);
    } else if (action === "revoke-role" || action === "restore-role") {
      await db.companyRoleGrant.update({ where: { id: f.roleGrantId }, data: { revokedAt: action === "revoke-role" ? new Date() : null } });
    } else if (action === "legal-download" || action === "legal-deny") {
      await db.legalAccessGrant.update({ where: { id: f.legalId }, data: { canDownload: action === "legal-download" } });
    } else if (action === "cleanup") {
      const rows = await db.recordFile.findMany({ where: { record: { relationshipId: f.relationshipId } } });
      const storage = createStorageProvider(); for (const row of rows) await storage.delete(row.storageKey);
      await db.activityEvent.deleteMany({ where: { OR: [{ companyId: f.companyId }, { actorAccountId: { in: f.identities.map((row: { accountId: string }) => row.accountId) } }] } });
      await db.record.deleteMany({ where: { relationshipId: f.relationshipId } });
      await db.legalAccessGrant.delete({ where: { id: f.legalId } });
      await db.personCompanyRelationship.delete({ where: { id: f.relationshipId } });
      await db.companyMember.delete({ where: { id: f.memberId } });
      await db.company.delete({ where: { id: f.companyId } });
      await db.functionalRoleDefinition.delete({ where: { id: f.roleId } });
      await db.recordDefinitionVersion.delete({ where: { id: f.versionId } });
      await db.recordDefinition.delete({ where: { id: f.definitionId } });
      for (const row of f.identities) { await db.person.deleteMany({ where: { accountId: row.accountId } }); await db.account.delete({ where: { id: row.accountId } }); }
      console.log("PASS synthetic storage fixture and objects cleaned");
    } else throw new Error("Unknown fixture operation");
  }
} finally { await db.$disconnect(); }
