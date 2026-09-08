import type { Prisma } from "@samma/database";
import { writeDefinitionPolicy } from "../../apps/web/lib/record-definitions";
// Starter configuration, never consulted by upload routes or permission evaluation.
const pack = [
  ["PAYSLIP", "Payslip", "Payroll", "COMPANY_TO_PERSON", true, ["HR", "PAYROLL"], "PERSONAL"],
  ["EMPLOYMENT_CONTRACT", "Employment Contract", "Employment", "COMPANY_TO_PERSON", true, ["HR", "LEGAL"], "SENSITIVE"],
  ["EMPLOYMENT_CONFIRMATION_LETTER", "Employment Confirmation Letter", "Employment", "COMPANY_TO_PERSON", true, ["HR"], "PERSONAL"],
  ["PROOF_OF_ADDRESS", "Proof of Address", "Identity/Compliance", "PERSON_TO_COMPANY", true, ["HR", "CLERK"], "SENSITIVE"],
  ["IDENTITY_DOCUMENT", "Identity Document", "Identity", "PERSON_TO_COMPANY", true, ["HR"], "HIGHLY_SENSITIVE"],
  ["MEDICAL_CERTIFICATE", "Medical Certificate", "Medical", "PERSON_TO_COMPANY", true, ["HR"], "HIGHLY_SENSITIVE"],
  ["QUALIFICATION_CERTIFICATE", "Qualification Certificate", "Training/Qualification", "PERSON_TO_COMPANY", true, ["HR"], "PERSONAL"],
  ["TRAINING_CERTIFICATE", "Training Certificate", "Training", "COMPANY_TO_PERSON", true, ["HR"], "PERSONAL"],
  ["DISCIPLINARY_RECORD", "Disciplinary Record", "Disciplinary", "COMPANY_TO_PERSON", true, ["HR", "LEGAL"], "SENSITIVE"],
  ["INTERNAL_HR_NOTE", "Internal HR Note", "HR Internal", "INTERNAL_COMPANY", false, ["HR"], "SENSITIVE"],
  ["INTERNAL_LEGAL_NOTE", "Internal Legal Note", "Legal", "INTERNAL_COMPANY", false, ["LEGAL"], "HIGHLY_SENSITIVE"],
  ["PAYROLL_INTERNAL_RECORD", "Payroll Internal Record", "Payroll", "INTERNAL_COMPANY", false, ["PAYROLL"], "SENSITIVE"],
] as const;
export async function installStarterPack(tx: Prisma.TransactionClient) {
  const roles = await tx.functionalRoleDefinition.findMany({ where: { active: true } });
  for (const [code, name, category, direction, personVisible, allowed, classification] of pack) {
    // Idempotent installer never overwrites later Governance decisions.
    if (await tx.recordDefinition.findUnique({ where: { key: code } })) continue;
    const selected = allowed.map(code => roles.find(role => role.code === code));
    if (selected.some(role => !role)) throw new Error("Starter pack requires active configured roles");
    await writeDefinitionPolicy(tx, null, null, { action: "save", policy: { code, name, category, direction, personVisible, classification,
      description: "", roleIds: selected.map(role => role!.id), active: true, reviewMonths: null, retentionMode: "NONE", retentionMonths: null, notificationPolicy: "NONE" } });
  }
  const synthetic = await tx.recordDefinition.findMany({ where: { companyId: null, active: true, versions: { some: { name: { in: ["Synthetic employee document", "Synthetic internal HR note", "Synthetic proof of address"] } } } }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
  for (const definition of synthetic) await writeDefinitionPolicy(tx, null, null, { action: "deactivate", definitionId: definition.id, expectedVersion: definition.versions[0]!.version });
}
