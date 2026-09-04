import assert from "node:assert/strict";
import test from "node:test";

import {
  canCompanyMemberViewRecord,
  canLegalProfessionalViewRecord,
  deriveRecordDates,
  syntheticDefinitions,
  syntheticLegalGrant,
  syntheticOwnerActor,
  syntheticPayrollActor,
  syntheticRecords,
  syntheticRelationship,
} from "./index.js";

const payslip = syntheticRecords[0]!;
const proof = syntheticRecords[1]!;
const payslipDefinition = syntheticDefinitions[0]!;
const proofDefinition = syntheticDefinitions[1]!;

test("derives retention and review independently", () => {
  const result = deriveRecordDates({ retentionMonths: 24, reviewMonths: 12 }, "2026-01-31T10:00:00.000Z");
  assert.equal(result.retainUntil, "2028-01-31T10:00:00.000Z");
  assert.equal(result.reviewDueAt, "2027-01-31T10:00:00.000Z");
});

test("payroll role can see payroll record but not HR-only verification record", () => {
  assert.equal(canCompanyMemberViewRecord(syntheticPayrollActor, payslip, payslipDefinition), true);
  assert.equal(canCompanyMemberViewRecord(syntheticPayrollActor, proof, proofDefinition), false);
});

test("owner receives only explicitly granted functional access", () => {
  const ownerOnly = { ...syntheticOwnerActor, roleCodes: ["OWNER"] };
  assert.equal(canCompanyMemberViewRecord(ownerOnly, payslip, payslipDefinition), false);
  assert.equal(canCompanyMemberViewRecord(syntheticOwnerActor, proof, proofDefinition), true);
});

test("legal access remains relationship and definition scoped", () => {
  assert.equal(
    canLegalProfessionalViewRecord(
      syntheticLegalGrant,
      syntheticRelationship,
      payslip,
      payslipDefinition,
      "2026-09-15T10:00:00.000Z",
    ),
    true,
  );
  assert.equal(
    canLegalProfessionalViewRecord(
      syntheticLegalGrant,
      syntheticRelationship,
      proof,
      proofDefinition,
      "2026-09-15T10:00:00.000Z",
    ),
    false,
  );
  assert.equal(
    canLegalProfessionalViewRecord(
      syntheticLegalGrant,
      syntheticRelationship,
      payslip,
      payslipDefinition,
      "2026-10-15T10:00:00.000Z",
    ),
    false,
  );
});
