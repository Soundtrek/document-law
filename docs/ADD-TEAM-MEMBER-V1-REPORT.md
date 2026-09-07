# Add team member V1 — 2026-09-07

STATUS: PARTIAL — implementation and synthetic DEV acceptance PASS;
Phil's Company1 → hrtest@samma.co.za manual acceptance and approval PENDING.
Stop for Phil. No main promotion.

## Team invite

PASS: Team & Access has a company-level Add team member button, email form and
initial-role checklist from the active database catalogue. OWNER selection also
requires a current OWNER grant. Pending invitations show email, roles, expiry
and Revoke. Sending creates invitation/role-intent rows only; access begins on
acceptance. SMTP delivery uses the existing MailProvider and DEV Mailpit.

## Recipient and membership

PASS: existing verified Accounts are pinned when invited. Unknown addresses
create no Account/Person. Normal registration, Mailpit verification and fresh
sign-in discover the separate Company access invitations section in Personal
Info Center. Accept and Decline use authenticated, session-CSRF-protected IDs.
Employment invitations have a distinct section.

Acceptance transactionally creates ACTIVE CompanyMember, grants intended active
roles, binds the recipient, resolves the invitation and writes ActivityEvent
records. It never creates PersonCompanyRelationship or EmploymentInvitation.
The existing role matrix provides HR Add record access without a special case.
Existing active memberships are reused; historical memberships retain their IDs
and audit attribution, revoke leftover privileges and reactivate with only the
newly selected grants. Retry cannot revive removed membership or revoked roles.

## Security

PASS: active verified session/account/provider, active company/membership,
current unrevoked management capability, tenant scope, normalized email and
pinned Account binding. Acceptance rechecks inviter authority and active roles;
OWNER selection is rechecked too. Expired, revoked and declined invitations
cannot accept, and accepted invitations cannot revoke. Concurrent sends and
accepts deduplicate through serializable transactions, locks and the existing
unique membership constraint. Last-OWNER protection remains intact.

Generate 32 random bytes and store only SHA-256. No bearer-token link, auto-login,
email-only Account merge, mail payload or token in application logs/audit.
Database checks enforce normalized email, hash shape, expiry, mutually exclusive
resolution and accepted/member-link consistency. Expired/resolved history stays.

## Database and validation

- Reviewed additive migration `0006_company_team_invitations`: two new tables,
  indexes, foreign keys and checks. EmploymentInvitation and
  PersonCompanyRelationship schema/data paths were not modified.
- Before DEV migration, custom-format SAMMA database backup was saved under
  `/srv/nuc-archive/juanity/backups/add-team-member-v1/`, with readable archive
  contents and SHA-256 manifest. This is an on-host DEV checkpoint.
- Prisma generate/validate: PASS. Disposable and DEV migration status: PASS.
  Disposable and DEV datasource/schema zero-diff: PASS (six migrations).
- 18 focused team-invitation PostgreSQL tests: PASS, followed by seven existing
  Team & Access tests: PASS. Disposable database: `samma_team_test`.
- Affected database/web typecheck, web lint and isolated production build: PASS.
- Full suite rerun: NO.

## Actual HTTPS DEV acceptance

PASS on feature SHA `ad26a67c64dcf73dc95fe5db073a3cd5f77a21a5`, using the existing
synthetic company and synthetic identities, plus a new team-only user created
through ordinary registration. No owner session was manufactured or borrowed.

Verified app invitation and provider verification delivery in Mailpit, existing
and new recipient inbox/acceptance, ACTIVE membership and HR pills, existing HR
Add record page, no new employment relationship, no new operator in People,
decline/revoke, denial after resolution, wrong recipient/non-manager/foreign
company and Origin/CSRF rejection. Live database checks confirmed stable Account
binding, membership/grants and safe audit events. No file was uploaded.

Desktop 1440px and mobile 390px layouts were checked for horizontal overflow;
form/inbox/member and Add record screenshots were inspected. The synthetic
company retains its test HR members and invitation audit history. Phil's
Company1 roles, membership and hrtest address were not changed by this run.

Feature and acceptance/report commits are made directly on dev as expressly
requested. The final report/browser-check commit is rebuilt and deployed from
its own clean exact-dev release; `/api/health` compiled metadata identifies the
running SHA. Private evidence, build/deployment logs and final health snapshot:
`/srv/nuc-archive/juanity/validation/add-team-member-v1/`.

## Remaining Phil check

Company1 → Team & Access → Add team member → hrtest@samma.co.za → HR → Send invite.
Use Mailpit, register/verify/sign in if needed, then accept in Personal Info
Center. Confirm ACTIVE/HR in Team, HR-only Add record access, and no entry in
Company1 People unless separately connected through Add person.

This specific Company1 owner-login walkthrough and Phil's approval remain
pending. Main and the RC web runtime are unchanged. STOPPED FOR PHIL APPROVAL.
