import type { FunctionalRoleDefinition } from "./model";

export const syntheticRoleDefinitions: readonly FunctionalRoleDefinition[] = [
  { id: "role-owner", code: "OWNER", label: "Company Owner", capabilities: ["company.members.manage", "company.settings.manage"], active: true },
  { id: "role-hr", code: "HR", label: "HR", capabilities: ["relationship.view", "records.hr.manage"], active: true },
  { id: "role-payroll", code: "PAYROLL", label: "Payroll", capabilities: ["relationship.view", "records.payroll.manage"], active: true },
  { id: "role-clerk", code: "CLERK", label: "Clerk / Records", capabilities: ["records.allowed.process"], active: true },
  { id: "role-legal", code: "LEGAL", label: "Legal", capabilities: ["relationship.view", "records.legal.manage"], active: true },
  { id: "role-manager", code: "MANAGER", label: "Manager", capabilities: ["relationship.assigned.view"], active: true },
  { id: "role-billing", code: "BILLING", label: "Billing", capabilities: ["company.billing.manage"], active: true },
];
