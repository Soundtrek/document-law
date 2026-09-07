# Team & Access V1 — 2026-09-07

Feature implementation and synthetic DEV acceptance: PASS. Phil's Company1
manual acceptance and approval: PENDING. Stop here; no main promotion.

Company Info Center links authorised managers to `/company/[companyId]/team`.
The page lists existing CompanyMembers, names, email, membership status and
current active role pills. Active members have a simple Manage access checklist
from the active database FunctionalRoleDefinition catalogue. Company membership
remains separate from employment relationships.

The existing `company.members.manage` capability governs both reads and writes.
Each transaction rechecks the authenticated verified account/session/provider,
active company/membership and unrevoked active capability. Employees, ordinary
non-manager members, Governance-only accounts and cross-company edits are denied.
OWNER can assign self HR but has no automatic record access. The last active
OWNER cannot be removed; serializable retries protect concurrent owner removals
and duplicate grant requests. Revocation preserves grant history. Grant/revoke
audit events use safe company/member/account/role identifiers and commit with
the grant changes. No access-view audit was added because ordinary company reads
do not currently record such events.

No migration, Keycloak configuration, Person or PersonCompanyRelationship change,
or document authorisation change. No upload or document handoff was performed.

Validation:

- Seven focused PostgreSQL tests cover all twelve requested acceptance areas,
  plus concurrent owner removals, duplicate grants, inactive/revoked authority,
  expired/wrong-provider sessions, invalid roles and CSRF/input validation.
  They passed against disposable `samma_team_test`, which was then removed.
- Affected web typecheck and lint passed; isolated production build passed.
- Actual HTTPS DEV browser checks passed with existing synthetic identities:
  OWNER opens team; HR self-grant saves and survives reload; HR appears in the
  member card; existing relationship Add record appears; revocation hides it.
  Last-OWNER rejection, employee/anonymous/foreign-target denial and origin/CSRF
  rejection passed. Synthetic account restored to OWNER-only.
- Live audit verification confirmed grant/revoke identifiers and retained history.
- Desktop 1440px and mobile 390px checks passed for overflow, usable role controls
  and Save clearance from the build overlay. Screenshots were visually inspected.
- Full suite, auth/storage/invitation regression suites: NOT RUN.

Initial feature acceptance ran on `9caf8b685ef7ec04e30b7cc74b31d6d130462c03`.
The browser assertion was corrected to allow the existing two Add record entry
points; this does not change application behavior. The follow-up test/report
commit is rebuilt and deployed from a clean exact-dev release. Compiled health
metadata is the source of truth for the final running SHA. Private build, browser,
audit and deployment evidence is retained under
`/srv/nuc-archive/juanity/validation/team-access-v1`.

Phil's remaining manual step: Company1 → Team & Access → Phil → Manage access →
select HR → Save, then return to the relationship and confirm Add record. His
Company1 membership remains OWNER-only pending this check. No automatic role
change was made to his account. Main remains outside this release.
