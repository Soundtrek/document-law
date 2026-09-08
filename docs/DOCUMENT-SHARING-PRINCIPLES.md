# SAMMA Document Sharing Principles

## Purpose

SAMMA is a relationship-centred employment document knowledge system. Documents are shared and controlled through the relationship between a Person and a Company, not through loose file ownership or blanket workspace access.

The core model is:

```text
Person ↔ PersonCompanyRelationship ↔ Company
```

A document is not only a file. In SAMMA:

```text
File
+ metadata
+ relationship context
+ Record Definition
+ access policy
+ retention/review policy
+ history/audit
= document knowledge
```

This document defines the sharing principles and the non-negotiable **No Hardcode Law** for document types and document access.

---

## 1. Sharing directions

SAMMA supports three primary record directions.

### COMPANY_TO_PERSON

The Company provides a record to the Person.

Examples:

- Payslip
- Employment contract
- Employment confirmation letter
- Employer-issued training certificate
- Warning or disciplinary document when policy permits Person visibility

The Company operator must hold an allowed functional role for the selected Record Definition. The Person sees the record only when the pinned definition version allows Person visibility.

### PERSON_TO_COMPANY

The Person provides a record to the Company through an active PersonCompanyRelationship.

Examples:

- Proof of address
- Identity document
- Qualification certificate
- Medical certificate
- Signed form
- Bank confirmation

The Person may upload only definitions that explicitly permit `PERSON_TO_COMPANY`. Company access is still controlled by the pinned Record Definition and the receiving operator's functional roles.

### INTERNAL_COMPANY

The Company stores a relationship-scoped internal record that is not automatically visible to the Person.

Examples:

- Internal HR note
- Internal investigation note
- Internal legal opinion
- Internal payroll note

The Person must not gain access merely because the record is attached to their employment relationship.

---

## 2. Person and Company access are separate concerns

`PersonCompanyRelationship` is the employment relationship.

`CompanyMember` is a person who operates SAMMA for a Company.

They must never be confused.

```text
Add person
→ PersonCompanyRelationship

Add team member
→ CompanyMember
```

Accepting an employment invitation must not create CompanyMember access.

Accepting a team invitation must not create an employment relationship.

---

## 3. OWNER is governance, not a document bypass

Company OWNER controls workspace governance and Team & Access, but OWNER must not automatically receive sensitive document access.

Document access is determined by functional roles permitted by the relevant Record Definition.

Example:

```text
OWNER only
→ cannot access HR-only records

OWNER + HR
→ may access HR records where the definition allows HR
```

This rule must be enforced server-side. Hiding buttons in the UI is not sufficient.

---

## 4. Record Definitions are the document rulebook

Every real document type in SAMMA must be represented by a Record Definition and versioned Record Definition policy.

A Record Definition describes at least:

- stable code
- name
- description
- category
- active/inactive status
- direction
- Person visibility
- permitted Company functional roles
- classification
- review policy
- retention policy
- notification policy

A Record created from a definition must pin the exact Record Definition Version that governed it.

Policy changes create a new version. Existing records remain governed by the version they were created against.

---

# 5. NO HARDCODE LAW

## Rule

**Document types, sharing directions, Person visibility, Company access roles, review rules and retention rules must not be hardcoded into normal application flows.**

SAMMA must be configuration-driven.

The application may contain platform mechanics and security invariants, but business document policy must come from persisted Record Definitions and role configuration.

### The following must NOT be hardcoded as fixed product behaviour

- Payslip as a mandatory built-in type
- Employment contract as a mandatory built-in type
- Proof of address as a mandatory built-in type
- HR as the only role allowed to access a class of documents
- Payroll automatically seeing every payroll-looking document
- OWNER automatically seeing every document
- fixed retention periods embedded in source code
- fixed review periods embedded in source code
- Person visibility based on document names or UI routes
- special-case access based on email address, company name or user identity

### The following MAY be hardcoded as platform security invariants

- authentication is required
- tenant/company boundaries must be enforced
- Person access must be bound to the correct Person identity
- relationship access must be bound to the correct relationship
- role grants must be active and unrevoked
- raw invitation tokens must never be stored
- expired/revoked access must fail closed
- cross-company access must be denied
- records remain pinned to their definition version
- immutable file history and audit guarantees

The distinction is simple:

```text
Business policy = configurable
Security invariants = enforced by code
```

---

## 6. Governance/Admin control of document definitions

SAMMA Governance must contain the platform-level document definition administration area.

Existing Governance navigation should remain compact:

```text
Governance
├── Definitions
├── Roles
├── Users
└── Audit / Security
```

### Governance → Definitions

This is the canonical platform-admin area for Record Definitions.

It must support:

- list definitions
- create definition
- view definition
- create a new version
- activate/deactivate current versions
- configure direction
- configure Person visibility
- configure allowed Company roles
- configure classification
- configure review policy
- configure retention policy
- configure notification policy

Changes to policy must create a new version rather than silently rewriting rules on existing records.

### Governance → Definitions → Access Matrix

Provide a read-only matrix derived from the active Record Definitions.

Example:

| Record type | Direction | Person | HR | Payroll | Legal | Clerk | Manager |
|---|---|---:|---:|---:|---:|---:|---:|
| Payslip | Company → Person | Yes | Yes | Yes | No | No | No |
| Contract | Company → Person | Yes | Yes | No | Yes | No | No |
| Proof of Address | Person → Company | Yes | Yes | No | No | Yes | No |
| Internal HR Note | Internal Company | No | Yes | No | No | No | No |

The matrix is a view over definition policy, not a second independent permission system.

---

## 7. Company-defined document types

SAMMA must also allow Companies to create and manage their own document types within controlled boundaries.

A Company must not be limited to only SAMMA-global definitions.

Examples:

- Company-specific induction form
- Equipment issue form
- Internal site access certificate
- Custom policy acknowledgement
- Company-specific competency certificate
- Department-specific HR record

Company-created definitions must remain scoped to that Company unless explicitly promoted by platform Governance.

### Company administration

The Company workspace should have a clear administration area, separate from employment People cards.

Suggested structure:

```text
Company
├── People
├── Team & Access
└── Document Settings
    ├── Document Types
    └── Access Matrix
```

### Company → Document Settings → Document Types

Authorised Company administrators must be able to:

- create a Company-specific document type
- choose direction
- choose whether the Person may see it
- choose allowed Company functional roles
- set classification
- set review policy
- set retention policy
- activate/deactivate the type
- create a new version when policy changes

Company definitions must use the same underlying Record Definition engine and versioning rules as platform definitions.

Do not create a second hardcoded Company document system.

### Company → Document Settings → Access Matrix

Provide a read-only matrix showing the Company's effective document-access policy, combining:

- applicable platform definitions
- Company-specific definitions
- active Company functional roles

This matrix should answer:

> Which roles can access which document types in this Company?

---

## 8. Companies control who has document access

Record Definitions determine **which roles are allowed**.

Team & Access determines **which CompanyMembers hold those roles**.

The access decision is therefore:

```text
Record Definition allows HR
+
CompanyMember has active HR grant
+
relationship/company boundary passes
=
HR member may access the record
```

A Company Owner must be able to assign and revoke functional roles through Team & Access.

Companies must not need developer intervention to decide which authorised personnel hold HR, PAYROLL, LEGAL, CLERK, MANAGER or other supported roles.

Where the product later supports custom Company functional roles, those roles must also be data-driven and mapped through the same permission engine rather than hardcoded conditionals.

---

## 9. Creation and read access

V1 may use the same allowed Company role set for create and read operations where that remains sufficient.

However, the Record Definition model must not prevent future separation of:

```text
Who may create/upload
Who may read/download
Who may replace/version
Who may approve/release
```

Do not introduce these extra matrices until there is a real requirement, but do not hardcode the engine in a way that makes them impossible.

---

## 10. Person visibility

Person visibility is controlled by the pinned Record Definition Version.

Examples:

```text
Payslip
→ personVisible = true

Proof of Address
→ personVisible = true

Internal HR Note
→ personVisible = false
```

A Person-facing route must never infer visibility from:

- filename
- category name
- record title
- upload direction alone
- uploader role

It must use the persisted policy.

---

## 11. Retention and review

Retention and review are separate concepts.

### Review

Review determines when a record should be refreshed or checked.

Example:

```text
Proof of Address
Review every 12 months
```

### Retention

Retention determines how long a record must remain preserved.

Example:

```text
Payslip
Retain for configured period
```

Retention periods must be configured through definition policy, not embedded as legal assumptions in source code.

Governance or authorised Company administration may define the applicable policy according to their legal and operational requirements.

SAMMA may calculate `reviewDueAt` and `retainUntil` from the pinned definition policy.

---

## 12. Classification

Record Definition policy should support a small classification model such as:

- GENERAL
- PERSONAL
- SENSITIVE
- HIGHLY_SENSITIVE

Classification is metadata and policy context. It must not replace explicit role and Person visibility checks.

Future controls such as MFA/step-up may use classification, but classification alone must never grant access.

---

## 13. Suggested initial platform definition pack

The initial SAMMA platform pack may include definitions such as:

- Payslip
- Employment Contract
- Employment Confirmation Letter
- Proof of Address
- Identity Document
- Medical Certificate
- Qualification Certificate
- Training Certificate
- Disciplinary Record
- Internal HR Note
- Internal Legal Note
- Internal Payroll Record

These are starter configuration, not hardcoded product law.

Governance must be able to change, deactivate or replace them through versioned definitions.

Companies must be able to add their own additional types without a code release.

---

## 14. User experience principle

The policy engine should remain mostly invisible to normal users.

A Person should see simple actions such as:

```text
My companies
Company1
[ Share document ]

My records
August Payslip
Proof of Address
Medical Certificate
```

An HR user should see only the record types they are authorised to use.

The upload form should query the allowed active definitions instead of presenting hardcoded document choices.

---

## 15. Audit principle

SAMMA must record significant document events using safe identifiers and without copying document contents into logs.

Examples:

- record created
- file uploaded/replaced
- record viewed
- file downloaded
- access denied
- upload denied
- definition version created/activated/deactivated
- role granted/revoked

Access decisions must remain explainable from:

```text
actor
+ company
+ relationship
+ pinned Record Definition Version
+ active role grants
+ Person visibility policy
+ audit history
```

---

## 16. Implementation principle

The document engine must expose generic operations such as:

```text
listAllowedDefinitions(actor, relationship, direction)
createRecord(actor, relationship, definitionVersion, file)
canReadRecord(actor, record)
canDownloadFile(actor, file)
calculateReviewAndRetention(definitionVersion, record)
```

Normal feature code should not contain chains such as:

```text
if documentType === "PAYSLIP" then allow PAYROLL
if documentType === "MEDICAL_CERTIFICATE" then allow HR
```

Those are violations of the No Hardcode Law.

---

## 17. Non-negotiable outcome

SAMMA must allow document policy to evolve without requiring application-code changes for ordinary business configuration.

Platform Governance must be able to define the standard SAMMA document catalogue.

Companies must be able to add Company-specific document types.

Companies must be able to decide which of their authorised personnel hold the functional roles that the definitions permit.

The final access model is:

```text
Who is the actor?
        +
Which Company / Person relationship is involved?
        +
Which Record Definition Version governs this record?
        +
What direction and Person visibility does it define?
        +
Which functional roles does it permit?
        +
Which roles does this CompanyMember currently hold?
        +
Are all grants, company, relationship and record states valid?
        =
ALLOW or DENY
```

This is the core SAMMA document-sharing principle.
