import assert from "node:assert/strict";
import { createPrismaClient } from "@samma/database";

// Operator-run DEV configuration, using the existing Governance definition model.
// Never update a pinned version or infer retention/review policy from a demo fixture.
assert.equal(process.env.SAMMA_ENV, "development");
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/juanity_law");
const db = createPrismaClient();
try {
  await db.$transaction(async tx => {
    const hr = await tx.functionalRoleDefinition.findUniqueOrThrow({ where: { code: "HR" } });
    assert.equal(hr.active, true);
    const key = "dev-person-proof-of-address";
    const policy = { version: 1, name: "Synthetic proof of address", category: "TEST", context: "RELATIONSHIP" as const,
      direction: "PERSON_TO_COMPANY" as const, classification: "SENSITIVE" as const, personVisible: true,
      allowedCompanyRoles: ["HR"], notificationPolicy: "NONE", active: true, retentionMonths: null, reviewMonths: null };
    const existing = await tx.recordDefinition.findUnique({ where: { key }, include: { versions: true } });
    if (existing) {
      assert.equal(existing.active, true);
      assert.equal(existing.versions.length, 1);
      for (const [field, value] of Object.entries(policy)) assert.deepEqual(existing.versions[0]![field as keyof typeof policy], value);
    } else {
      await tx.recordDefinition.create({ data: { key, versions: { create: policy } } });
      await tx.activityEvent.create({ data: { type: "RECORD_DEFINITION_CREATED", summary: "Authorised DEV operator configured synthetic Person sharing definition version 1; notifications NONE." } });
    }
  }, { isolationLevel: "Serializable" });
  console.log("PASS synthetic Person sharing definition configured; existing versions preserved.");
} finally { await db.$disconnect(); }
