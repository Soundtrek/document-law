// Explicit operator cleanup of incomplete synthetic browser runs; never used by app startup.
import { readFileSync } from "node:fs";
import { createPrismaClient } from "@samma/database";
import { createStorageProvider } from "@samma/storage";
const db = createPrismaClient();
try {
  if (process.env.SAMMA_ENV !== "development" || process.argv[2] !== "incomplete-synthetic-runs") throw new Error("Explicit DEV cleanup required");
  const users = JSON.parse(readFileSync("/validation/users.json", "utf8")) as { email: string }[];
  if (!users.every(user => /^workflow-(owner-a|owner-b|employee|billing)-[a-f0-9]+@example\.test$/.test(user.email))) throw new Error("Invalid fixture manifest");
  const accounts = await db.account.findMany({ where: { primaryEmail: { in: users.map(user => user.email) } } });
  const ids = accounts.map(account => account.id);
  const companies = await db.company.findMany({ where: { name: { in: ["Synthetic Workflow Company A", "Synthetic Workflow Company B"] }, members: { some: { accountId: { in: ids } }, every: { accountId: { in: ids } } } }, include: { records: { include: { files: true } }, invitations: true, relationships: { include: { person: true } } } });
  if (companies.some(company => company.records.some(record => !ids.includes(record.uploadedByAccountId)) || company.relationships.some(relationship => !ids.includes(relationship.person.accountId)))) throw new Error("Fixture ownership mismatch");
  const companyIds = companies.map(company => company.id);
  const storage = createStorageProvider();
  for (const company of companies) for (const record of company.records) for (const file of record.files) await storage.delete(file.storageKey);
  await db.$transaction(async tx => {
    await tx.activityEvent.deleteMany({ where: { companyId: { in: companyIds } } });
    await tx.companyInvitation.deleteMany({ where: { companyId: { in: companyIds } } });
    await tx.record.deleteMany({ where: { companyId: { in: companyIds } } });
    await tx.personCompanyRelationship.deleteMany({ where: { companyId: { in: companyIds } } });
    await tx.companyMember.deleteMany({ where: { companyId: { in: companyIds } } });
    await tx.company.deleteMany({ where: { id: { in: companyIds } } });
  });
  console.log(`Cleaned ${companies.length} explicitly identified incomplete synthetic browser companies; real accounts and other data preserved.`);
} finally { await db.$disconnect(); }
