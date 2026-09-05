// Audited operator command; never imported by the public runtime.
import { createPrismaClient } from "@samma/database";
import { syntheticRoleDefinitions } from "../../packages/domain/src/synthetic-config";
const db = createPrismaClient();
try {
  if (process.env.SAMMA_ENV !== "development") throw new Error("DEV seed only");
  const actorAccountId = process.argv[2];
  const actor = await db.account.findFirst({ where: { id: actorAccountId ?? "", status: "ACTIVE", emailVerified: true }, include: { governanceGrants: { where: { revokedAt: null } } } });
  if (!actor || !["platform.roles.manage", "platform.definitions.manage"].every(capability => actor.governanceGrants.some(grant => grant.capability === capability))) throw new Error("Governance seed capability required");
  await db.$transaction(async tx => {
    for (const role of syntheticRoleDefinitions) if (!await tx.functionalRoleDefinition.findUnique({ where: { code: role.code } })) {
      await tx.functionalRoleDefinition.create({ data: { code: role.code, label: role.label, capabilities: [...role.capabilities] } });
      await tx.activityEvent.create({ data: { type: "GOVERNANCE_ROLE_CREATED", actorAccountId, summary: `Approved DEV role catalogue: ${role.code}` } });
    }
    if (await tx.recordDefinitionVersion.count({ where: { active: true, context: "RELATIONSHIP", recordDefinition: { active: true } } }) === 0) {
      for (const visible of [true, false]) {
        const key = visible ? "dev-workflow-visible" : "dev-workflow-internal";
        if (await tx.recordDefinition.findUnique({ where: { key } })) continue;
        await tx.recordDefinition.create({ data: { key, versions: { create: { version: 1, name: visible ? "Synthetic employee document" : "Synthetic internal HR note", category: "DEV_WORKFLOW", context: "RELATIONSHIP", direction: visible ? "COMPANY_TO_PERSON" : "INTERNAL_COMPANY", classification: "PERSONAL", allowedCompanyRoles: ["HR"], personVisible: visible } } } });
        await tx.activityEvent.create({ data: { type: "GOVERNANCE_DEFINITION_CREATED", actorAccountId, summary: `Synthetic DEV workflow definition created: ${key}; no retention/destruction values` } });
      }
    }
  });
  console.log("PASS absent approved DEV roles and minimal synthetic definitions configured through audited Governance capabilities");
} finally { await db.$disconnect(); }
