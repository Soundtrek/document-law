import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@samma/database";
import { createStorageProvider, sha256 } from "@samma/storage";
import { NotScannedDevScanner } from "@samma/application";
import { persistRelationshipUpload } from "../../apps/web/lib/record-service";
const db = createPrismaClient(), storage = createStorageProvider(), tag = `storage-outcome-${randomUUID()}`;
const account = await db.account.create({ data: { primaryEmail: `${tag}@example.test`, emailVerified: true, person: { create: { displayName: "Synthetic outcome fixture" } } }, include: { person: true } });
const company = await db.company.create({ data: { name: "Synthetic outcome company" } });
const role = await db.functionalRoleDefinition.create({ data: { code: tag, label: "Synthetic records role", capabilities: [] } });
const member = await db.companyMember.create({ data: { accountId: account.id, companyId: company.id, status: "ACTIVE", roleGrants: { create: { functionalRoleId: role.id } } } });
const relationship = await db.personCompanyRelationship.create({ data: { personId: account.person!.id, companyId: company.id, relationshipType: "EMPLOYMENT", status: "ACTIVE" } });
const definition = await db.recordDefinition.create({ data: { key: tag } });
const version = await db.recordDefinitionVersion.create({ data: { recordDefinitionId: definition.id, version: 1, name: "Synthetic outcome", category: "TEST", context: "RELATIONSHIP", direction: "BIDIRECTIONAL", classification: "INTERNAL", allowedCompanyRoles: [tag], personVisible: true } });
const keys: string[] = [], originalPut = storage.putQuarantined.bind(storage);
storage.putQuarantined = async input => { keys.push(input.key); return originalPut(input); };
const bytes = Buffer.from("%PDF-1.4 Synthetic transaction result\n%%EOF\n");
const source = { sizeBytes: bytes.length, checksumSha256: sha256(bytes), async *open() { yield bytes; } };
try {
  for (const outcome of ["rollback", "unknown", "committed"] as const) {
    const proxy = new Proxy(db, { get(target, property) {
      if (property !== "$transaction") return Reflect.get(target, property);
      return async (callback: (tx: unknown) => Promise<unknown>) => {
        if (outcome === "committed") { await target.$transaction(callback); throw new Error("Synthetic lost COMMIT acknowledgement"); }
        await target.$transaction(async tx => { await callback(tx); throw Object.assign(new Error("Synthetic outcome"), outcome === "rollback" ? { code: "P2034" } : {}); });
      };
    } });
    const operation = persistRelationshipUpload(proxy, storage, new NotScannedDevScanner(), { environment: "development", allowUnscannedDev: true }, {
      accountId: account.id, relationshipId: relationship.id, definitionId: version.id, title: `Synthetic ${outcome}`, filename: "synthetic.pdf", contentType: "application/pdf", source,
    });
    if (outcome === "committed") {
      const result = await operation; assert.ok(await db.recordFile.findUnique({ where: { id: result.file.id } }));
      assert.equal((await storage.metadata(result.file.storageKey))?.state, "ACCEPTED");
    } else {
      await assert.rejects(() => operation, outcome === "rollback" ? /rolled back/ : /preserve object/);
      assert.equal(await db.recordFile.count({ where: { record: { relationshipId: relationship.id } } }), 0);
      assert.equal(Boolean(await storage.metadata(keys.at(-1)!)), outcome === "unknown");
    }
    console.log(`PASS real PostgreSQL/S3 transaction outcome: ${outcome}`);
  }
  if (process.argv.includes("--public")) {
    // A disposable persisted session exercises the public file routes; the
    // separate browser suite verifies actual OIDC login, PKCE and logout.
    const identity = await db.accountIdentity.create({ data: { accountId: account.id, provider: process.env.SAMMA_OIDC_ISSUER!, providerSubject: tag } });
    const token = randomUUID();
    await db.authSession.create({ data: { sessionToken: token, accountId: account.id, identityId: identity.id, expires: new Date(Date.now() + 60000) } });
    const base = "https://samma.co.za", cookie = `__Host-samma.session-token=${token}`;
    const response = await fetch(`${base}/api/records/upload`, { method: "POST", headers: { Cookie: cookie, Origin: base,
      "X-Samma-Upload": "1", "X-Samma-Relationship": relationship.id, "X-Samma-Definition": version.id,
      "X-Samma-Title": "Synthetic final route check", "X-Samma-Filename": "synthetic.pdf", "Content-Type": "application/octet-stream" }, body: bytes });
    assert.equal(response.status, 201);
    const result = await response.json() as { fileId: string; scanStatus: string };
    assert.equal(result.scanStatus, "NOT_SCANNED_DEV");
    const file = await db.recordFile.findUniqueOrThrow({ where: { id: result.fileId } }); keys.push(file.storageKey);
    const download = await fetch(`${base}/api/files/${result.fileId}`, { headers: { Cookie: cookie } });
    assert.equal(download.status, 200); assert.equal(sha256(new Uint8Array(await download.arrayBuffer())), sha256(bytes));
    assert.equal((await fetch(`${base}/api/files/${result.fileId}`)).status, 401);
    console.log("PASS final public upload/download/checksum and unauthenticated denial using disposable session");
  }
} finally {
  const linked = await db.recordFile.findMany({ where: { record: { relationshipId: relationship.id } } });
  for (const key of new Set([...keys, ...linked.map(file => file.storageKey)])) await storage.delete(key);
  await db.activityEvent.deleteMany({ where: { actorAccountId: account.id } });
  await db.record.deleteMany({ where: { relationshipId: relationship.id } });
  await db.personCompanyRelationship.delete({ where: { id: relationship.id } });
  await db.companyMember.delete({ where: { id: member.id } });
  await db.functionalRoleDefinition.delete({ where: { id: role.id } });
  await db.company.delete({ where: { id: company.id } });
  await db.recordDefinitionVersion.delete({ where: { id: version.id } });
  await db.recordDefinition.delete({ where: { id: definition.id } });
  await db.person.delete({ where: { id: account.person!.id } });
  await db.account.delete({ where: { id: account.id } });
  await db.$disconnect();
}
