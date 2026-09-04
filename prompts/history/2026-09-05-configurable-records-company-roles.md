# 2026-09-05 — Configurable records, company roles and 3-click rule

## Goal

Refine Juanity Law so employment/legal record behaviour is configured in Juanity Platform Admin instead of hard-coded for every record type, while supporting both one-person companies and larger companies with separate HR/payroll/legal/admin staff.

## Owner constraints

- Preserve the no-hardcoding principle.
- Juanity must be able to define record/workflow policy in Admin.
- Daily use should steer created records in the correct direction from configuration/smart defaults.
- Companies may have Owner, HR, Payroll, Clerk, Legal and other functional users.
- Sometimes one owner performs all of those functions.
- Company owner must be able to invite their own staff and assign view/action rights.
- Adopt a 3-click / 10-second rule for frequent routine actions.
- Do not weaken sensitive-data security or POPIA-aware architecture.

## Accepted interpretation

### Configurable policy

Introduce a Juanity Platform Admin configuration layer with versioned record/request/workflow definitions.

Definitions may express:

- context (person/company/relationship);
- direction/audience;
- category;
- working sensitivity/classification;
- allowed functional roles;
- acknowledgement/Needs Action behaviour;
- notifications;
- retention-policy reference once legally approved;
- active state;
- definition version.

Definition changes must not silently change historic record policy.

### Company membership

Separate company membership from functional access.

Use many-to-many company-member ↔ functional-role grants.

Working role concepts:

- Owner/governance;
- HR;
- Payroll;
- Clerk/Records;
- Legal;
- Manager;
- Billing;
- future Juanity-approved roles.

A single person can hold multiple roles. A small-company owner can assign themselves all functions they perform. A larger company can split the same roles across several staff members.

`OWNER` is governance/member-role administration, not an unconditional sensitive-data bypass.

### Company-owner capabilities

Owner may:

- invite company staff;
- remove/disable staff;
- assign/revoke approved functional roles;
- assign functional roles to themselves;
- manage approved company settings/billing according to capability.

Role/membership changes are server-authorised and auditable.

### 3-click / 10-second rule

Frequent routine actions should normally require no more than three deliberate clicks/taps and about ten seconds, excluding substantial typing, file upload/selection, legal reading or required security steps.

Examples:

- relationship → request → request type → send;
- relationship → add record → type/file → send;
- Needs Action → provide → existing/upload → submit;
- Company Members → invite → member + roles → send.

Smart defaults from Juanity-approved definitions carry complexity so routine users do not repeatedly select security/policy options.

## Security interpretation

No-hardcoding applies to business policy, not to core security invariants.

The following remain non-bypassable framework rules:

- tenant/company isolation;
- server-side deny-by-default authorisation;
- no trust in client-supplied role/company/definition claims;
- Company Owner is not automatic universal sensitive access;
- role changes are audited;
- sensitive-data logging restrictions;
- definition-version integrity.

## Files / areas affected

- `README.md`
- `AGENTS.md`
- `docs/PROJECT-CHARTER.md`
- `docs/APPLICATION-FRAMEWORK.md`
- `docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`
- `docs/SECURITY-FOUNDATION.md`
- `docs/UI-DESIGN-SYSTEM.md`
- `docs/BUILD-PLAN.md`
- `docs/CODE-BEFORE-VM.md`
- `docs/DECISION-LOG.md`
- document-engine architecture gate issue

## Validation

Documentation-only architecture update. Cross-checked company roles, owner permissions, no-hardcoding boundary, versioned definition model and 3-click rule across the core project docs.

## Result

PASS — architecture/docs updated. Final record/document storage engine remains intentionally pending.

## Follow-up

Design the record/document instance engine itself: how a created record binds to a definition version, storage/content versions, access/view/download behaviour, acknowledgement/evidence, retention and offboarding.
