# Project Charter

## Purpose

Juanity Law is a secure paid portal for companies and people to manage employment/legal information through an **Info Center** experience.

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

## Initial product areas

- Account and identity boundary
- People
- Companies
- Company users and permissions
- Person/company relationships
- Requests / actions
- Employment/legal record context
- Activity and audit history
- Billing, subscriptions and entitlements
- Administration
- Document capability — intentionally pending detailed design

## Out of scope for this architecture pass

- Online learning / LMS integration
- E-signature implementation
- AI legal advice
- Practice accounting
- Full practice-management replacement
- Court filing integrations
- Document-engine final schema
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
- Company users and roles
- Requests / Actions
- Employment/legal record context
- Company information
- Activity / Audit
- Billing / Subscription
- Administration
- Document operations — once designed

## Core domain frame before the document-engine decision

```text
Person
  ├── Personal profile / information
  └── Relationships
          │
          ├── Company
          ├── Relationship status/context
          ├── Requests / Actions
          ├── Activity Events
          └── Document capability (TBD)

Company
  ├── Company users / permissions
  ├── Subscription / Entitlements
  ├── Company information
  └── Person relationships
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

Likewise, company administrator status must not automatically imply access to every sensitive employment/legal record. Server-side capability checks are authoritative.

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
- person/company relationships;
- relationship lifecycle/status;
- company role/capability-based authorisation;
- requests/actions;
- activity/audit events;
- products/subscriptions/entitlements;
- separate person and company Info Center experiences;
- a data-classification/privacy-aware security foundation;
- later attachment of a legal/employment document domain through explicit interfaces;
- deployment onto a dedicated development VM.

## Guiding principle

**Build the relationship and information framework first. Do not pre-solve the document engine, but do not make framework choices that weaken privacy, tenancy, offboarding, audit or later legal record requirements.**
