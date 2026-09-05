# Project Charter

## Person / Company account entry

Account entry offers **Person** or **Company** before real Keycloak authentication.
Person creates a free independent Account/Person and opens `/person`, with no
company creation action in normal navigation. Company asks only for a company
name at `/onboarding/company`, then creates Company, active CompanyMember and
approved OWNER together before opening `/company`. OWNER supplies no implicit
functional or SAMMA Governance access. Existing members can use both Info Centers.

The choice is a short-lived journey, never a permanent Account classification.
This isolated experiment awaits approval before `dev`; no migration, billing,
approval queue, invitation or employment workflow is added. Provider registration
remains disabled with SMTP unconfigured. See [authentication flow details](REAL-AUTHENTICATION-V1.md#onboarding-flow-state).


## Purpose

SAMMA is a secure paid portal for companies and people to manage employment/legal information through an **Info Center** experience.

The product is not primarily a generic file manager and is not initially framed as a legal case-management system.

The system should help each user answer:

1. What is happening?
2. What do I need to do?
3. What am I waiting for?
4. What information and records concern me or my company?
5. What has already happened?

## Commercial model

### Person

A person may create and keep a **free account**.

The person's account is persistent and should not be owned by an employer. It may survive job changes, multiple company relationships and offboarding.

### Company

A company is expected to be the primary **paying entity**.

The company workspace supports its authorised users, employee/person relationships, requests, employment/legal record workflows, administration and later document capability.

Exact packages, prices and commercial limits remain configurable and are not hard-coded into the framework.

## Core product relationship

```text
PERSON                               COMPANY
Free account                         Paid workspace
    │                                    │
Personal Info Center              Company Info Center
    │                                    │
    └────── Person/Company Relationship ─┘
                     │
             Requests / Actions
             Employment context
             Information exchange
             Activity / Audit
             Document capability (TBD)
```

The relationship is a first-class domain concept. It may represent an employee first, while remaining extensible enough for later roles such as former employee, contractor, director or another approved relationship type.

## SAMMA configuration principle

SAMMA follows the owner's **no-hardcoding** principle for business policy where practical.

SAMMA Platform Admin should be able to define approved record/request/workflow definitions such as:

- name/category;
- person/company/relationship context;
- direction/audience;
- working sensitivity/classification;
- which company functional roles may create/view/download/administer;
- acknowledgement/Needs Action behaviour;
- notification policy;
- versioning behaviour;
- retention-policy reference once approved;
- active/inactive state.

Companies then execute these approved definitions rather than reconstructing policy for every record.

Definitions must be versioned. Historic record behaviour must not silently change when SAMMA edits a definition.

System security invariants remain platform-enforced and are not ordinary admin toggles.

See `docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`.

## Company membership and functional roles

A company may have one person doing everything or many people dividing functions.

The framework must therefore support a company member holding **multiple functional roles**.

Initial role concepts may include:

- Owner / governance;
- HR;
- Payroll;
- Clerk / Records;
- Legal;
- Manager;
- Billing;
- other SAMMA-approved roles later.

Example small company:

```text
Susan
  ├── OWNER
  ├── HR
  ├── PAYROLL
  └── CLERK
```

Example larger company:

```text
Director              → OWNER, BILLING
HR Manager            → HR
Payroll Administrator → PAYROLL
Records Clerk         → CLERK
Legal Officer         → LEGAL
Manager               → MANAGER
```

The company owner/governance role should be able to invite/remove company staff and assign/revoke approved functional roles, including assigning roles to themselves.

`OWNER` must not be implemented as an unconditional bypass of all sensitive-record policy. If the owner also performs HR or Payroll, the relevant functional role can be assigned explicitly.

## Initial product areas

- Account and identity boundary
- People
- Companies
- Company membership, invitations and role grants
- Person/company relationships
- Requests / actions
- Configurable record/request/workflow definitions
- Employment/legal record context
- Activity and audit history
- Billing, subscriptions and entitlements
- SAMMA Platform Administration
- Company Administration
- Document capability — intentionally pending detailed design

## Out of scope for this architecture pass

- Online learning / LMS integration
- E-signature implementation
- AI legal advice
- Practice accounting
- Full practice-management replacement
- Court filing integrations
- Document-engine final storage schema
- Final retention/destruction policy
- Final POPIA legal/compliance policy wording

## Product surfaces

### Person Info Center

Simple, task-oriented and low-friction:

- Home / Info Center
- My information
- My company/employment relationships
- Actions / Requests
- Personal records/documents — once designed
- Employment/legal records shared or made available to the person — once designed
- Activity
- Account

A person should never need to understand storage architecture, company tenancy or internal permission mechanics.

### Company Info Center / workspace

Operational, but still information-first:

- Home / Company Info Center
- People / Employees
- Company members and functional roles
- Requests / Actions
- Employment/legal record context
- Company information
- Activity / Audit
- Billing / Subscription
- Administration
- Document operations — once designed

### SAMMA Platform Admin

SAMMA's own control plane should manage approved system/business configuration such as:

- record/workflow definitions;
- categories;
- role catalogue/capability defaults;
- policy templates;
- definition versions;
- allowed company-configurable options;
- products/entitlements;
- operational administration.

It must not be confused with a company's own admin area.

## Core domain frame before the final document-engine storage decision

```text
Person
  ├── Personal profile / information
  └── Relationships
          │
          ├── Company
          ├── Relationship status/context
          ├── Requests / Actions
          ├── Activity Events
          └── Record/Document capability (definition-driven, storage TBD)

Company
  ├── Company members
  │     └── Functional role grants[]
  ├── Subscription / Entitlements
  ├── Company information
  └── Person relationships

SAMMA Platform Admin
  └── Versioned definitions / approved policy configuration
```

A generic `Matter` is no longer a foundational entity. It may be introduced later as an optional legal-work context if actual workflows justify it.

## Information categories

The product is expected to carry sensitive information, potentially including:

- identity and contact information;
- employment information;
- payslips and payroll-related records;
- banking confirmation information;
- disciplinary notices and outcomes;
- hearing records;
- legal correspondence and agreements;
- other sensitive personal information.

This requires privacy, security and audit controls to be structural rather than bolted on later.

## Access principle

A company relationship must **not** give unrestricted access to a person's entire personal information store.

Requests and explicit relationship-scoped access should be preferred over broad vault access.

Company membership, Company Owner or generic administrator status must not automatically imply access to every sensitive employment/legal record. Functional roles and server-side capability checks are authoritative.

## 3-click / 10-second product rule

A frequent routine action should be reachable from the relevant context in **no more than three deliberate clicks/taps** and normally be completable in **about ten seconds**, excluding substantial typing, file selection/upload, reading legal content or a required security step.

Examples include:

- request information from an employee;
- add/send an approved record type;
- respond to a request;
- invite a company staff member and assign roles.

This is a daily-use design target, not a reason to weaken high-risk admin/security workflows.

## Offboarding principle

Ending employment or another company/person relationship changes the relationship state; it does not delete the person's account.

The system must later support explicit rules for:

- access revocation;
- continued lawful record retention;
- former-person visibility;
- company record preservation;
- personal account continuity.

Final retention/access rules are part of the document/data governance design gate.

## Success criteria for the framework phase

The framework phase is successful when the repository can support, without redesigning its foundations:

- authenticated people and company users;
- companies;
- company member invitations and multiple role grants;
- person/company relationships;
- relationship lifecycle/status;
- role/capability-based authorisation;
- configurable/versioned record/request definition primitives;
- requests/actions;
- activity/audit events;
- products/subscriptions/entitlements;
- separate person and company Info Center experiences;
- SAMMA Platform Admin and company-admin separation;
- a data-classification/privacy-aware security foundation;
- the 3-click / 10-second daily-use rule in common workflows;
- later attachment of a legal/employment document storage domain through explicit interfaces;
- deployment onto a dedicated development VM.

## Guiding principle

**SAMMA defines approved rules once; companies perform simple, role-authorised actions; people receive clear information/actions. Keep business policy configurable, keep security invariants enforced, and do not let configurability or convenience weaken privacy, tenancy, offboarding or audit.**
