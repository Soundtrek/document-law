# Configurable Records and Company Roles

## Purpose

Juanity Law should not hard-code every employment/legal record type or every company staffing pattern into application code.

The platform will instead use two configurable control layers:

1. **Juanity Platform Admin** defines approved record/workflow definitions and safe system policy.
2. **Company Admin** manages the company's own members, assigns functional roles and uses the approved definitions in daily work.

The operating principle is:

```text
Juanity configures the rules once
          ↓
Companies perform simple actions
          ↓
People receive clear records/actions
```

This supports the project's no-hardcoding rule while preserving platform security invariants.

## 1. Juanity Platform Admin

Juanity administrators may define or maintain approved configuration such as:

- record definitions;
- record categories;
- relationship contexts;
- direction/audience;
- working sensitivity/classification;
- functional role defaults;
- who may create, view, download or administer a record type;
- acknowledgement requirements;
- Needs Action behaviour;
- workflow/request definitions;
- notification templates/policies;
- versioning behaviour;
- retention-policy references once legally approved;
- active/inactive state;
- product/entitlement availability.

Platform configuration must not provide a switch that disables fundamental security controls such as tenant isolation, server-side authorisation, private storage, audit requirements that are system invariants, or other approved non-bypassable controls.

## 2. RecordDefinition

A configurable `RecordDefinition` is the policy/template used when creating a record instance.

Candidate fields include:

```text
RecordDefinition
├── id
├── name
├── description
├── category
├── context
│   ├── PERSON
│   ├── COMPANY
│   └── RELATIONSHIP
├── direction / audience
│   ├── PERSON_TO_COMPANY
│   ├── COMPANY_TO_PERSON
│   ├── COMPANY_INTERNAL
│   └── BIDIRECTIONAL / other approved mode
├── classification
├── allowed creator roles
├── allowed viewer roles
├── allowed download roles
├── allowed administrative roles
├── person visibility
├── acknowledgement required
├── Needs Action behaviour
├── retention-policy reference
├── notification policy
├── versioning policy
├── active
└── definition version
```

The final document/record storage schema remains subject to the document-engine design gate. This model defines configuration intent, not final persistence.

## 3. Record-definition versioning

Record definitions must be versioned.

A later change to the definition of `Payslip`, `Disciplinary Outcome` or another record type must not silently alter historic record behaviour without an explicit migration/policy decision.

Each created record should eventually be able to establish which definition/version governed it at creation or at the last approved policy migration.

Example:

```text
Payslip definition v1
  ↓
records created Jan–Jun

Juanity changes access/default workflow
  ↓
Payslip definition v2
  ↓
new records use v2

Historic v1 records do not silently become v2
```

The exact snapshot/reference mechanism will be decided with the document engine.

## 4. Example definitions

### Payslip

Possible Juanity configuration:

```text
Name: Payslip
Category: Payroll
Context: RELATIONSHIP
Direction: COMPANY_TO_PERSON
Classification: HIGHLY_SENSITIVE
Create: PAYROLL, HR
View: PERSON, PAYROLL, approved HR
Manager: no by default
Person download: yes
Acknowledgement: no
Needs Action: no
Retention: payroll policy reference (TBD/legal approval)
Audit: sensitive access/download according to approved policy
```

### Disciplinary Hearing Outcome

Possible Juanity configuration:

```text
Name: Disciplinary Hearing Outcome
Category: Employee Relations
Context: RELATIONSHIP
Direction: COMPANY_TO_PERSON
Classification: HIGHLY_SENSITIVE
Create: HR, LEGAL
View: PERSON, HR, LEGAL
Payroll: no
Manager: only if approved by definition/policy
Acknowledgement: configurable/likely workflow-specific
Needs Action: if acknowledgement/action is required
Retention: employee-relations policy reference (TBD/legal approval)
```

These are examples of configuration capability, not final legal policy.

## 5. Company membership model

A company may have one member performing every administrative function or many staff members splitting the work.

The data model must therefore separate:

- company membership;
- company governance role;
- functional roles/capabilities.

Conceptually:

```text
Company
  └── CompanyMember
        ├── Person/User identity
        ├── membership status
        ├── OWNER / governance capability where applicable
        └── FunctionalRoleGrant[]
              ├── HR
              ├── PAYROLL
              ├── CLERK / RECORDS
              ├── LEGAL
              ├── MANAGER
              ├── BILLING
              └── other Juanity-approved roles
```

One company member may hold multiple functional roles.

Example small company:

```text
Owner / Susan
  ├── OWNER
  ├── HR
  ├── PAYROLL
  └── CLERK
```

Example larger company:

```text
Owner / Director       → OWNER, BILLING
HR Manager             → HR
Payroll Administrator  → PAYROLL
Records Clerk          → CLERK
Legal Officer          → LEGAL
Department Manager     → MANAGER
```

The architecture must not assume one person per role or one role per person.

## 6. Company Owner

`OWNER` is primarily a company-governance capability.

The company owner should be able to:

- manage company subscription/billing as approved;
- invite company staff;
- remove/disable company staff access;
- assign or revoke Juanity-approved functional roles;
- assign roles to themselves where they perform those functions;
- view company membership and role audit history;
- configure company-level settings that Juanity permits companies to control.

`OWNER` should not automatically be implemented as an unconditional bypass of all sensitive-record policies.

For a one-person company, onboarding/configuration should make it fast for the owner to assign themselves HR, Payroll, Clerk, Legal or other required functional roles rather than forcing extra user accounts.

## 7. Company staff invitation flow

Expected flow:

```text
Company Owner
   ↓
Invite staff member
   ↓
Enter/resolve email or user
   ↓
Assign one or more functional roles
   ↓
Invitation accepted
   ↓
CompanyMember becomes active
   ↓
Server derives permitted actions from role/capability policy
```

Important rules:

- invitations are scoped to one company;
- role grants are server-side records;
- role changes are audited;
- invitation/role links must not expose sensitive data;
- disabling a member must revoke active company access promptly;
- a person may potentially belong to more than one company without cross-company leakage.

## 8. Rights and capabilities

Do not rely on UI role names alone for security.

Functional roles should resolve to capabilities such as:

```text
company.members.invite
company.members.manage_roles
relationship.view
relationship.manage
request.create
request.view
record.create:<definition/category>
record.view:<definition/category>
record.download:<definition/category>
record.admin:<definition/category>
billing.manage
```

Exact capability grammar may change during implementation, but server-side policy remains authoritative.

Prefer role-based assignment for daily administration. Avoid unrestricted ad-hoc per-user overrides in v1 unless a real requirement justifies them; exceptions can become difficult to audit and support.

## 9. Juanity Admin vs Company Admin

### Juanity Platform Admin controls

- which role types exist;
- which record/workflow definitions exist;
- hard safety boundaries;
- default access policy;
- allowed company-configurable options;
- system-wide templates/policies;
- definition versions.

### Company Owner/Admin controls

- who belongs to their company;
- which approved functional roles each member has;
- their own company settings within Juanity-approved bounds;
- use of approved record/request definitions;
- company workflow execution.

A company must not be able to create a custom role or configuration that bypasses Juanity's system invariants unless Juanity explicitly designs and approves such extensibility later.

## 10. 3-click / 10-second rule

Juanity Law adopts the following UX rule:

> **A frequent routine action should be reachable from the relevant context in no more than three deliberate clicks/taps and should normally be completable in about ten seconds, excluding time required to type substantial information, select/upload a file, read legal content or complete a security step.**

The rule applies to routine work, not every advanced administration or high-risk security workflow.

Examples:

### Company sends a payslip

```text
Employee/relationship page
  1. Add record
  2. Payslip + choose/upload file
  3. Send
```

The record definition supplies classification, audience, access defaults, audit policy and other configured behaviour.

### Company requests proof of address

```text
Employee/relationship page
  1. Request
  2. Proof of Address
  3. Send
```

### Person responds to request

```text
Needs Action
  1. Provide
  2. Use existing / Upload
  3. Submit
```

### Owner invites company staff

```text
Company Members
  1. Invite
  2. Enter staff member + select roles
  3. Send invitation
```

## 11. Smart defaults

The platform should move complexity into approved configuration so routine users do not repeatedly choose security settings.

When a user selects a record/request definition, the system should already know the approved defaults for:

- context;
- audience;
- classification;
- allowed functional roles;
- acknowledgement behaviour;
- Needs Action behaviour;
- notification policy;
- audit expectations;
- retention-policy reference once approved.

Users should only be asked for information necessary for the specific instance.

## 12. UI design consequence

Context pages should expose high-frequency actions directly.

Example company relationship header:

```text
PERSON NAME
Active employee

[ Request info ] [ Add record ] [ More ]

Needs Action
Employment / Relationship Records
Recent Activity
```

Avoid navigation such as:

```text
People → Person → HR → Records → Category → Actions → Add
```

when the action can safely be exposed from the relationship context.

## 13. No-hardcoding boundary

Configurable business policy belongs in admin/configuration data where practical.

System invariants remain code/policy enforced.

Examples of system invariants:

- tenant/company isolation;
- deny-by-default server authorisation;
- no public object storage as an access mechanism;
- immutable/auditable role-change events where required;
- safe handling of sensitive logs;
- prevention of privilege escalation through client-supplied claims;
- secure definition-version handling.

This distinction prevents the no-hardcoding principle from becoming a way to accidentally configure away security.
