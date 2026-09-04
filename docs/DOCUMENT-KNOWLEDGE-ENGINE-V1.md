# Document Knowledge Engine — V1 Approved Model

## Product definition

Juanity Law is a **document knowledge system**.

The engine does not treat a document as only a file. A record combines:

```text
File
+ definition
+ person/company relationship context
+ access policy
+ retention/review knowledge
+ activity/audit history
= document knowledge
```

The v1 goal is deliberately simple: securely place the right record on the right person/company profile, let authorised people view it, know when it must be reviewed or retained, and preserve who did what.

## Core user behaviour

### Company adds a document for a person

Example: payslip.

```text
Company user opens employee relationship/profile
  ↓
Add record
  ↓
Choose `Payslip` and upload file
  ↓
Save
```

The engine automatically:

- resolves the correct Person ↔ Company relationship;
- binds the record to the active version of the `Payslip` definition;
- stores the file securely;
- computes retention/review dates from Juanity policy;
- applies the definition's allowed company functional roles;
- makes the record visible in the person's Info Center/profile;
- makes the relationship-shared record visible to authorised company users on the employee profile;
- creates an activity/audit event;
- creates a notification/update for the person where the definition requires it.

The daily user should not configure security/retention from scratch for every file.

## Profile projection

### Person profile / Info Center

A person sees:

- personal information;
- own/private records where supported;
- each company relationship;
- records made available through each relationship;
- records that need renewal/replacement;
- Needs Action items;
- recent updates/activity.

### Company employee profile

An authorised company user sees:

- relationship information;
- records shared/issued within that company-person relationship;
- outstanding requests;
- review/renewal status relevant to their role;
- relationship activity permitted to that role.

The company does **not** automatically see unrelated private records in the person's personal Info Center.

## Record definition

Juanity Governance defines record types as versioned configuration.

Example:

```text
Name: Payslip
Category: Payroll
Context: PersonCompanyRelationship
Direction: Company → Person
Allowed company roles: PAYROLL, HR
Person view: Yes
Retention rule: 7 years
Review/renewal rule: none
Notification: new record available
```

Another example:

```text
Name: Proof of Address
Category: Verification
Context: Person or PersonCompanyRelationship (per approved definition)
Allowed company roles: HR, CLERK
Person view: Yes
Retention rule: Juanity policy
Review/renewal rule: 12 months
Notification: replacement due when review date is reached
```

Another example:

```text
Name: BEE Certificate
Category: Compliance
Context: Company
Retention rule: Juanity policy
Review/renewal rule: 12 months
```

The examples are policy examples, not hard-coded application values. Juanity Governance owns the definitions.

## Retention and review are different

The engine must distinguish:

### Retention

How long the record/file must be retained according to the approved Juanity policy.

### Review / renewal

When the information should be checked, renewed or replaced.

A record may be due for replacement while the old version remains retained.

Therefore a record may carry both:

```text
retain_until
review_due_at
```

These are derived from the versioned definition/policy that governed the record when it was created, subject to explicit approved migration if policy changes.

## V1 record model

Keep the record instance small.

Conceptually:

```text
Record
├── id
├── definition_version_id
├── context_type
├── person_id? 
├── company_id?
├── relationship_id?
├── title / period / reference metadata
├── uploaded_by_actor_id
├── created_at
├── retain_until?
├── review_due_at?
├── status
├── replaced_by_record_id?
└── current_file_id
```

A separate file/object record contains technical storage metadata:

```text
RecordFile
├── id
├── record_id
├── storage_provider
├── storage_key
├── original_filename
├── content_type
├── size
├── checksum
├── scan_status
├── processing_status
├── created_at
└── accepted_at
```

Do not embed binary files in PostgreSQL by default.

## Storage architecture

The storage boundary is approved and is part of V1 architecture.

```text
PostgreSQL
= Record knowledge, context, permissions, retention/review, audit and RecordFile object references/checksums

Private S3-compatible object storage
= actual binary objects
```

Production object storage is intended to be separate from the Juanity application VM and independently recoverable.

The engine talks only to a provider-neutral `StorageProvider` interface. It must not depend on provider-specific public URLs, bucket structure or filesystem paths.

Storage invariants:

- private buckets/containers;
- opaque object keys with no person/company/document names;
- Juanity server authorisation before object access;
- short-lived signed access only after authorisation where signed URLs are used;
- uploads remain untrusted until quarantine/validation/malware-scan/checksum acceptance completes;
- PostgreSQL remains authoritative for retention/review/access knowledge;
- object-store lifecycle rules may assist but do not replace Juanity policy;
- primary object storage is not itself a backup;
- object/checksum inventory can be reconciled against PostgreSQL during recovery/migration.

See `STORAGE-ARCHITECTURE.md`.

## Record contexts

V1 supports three contextual destinations:

### Person

Private/person-held information that is not automatically exposed to a company.

### Company

Company records such as company compliance/corporate information.

### PersonCompanyRelationship

Employment/legal records that concern the relationship between one person and one company, such as:

- payslips;
- employment agreements;
- warnings/notices;
- disciplinary/hearing outcomes;
- legal correspondence;
- other Juanity-defined employment records.

The exact record catalogue remains configuration-driven.

## Company membership and access

A company member receives access through functional roles, not through a universal admin flag.

Examples:

- PAYROLL may view/create payroll definitions;
- HR may view/create HR-approved definitions;
- CLERK may process definitions explicitly allowed to Clerk;
- LEGAL may access legal/employment definitions explicitly allowed to Legal;
- OWNER governs company membership and may assign functional roles, including to themselves.

One person may hold multiple roles.

`OWNER` alone is not a universal sensitive-record reader.

## External legal-professional access

A lawyer/legal professional does not need to become a company member.

Use a scoped `LegalAccessGrant`.

Conceptually:

```text
LegalAccessGrant
├── id
├── granted_to_actor_id
├── relationship_id
├── granted_by_actor_id
├── represents: COMPANY | PERSON
├── scope / allowed record categories or definitions
├── can_view
├── can_download
├── starts_at
├── expires_at
├── revoked_at?
└── status
```

Default behaviour should be read-only unless an approved workflow grants more.

The legal professional sees only the relationship and records included in the grant. They do not inherit the company's broader workspace or the person's unrelated private Info Center.

Every view/download of sensitive records through a legal grant should be auditable according to the approved policy.

## Legal-access UX

Frequent grant flow should remain simple:

```text
Employee relationship
  ↓
Grant Legal Access
  ↓
Choose legal professional + scope + expiry
  ↓
Send
```

The target receives an email invitation, signs in with their verified email identity, and sees the granted relationship in a restricted Legal Access view.

## Email identity

Email is the primary human-facing login identifier from the start, while a stable internal Account ID remains the Juanity identity key.

Authentication identifies the human. Authorisation resolves their current context:

- Person;
- Company member + functional roles;
- Juanity Governance capabilities;
- LegalAccessGrant.

See `AUTHENTICATION-AND-GOVERNANCE.md`.

## Juanity Governance

There is no generic `/admin` surface.

Juanity-only policy control lives under **Governance** (`/governance` initially).

Governance manages:

- record definitions;
- definition versions;
- categories;
- retention rules;
- review/renewal rules;
- approved company functional roles/capabilities;
- notification policy;
- platform security/audit functions according to Governance capability.

Company owners manage their own team/access in the company workspace, not in Juanity Governance.

## Notification principle

Notifications should say enough to direct the user without leaking sensitive content.

Example:

`A new document is available in your Acme Ltd employment profile.`

Do not include salary values, disciplinary narrative or other sensitive record content in ordinary email notifications.

## Activity / audit

Minimum v1 events include:

- record created;
- file accepted/rejected after scan;
- record made available to person;
- record viewed where required by sensitivity/policy;
- record downloaded where required;
- record replaced/superseded;
- review became due;
- legal access granted;
- legal access used;
- legal access revoked/expired;
- company role grant/revocation;
- definition version activated/deactivated.

Audit data must preserve actor, company/person/relationship context, resource, timestamp and relevant access context without duplicating sensitive file contents.

## Upload processing

When real file storage is integrated on the Law VM:

```text
Upload
  ↓
Quarantine / untrusted state
  ↓
Validate type/size/name
  ↓
Malware scan
  ↓
Checksum
  ↓
Accept into private S3-compatible object storage
  ↓
Record becomes available
```

A failed or unscanned upload must not silently become a trusted record.

## File access

- object storage is private;
- server authorisation happens before file access;
- storage key is never a permission mechanism;
- any signed URL must be short lived and generated only after authorisation;
- access through a legal grant must resolve the grant on every protected request or through equivalently safe short-lived authorisation.

## 3-click / 10-second rule

Routine actions should remain simple:

### Add employee record

1. Employee profile
2. Add record + choose definition/file
3. Save/send

### View employee record

1. Employee
2. Records / visible record
3. View/download if authorised

### Employee views new file

1. Needs Action/update or company relationship
2. Record
3. View/download

### Grant lawyer access

1. Employee relationship
2. Grant Legal Access
3. Recipient/scope/expiry + Send

Security steps, reading and file-selection time are excluded from the target where genuinely required.

## V1 deliberately does not become

- a full HR management system;
- a payroll calculation system;
- a legal case-management platform;
- a court filing platform;
- an e-signature platform;
- an AI legal advice engine.

It is a secure document knowledge system first.

## Implementation approval

This document approves enough of the v1 engine model to start implementation of:

- definitions/versioning;
- people/companies/relationships;
- company membership/functional roles;
- records and file metadata;
- retention/review-date calculation interfaces;
- profile projections;
- activity/audit;
- legal access grants;
- email-identity integration boundary;
- Governance capability surface;
- provider-neutral storage/scan interfaces;
- opaque object-key and checksum/inventory boundaries.

Production legal retention periods, POPIA notices/processing roles, hosting region, final identity-provider deployment and live storage/security configuration still require their respective approval/review gates.
