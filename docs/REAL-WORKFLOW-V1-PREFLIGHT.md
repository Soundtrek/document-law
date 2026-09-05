# Real user and company workflow V1 preflight

Baseline: `0bc1660f03b8380aedcf24a44881f4196e5eb4de`. Inspection completed before implementation on 2026-09-05.

| Area | State | Evidence and required work |
| --- | --- | --- |
| Auth | ORANGE | Auth.js validates Keycloak PKCE/state/nonce; DB sessions resolve stable AccountIdentity subjects. Only prelinked identities currently sign in. Add verified-subject onboarding for a NEW account only; email collisions fail closed for explicit operator review. No provider changes or email merges. |
| Account / Person | YELLOW | Person.accountId is unique. Existing bootstrap creates Person; normal session needs idempotent missing-Person onboarding with audit. |
| Redirect | GREEN | Sign-in forms already target /person; fixed same-origin allowlist. |
| Personal Info Center | YELLOW | DB-backed Person, relationships, policy-visible records already exist; add empty states, company memberships, creation and invitation acceptance. |
| Company | YELLOW | DB-backed memberships and records, but no create action or selected company. Add atomic Company + ACTIVE membership + normal OWNER grant + audit. Use authorised URL company context, no new preference field. |
| Roles / Team | ORANGE | Role/grant tables and approved capability matrix exist; deployed catalogue is empty. Install missing approved DEV catalogue through an audited Governance operator seed, never runtime fixtures. Team invite route currently denies; add distinct membership invitations, role assignment/revocation and member removal. OWNER manages membership and can explicitly assign self HR; no record bypass. |
| Relationship | ORANGE | PENDING/ACTIVE/FORMER/ENDED and history exist. No invite model or creation service; no unique live relationship constraint. Serialize lifecycle mutations on the company row, reuse pending/active relationships and preserve former/ended rows. |
| Invitations / SMTP | ORANGE | No SMTP adapter or invitation persistence. Add one invitation table and enums, hash-only random expiring tokens, intended Account binding where known, acceptance bound to authenticated verified Account/email. DEV manual links only; no mail sent. Unknown addresses never create fake accounts. |
| Employee profile | YELLOW | /company/people/alex and its actions authenticate then 404. Add stable relationship-ID profile with company capability checks and record-level filtering. |
| Records | GREEN / YELLOW | Active version selection, context/role checks, immutable definition linkage, review/retention and personVisible already implemented. Improve navigation and no-definition state. Boolean personVisible is authoritative; no acknowledgement mechanism invented. |
| Storage | GREEN | Current S3 adapter -> Garage, staged intake, SHA-256, immutable opaque keys, NOT_SCANNED_DEV, transactional Record/RecordFile and compensation handling already proven. Reuse without second upload implementation. |
| Downloads | GREEN | Session + record policy + Legal Access download grant + metadata/checksum validation before stream. Add multi-company browser regression. |
| Audit | YELLOW | Login/Governance/record upload/download already audited. Add Person/company/member/role/invitation/relationship lifecycle events transactionally, without emails or tokens in summaries. |
| UI / synthetic paths | YELLOW | Normal person/company/legal/governance/record reads are DB-backed; stale demo forms remain unused and legacy URLs deny. Remove unused fake forms and stable-name URLs. Keep domain fixtures isolated to tests/operator seeds. |
| Database | ORANGE | Three applied migrations; deployed role/definition/relationship tables empty. Add CompanyInvitation with kind, normalized email, optional intended/accepted Account, inviter, company, optional relationship, role IDs, unique company/email/kind, token hash, expiry, accepted/revoked times. FKs preserve attribution. No existing fields/data converted. |
| Runtime | GREEN | App/DB/Garage healthy. USB 186 GiB available; RAM ~8 GiB available, swap occupied. Use isolated USB worktree and bounded build/candidate; leave unrelated workloads untouched. |
| Governance / Legal | GREEN | Explicit capabilities, DEV MFA exception, scoped legal grants retained. Company creation neither requires nor grants platform capabilities. |

No RED finding. Proceed with YELLOW/ORANGE work under the supplied authorization.

## Consolidated migration proposal and review

One additive migration creates invitation enums/table, its indexes and restrict-delete foreign keys. No new Account identity, selected-company, record, storage or legal policy columns. One invitation per company/email/kind is idempotent; accepted invitations stay immutable. Explicit refresh of an expired pending invitation rotates the token; audit preserves refresh history. Revocation closes invitations. Rehire can create a new relationship after historical offboarding without rewriting history; re-invitation after completed lifecycle is outside this initial invitation UI.

Review generated SQL; take a private pg_dump before deploy; migrate deploy; check status and Prisma schema diff. Production data is not reset. DEV seeds only insert absent configuration after platform capability verification; no legal retention/destruction values.

## Compensations

Manual delivery is visibly DEV-only. Keycloak self-registration remains disabled; operators provision disposable DEV identities for browser proof, with no provider configuration changes. First successful verified OIDC login can now onboard the new stable Account safely, but an existing-email/new-subject collision must receive explicit identity-link review. OWNER must explicitly assign an approved record role in Team & Access before uploading HR-restricted records.
