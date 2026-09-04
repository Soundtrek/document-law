# Juanity Law — AI / Codex Working Rules

This file governs AI-assisted work in this repository.

## 1. Product boundary

Juanity Law is a new application. Do not couple it to another product runtime, schema, authentication system, database or package model.

External projects may be used only as design learning unless an explicit extraction/reuse decision is approved.

## 2. Current product model

The approved framework foundation is:

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

- People have independent accounts and are expected to sign up/use the core person experience for free.
- Companies are the primary paid tenants/workspaces.
- The relationship is the controlled bridge for employment context, requests, actions, later records/documents and audit.
- Ending a relationship must not delete or transfer ownership of the person's account.
- A generic legal `Matter` is not a mandatory v1 root entity. Add it only if an approved workflow requires it.

Do not silently revert the application to a matter-first architecture.

## 3. Configurable policy direction

Juanity Platform Admin defines approved record/request/workflow policy rather than hard-coding every employment/legal record type.

Business configuration may include:

- record/request definition name/category;
- person/company/relationship context;
- direction/audience;
- working classification;
- allowed functional roles;
- acknowledgement/Needs Action behaviour;
- notification policy;
- approved retention-policy reference once available;
- active/inactive state.

Definitions must be **versioned**. Do not mutate old definition rows/objects in a way that silently changes historic policy.

System security invariants are not ordinary admin settings and must remain enforced in code/policy.

See `docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`.

## 4. Company membership and roles

Company membership is separate from functional access.

The architecture must support one member holding multiple approved functional roles and multiple members sharing the same role.

Working role concepts include:

- `OWNER` — governance/member-role administration;
- `HR`;
- `PAYROLL`;
- `CLERK` / records;
- `LEGAL`;
- `MANAGER`;
- `BILLING`.

Do not freeze these as the final role catalogue if Juanity Platform Admin is intended to manage approved role definitions/capabilities.

Important:

- `OWNER` may invite/remove company staff and assign/revoke approved roles;
- `OWNER` may assign functional roles to themselves;
- `OWNER` is not an automatic universal sensitive-record bypass;
- a one-person company may have one user with Owner + HR + Payroll + Clerk + other required roles;
- role/membership changes must be audited;
- disabling/removing a company member must revoke active company access.

## 5. Document architecture freeze

The **final document/record storage engine is not yet designed or approved**.

Until that discussion is complete, do not:

- invent a final binary/document schema;
- implement final retention execution rules;
- choose a signing provider;
- implement final external legal/employment sharing semantics;
- assume that uploader, person, company, technical owner and legal owner are the same concept;
- implement blanket company access to a person's private document store;
- let a definition edit silently rewrite historic record policy.

Neutral interfaces/placeholders and the approved configurable definition framework are allowed where needed to keep surrounding application architecture clean.

The future design must explicitly address personal records, company records and relationship-context employment/legal records, plus how record instances bind to definition versions.

## 6. Build style

Prefer a modular monolith first.

- TypeScript-first.
- Keep domain logic out of React components.
- Keep infrastructure behind adapters.
- Keep billing gateways behind adapters.
- Keep identity behind an OIDC/session boundary.
- Keep storage behind an object-storage interface.
- Treat permissions, company membership/role grants, classification, definitions and audit/activity as first-class domain capabilities.

Do not introduce microservices, Kubernetes, Elasticsearch, event streaming or other infrastructure without a demonstrated requirement.

## 7. No hard-coded owner/business values

Product-controlled values belong in configuration/admin data where practical. System invariants may remain in code.

Examples of product-controlled values:

- prices;
- subscription limits;
- entitlement values;
- user-facing notices;
- branding values;
- approved role/capability policy;
- record/request/workflow definitions;
- expiry/retention policies where business-configurable and legally approved.

The current commercial direction is free person accounts and paid company workspaces. Do not invent final packages/prices.

No-hardcoding does **not** mean every security invariant becomes configurable.

## 8. Security and privacy invariants

Juanity Law is expected to carry sensitive employment/legal information.

Never bypass company/tenant, relationship and resource authorisation for convenience.

Do not expose storage buckets publicly.

Do not trust client-provided company, relationship, role, definition, classification, entitlement or ownership fields.

Company membership, Company Owner or generic company `admin` must not automatically grant universal access to sensitive person/employee records.

All privileged actions must be server-authorised and produce an auditable event where relevant.

Secrets never belong in Git.

Do not place real employee/client sensitive data in source, fixtures, screenshots or tests. Use synthetic data.

Do not log salary, banking details, ID values, disciplinary/legal narrative, document contents or other unnecessary personal information.

The architecture should support a POPIA-aware operating model, but do not claim technical implementation alone equals legal compliance.

## 9. Person independence and offboarding

A person's account is independent from a company relationship.

Do not implement offboarding as `delete employee`.

Preferred framework behaviour:

```text
Relationship ACTIVE
      ↓
Relationship ENDED / FORMER
      ↓
Active relationship access revoked
Person account remains
Historical/audit context preserved according to policy
```

Company-member removal is separate:

```text
CompanyMember ACTIVE
      ↓
DISABLED / REMOVED
      ↓
Company capabilities revoked
Historical attribution/audit remains
```

Final retention and former-employee document access remain part of the document/data-governance design gate.

## 10. Requests before blanket access

Where a company needs information from a person, prefer explicit request/action workflows instead of broad access to the person's private information store.

Do not create convenience access that defeats data minimisation or relationship scoping.

## 11. 3-click / 10-second rule

Frequent routine actions should normally be reachable from the relevant context in no more than **three deliberate clicks/taps** and be completable in **about ten seconds**, excluding substantial typing, file selection/upload, reading legal content or required security steps.

Examples:

- Relationship → Request → request type → Send
- Relationship → Add record → definition/file → Send
- Needs Action → Provide → existing/upload → Submit
- Company Members → Invite → member + roles → Send

Achieve this with contextual actions and smart defaults from approved definitions.

Do not remove required authorisation, security challenges or meaningful legal acknowledgements merely to satisfy the interaction target.

Advanced Juanity Platform Admin configuration is not required to fit the 3-click rule.

## 12. Development environment constraint

The existing NUC is not a Juanity Law runtime target.

Build code and lightweight tests without provisioning the full stack where possible. Real integration of identity, persistent object storage, outbound mail, payment webhooks, HTTPS, external sharing and disaster recovery belongs on the dedicated Law development VM.

## 13. Validation discipline

Use focused validation proportional to the change.

Default loop:

1. inspect only the affected area;
2. implement the smallest coherent change;
3. run targeted type/lint/unit/integration checks;
4. broaden testing only when blast radius justifies it;
5. report exact files changed and validation performed.

Avoid expensive repository-wide scans or repeated exhaustive checking unless the change requires it.

Security-sensitive domain changes must include relevant negative access tests, not only happy paths.

For multi-role/definition changes, test at minimum:

- owner without functional role does not receive role-specific sensitive access;
- one user with multiple roles receives the intended combined capabilities;
- role revocation removes capability;
- disabled membership removes company access;
- definition version changes do not silently rewrite old policy.

## 14. Approval gates

Do not silently expand scope.

Material decisions requiring owner approval include:

- final document/record storage-engine design;
- production identity provider configuration;
- payment provider selection/production wiring;
- data retention/destruction/legal-hold policy;
- encryption/key-management architecture;
- external sharing/access model;
- sensitive company role/capability policy beyond approved framework directions;
- production hosting region/provider;
- responsible-party/operator assumptions;
- legal notice/consent/privacy wording;
- major dependency or framework replacement.

## 15. UI direction

The application uses a light, calm, information-first Info Center pattern.

There are three primary design contexts:

- Person Info Center;
- Company Info Center/workspace;
- restricted Juanity Platform Admin.

Use:

- constrained readable person page width;
- clear heading and status hierarchy;
- cards for meaningful groups, not decorative nesting;
- pill/tabs for compact workflow navigation and status;
- visible action-required states;
- clear relationship state such as Active/Former;
- clear company member/functional role presentation;
- contextual high-frequency actions on relationship pages;
- careful presentation/masking of sensitive information;
- responsive desktop/tablet/mobile behaviour;
- no mandatory dark mode in the initial product.

See `docs/UI-DESIGN-SYSTEM.md`.

## 16. Prompt and decision capture

Significant implementation prompts and accepted decisions must be added to the repository using `prompts/PROMPT-CAPTURE.md` and `docs/DECISION-LOG.md`.

The repository should preserve *why* a system was built, not only the resulting code.
