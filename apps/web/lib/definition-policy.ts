// Platform field constraints only; document names, categories and role policy are data.
export const directions = ["COMPANY_TO_PERSON", "PERSON_TO_COMPANY", "INTERNAL_COMPANY"] as const;
export const classifications = ["PUBLIC", "INTERNAL", "PERSONAL", "SENSITIVE", "HIGHLY_SENSITIVE"] as const;
export const retentionModes = ["NONE", "FIXED_FROM_CREATED", "FIXED_FROM_RELATIONSHIP_END"] as const;
export interface DefinitionPolicyInput {
  code: string; name: string; category: string; description: string;
  direction: typeof directions[number]; personVisible: boolean;
  classification: typeof classifications[number]; roleIds: string[];
  reviewMonths: number | null; retentionMode: typeof retentionModes[number]; retentionMonths: number | null;
  notificationPolicy: "NONE"; active: boolean;
}
export class DefinitionError extends Error {
  constructor(readonly code: "denied" | "invalid_policy" | "invalid_roles" | "conflict") { super(code); }
}
export function parseDefinitionPolicy(value: unknown, stableCode?: string): DefinitionPolicyInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DefinitionError("invalid_policy");
  const p = value as DefinitionPolicyInput;
  const fields = ["code", "name", "category", "description", "direction", "personVisible", "classification", "roleIds", "reviewMonths", "retentionMode", "retentionMonths", "notificationPolicy", "active"];
  const period = (v: unknown) => v === null || (typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= 12000);
  if (Object.keys(p).length !== fields.length || Object.keys(p).some(k => !fields.includes(k)) ||
      typeof p.code !== "string" || p.code.length > 80 || (!/^[A-Z][A-Z0-9_]*$/.test(p.code) && p.code !== stableCode) ||
      typeof p.name !== "string" || !p.name.trim() || p.name.length > 160 ||
      typeof p.category !== "string" || !p.category.trim() || p.category.length > 100 ||
      typeof p.description !== "string" || p.description.length > 2000 ||
      !directions.includes(p.direction) || !classifications.includes(p.classification) ||
      typeof p.personVisible !== "boolean" || typeof p.active !== "boolean" ||
      !Array.isArray(p.roleIds) || p.roleIds.length > 100 || p.roleIds.some(id => typeof id !== "string" || !id || id.length > 128) || new Set(p.roleIds).size !== p.roleIds.length ||
      !period(p.reviewMonths) || !retentionModes.includes(p.retentionMode) || !period(p.retentionMonths) ||
      (p.retentionMode === "NONE" ? p.retentionMonths !== null : p.retentionMonths === null) || p.notificationPolicy !== "NONE") throw new DefinitionError("invalid_policy");
  return { ...p, name: p.name.trim(), category: p.category.trim(), description: p.description.trim() };
}
export function hasDocumentSettingsCapability(grants: { functionalRole: { capabilities: unknown } }[]) {
  return grants.some(({ functionalRole }) => Array.isArray(functionalRole.capabilities) && functionalRole.capabilities.includes("company.settings.manage"));
}
export const directionLabel = (value: string) => ({ COMPANY_TO_PERSON: "Company → Person", PERSON_TO_COMPANY: "Person → Company", INTERNAL_COMPANY: "Internal company", BIDIRECTIONAL: "Bidirectional (legacy)" })[value] ?? value;
