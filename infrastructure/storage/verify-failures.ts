import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { createPrismaClient } from "@samma/database";
import { createStorageProvider, sha256 } from "@samma/storage";
import { NotScannedDevScanner } from "@samma/application";
import { persistRelationshipUpload } from "../../apps/web/lib/record-service";
import { stageUpload } from "../../apps/web/lib/upload-staging";
const db = createPrismaClient(), storage = createStorageProvider();
const fixture = JSON.parse(readFileSync("/validation/storage-fixture.json", "utf8"));
const bytes = Buffer.from("%PDF-1.4 Synthetic rollback fixture\n%%EOF\n");
const source = { sizeBytes: bytes.length, checksumSha256: sha256(bytes), async *open() { yield bytes; } };
try {
  const before = await db.recordFile.count(); let key = "";
  const put = storage.putQuarantined.bind(storage);
  storage.putQuarantined = async input => { key = input.key; return put(input); };
  // Force failure after all transaction statements, exercising actual PostgreSQL rollback.
  const failureDb = new Proxy(db, { get(target, property) {
    if (property === "$transaction") return async (callback: Parameters<typeof db.$transaction>[0]) => target.$transaction(async tx => {
      await (callback as (tx: unknown) => Promise<unknown>)(tx); throw new Error("Synthetic transaction rollback");
    });
    return Reflect.get(target, property);
  } });
  const existing = await db.record.findFirst({ where: { relationshipId: fixture.relationshipId }, include: { files: { where: { isCurrent: true } } } });
  await assert.rejects(() => persistRelationshipUpload(failureDb, storage, new NotScannedDevScanner(), { environment: "development", allowUnscannedDev: true }, {
    accountId: fixture.actorId, relationshipId: fixture.relationshipId, definitionId: fixture.versionId, title: "Synthetic failure", filename: "synthetic.pdf", contentType: "application/pdf", source,
    ...(existing ? { recordId: existing.id } : {}),
  }), /Synthetic transaction rollback/);
  assert.equal(await storage.metadata(key), null); assert.equal(await db.recordFile.count(), before);
  if (existing) assert.equal((await db.recordFile.findFirst({ where: { recordId: existing.id, isCurrent: true } }))?.id, existing.files[0]?.id);
  const path = "/upload-staging", beforeStaging = await readdir(path);
  for (const body of [Buffer.alloc(0), Buffer.from("not a PDF"), Buffer.alloc(257, 1)]) {
    const request = new Request("http://test.invalid", { method: "POST", body });
    await assert.rejects(() => stageUpload(request, path, 256));
  }
  const abort = new AbortController(); abort.abort();
  await assert.rejects(() => stageUpload(new Request("http://test.invalid", { method: "POST", body: bytes, signal: abort.signal }), path, 256));
  assert.deepEqual(await readdir(path), beforeStaging);
  console.log("PASS actual DB rollback/object compensation, old current version preserved; empty/unsupported/oversize/aborted staging cleans files");
} finally { await db.$disconnect(); }
