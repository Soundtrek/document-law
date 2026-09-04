# Juanity Law — AI / Codex Working Rules

This file governs AI-assisted work in this repository.

## 1. Product boundary

Juanity Law is a new application and **document knowledge system**. Do not couple it to another product runtime, schema, authentication system, database or package model.

External projects may be used only as design learning unless an explicit extraction/reuse decision is approved.

## 2. Approved product model

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

- People have independent accounts and are expected to use the core person experience for free.
- Companies are the primary paid tenants/workspaces.
- The relationship is the controlled bridge for employment context, requests, records/documents and audit.
- Ending a relationship must not delete or transfer the person's account.
- A generic legal `Matter` is not a mandatory v1 root entity.

Do not silently revert to a matter-first architecture.

## 3. Approved Document Knowledge Engine V1

The v1 engine is approved for implementation. See `docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md`.

Use the model:

```text
RecordDefinitionVersion
  ↓
Record
  ↓
RecordFile
  ↓
Person / Company / Relationship context
  ↓
Retention / review knowledge
  ↓
Access / activity / audit
```

Important rules:

- record types are configuration-driven through Juanity Governance;
- definitions are versioned;
- historic records must not silently inherit changed policy;
- retention and review/renewal are separate concepts;
- company users see only records authorised for their relationship/context/functional roles;
- people see records made available in their own profile/relationship context;
- company access never exposes unrelated private person records;
- binary files live behind private object storage, not in PostgreSQL by default;
- upload acceptance includes validation/quarantine/malware-scan/checksum when real storage is integrated.

Do not expand v1 into a full HR suite, payroll calculator, case-management platform, e-signature platform or AI legal-advice engine without approval.

## 4. Configurable policy direction

Juanity Governance defines approved record/request/workflow policy instead of hard-coding every employment/legal record type.

Business configuration may include:

- record/request definition name/category;
- Person / Company / Relationship context;
- direction/audience;
- working classification;
- allowed functional roles;
- person visibility;
- acknowledgement / Needs Action behaviour;
- notification policy;
- retention-policy reference;
- review/renewal interval;
- active/inactive state.

Definitions must be versioned. System security invariants are not ordinary Governance settings and remain enforced in code/policy.

See `docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`.

## 5. Company membership and roles

Company membership is separate from functional access.

The architecture supports one member holding multiple approved functional roles and multiple members sharing the same role.

Working role concepts include:

- `OWNER` — governance/member-role administration;
- `HR`;
- `PAYROLL`;
- `CLERK` / records;
- `LEGAL`;
- `MANAGER`;
- `BILLING`.

Important:

- `OWNER` may invite/remove company staff and assign/revoke approved roles;
- `OWNER` may assign functional roles to themselves;
- `OWNER` is not an automatic universal sensitive-record bypass;
- a one-person company may have one user with Owner + HR + Payroll + Clerk + other required roles;
- role/membership changes are audited;
- disabling/removing a company member revokes active company access.

## 6. External legal access

Lawyers/legal professionals use explicit `LegalAccessGrant`-style access rather than becoming company members by default.

A grant is scoped to a Person ↔ Company relationship and approved records/categories/definitions.

Default direction:

- view-only unless policy grants more;
- explicit expiry;
- revocable;
- auditable;
- may represent the Company or the Person;
- no unrelated company or personal-profile access.

## 7. Email identity from the start

Email address is the primary login/sign-up identifier.

There is no separate normal-user username requirement.

Identity remains behind an OIDC-compatible provider boundary. The application must not implement password cryptography itself.

Architecture requirements:

- verified email before sensitive workspace access;
- email-based invitations;
- secure account recovery;
- MFA capability from day one;
- MFA required for Juanity Governance before production;
- Company Owner, HR, Payroll and Legal should default to MFA-required production policy unless explicitly approved otherwise;
- privilege revocation must support active-session/access invalidation.

See `docs/AUTHENTICATION-AND-GOVERNANCE.md`.

## 8. Governance, not `/admin`

Do not create a generic `/admin` product route.

The Juanity-only privileged control surface is **Governance**, initially `/governance`.

Company team/access management remains inside the company workspace.

The route name is not a security control. Governance requests require:

- verified authenticated actor;
- Governance capability;
- MFA in production;
- server-side deny-by-default authorisation;
- audit.

Avoid one ordinary universal `SUPERADMIN` operating model. Use specific Governance capabilities/roles. Any future break-glass access requires separate explicit design.

## 9. Build style

Prefer a modular monolith first.

- TypeScript-first.
- Keep domain logic out of React components.
- Keep infrastructure behind adapters.
- Keep billing gateways behind adapters.
- Keep identity behind an OIDC/session boundary.
- Keep storage behind an object-storage interface.
- Treat permissions, company membership/role grants, definitions, legal grants, classification and audit/activity as first-class domain capabilities.

Do not introduce microservices, Kubernetes, Elasticsearch, event streaming or similar infrastructure without demonstrated need.

## 10. No hard-coded business values

Product-controlled values belong in Governance/configuration data where practical. System invariants may remain in code.

Examples of configurable values:

- prices and subscription limits;
- entitlement values;
- user-facing notices;
- branding values;
- approved role/capability policy;
- record/request/workflow definitions;
- retention/review policies where approved;
- notification policy.

No-hardcoding does **not** mean every security invariant becomes configurable.

## 11. Security and privacy invariants

Juanity Law is expected to carry sensitive employment/legal information.

Never bypass company/tenant, relationship, legal-grant and resource authorisation for convenience.

Do not expose storage buckets publicly.

Do not trust client-provided company, relationship, role, definition, classification, entitlement, Governance or ownership fields.

Company membership, Company Owner or generic company `admin` must not automatically grant universal access to sensitive person/employee records.

All privileged actions must be server-authorised and auditable where relevant.

Secrets never belong in Git.

Do not place real employee/client sensitive data in source, fixtures, screenshots or tests. Use synthetic data.

Do not log salary, banking details, ID values, disciplinary/legal narrative, document contents or other unnecessary personal information.

The architecture should support a POPIA-aware operating model, but do not claim technical implementation alone equals legal compliance.

## 12. Person independence and offboarding

A person's account is independent from a company relationship.

Do not implement offboarding as `delete employee`.

```text
Relationship ACTIVE
      ↓
Relationship ENDED / FORMER
      ↓
Active relationship access revoked
Person account remains
Historical/audit context preserved according to policy
```

Company-member removal is separate and revokes company capabilities while preserving historical attribution/audit.

## 13. 3-click / 10-second rule

Frequent routine actions should normally be reachable from relevant context in no more than **three deliberate clicks/taps** and be completable in **about ten seconds**, excluding substantial typing, file selection/upload, reading legal content or required security steps.

Examples:

- Employee → Add record → definition/file → Save
- Relationship → Request → request type → Send
- Company Members → Invite → member + roles → Send
- Relationship → Grant Legal Access → recipient/scope/expiry → Send

Use contextual actions and smart defaults rather than removing security controls.

## 14. Development environment constraint

The existing NUC is not a Juanity Law runtime target.

Build the codebase, domain model, UI and lightweight tests before the dedicated VM where this does not compromise production-critical boundaries. Real persistent object storage, malware scanning, production-style OIDC/MFA, outbound mail, payment webhooks, HTTPS, external-access testing, backup automation and disaster recovery belong on the dedicated Law development VM.

## 15. Validation discipline

Use focused validation proportional to the change.

Default loop:

1. inspect the affected area;
2. implement the smallest coherent change;
3. run targeted type/lint/unit/integration checks;
4. broaden testing only when blast radius justifies it;
5. report exact files changed and validation performed.

Security-sensitive changes require negative access tests.

For roles/definitions/records test at minimum:

- owner without functional role does not receive role-specific sensitive access;
- multi-role users receive only the intended combined capabilities;
- role revocation removes capability;
- disabled membership removes company access;
- definition version changes do not rewrite old record policy;
- Company A cannot access Company B records;
- Person A cannot access Person B records;
- legal grant cannot exceed its relationship/scope/expiry;
- Governance access cannot be reached by normal company roles.

## 16. Approval gates that remain

Do not silently expand scope around:

- production identity-provider deployment/configuration;
- payment provider selection/production wiring;
- approved legal retention/destruction/legal-hold policy values;
- encryption/key-management architecture;
- production hosting region/provider;
- responsible-party/operator assumptions;
- legal notice/consent/privacy wording;
- e-signature/redaction/OCR additions;
- major dependency/framework replacement.

## 17. UI direction

Primary experiences:

- Person Info Center;
- Company Info Center/workspace;
- restricted Legal Access view;
- restricted Juanity Governance.

Use light, information-first surfaces, visible Needs Action states, contextual actions, clear role/access presentation, responsive layouts and careful sensitive-data handling. Dark mode is not an initial requirement.

## 18. Prompt and decision capture

Significant implementation prompts and accepted decisions must be added to `prompts/` and `docs/DECISION-LOG.md`.

The repository should preserve *why* the system was built, not only the resulting code.
