# Person ↔ Company introduction V1

Company Info Center → People → Add person → email → Send invite. Only current
active company members with `company.members.manage` can send, view pending
company invitations or revoke. OWNER obtains this capability through the existing
role catalogue. Employees connect through PersonCompanyRelationship; they do not
become company operators.

People register/sign in normally, verify their email through the existing provider
flow, and see Pending invitations in Personal Info Center. Accept/Decline use an
invitation ID, a session-bound HMAC CSRF header and exact same-origin POST. The
server rechecks the session, active/verified Account, recipient email and any
pinned Account ID. Accept also requires an active company and the inviter's current
capability. No auth continuation, token URL, or authentication changes are required.

Sending creates no Account, Person, membership, role or relationship. Existing
ACTIVE EMPLOYMENT relationships are reused, PENDING ones activate, and FORMER/ENDED
history is preserved while a new ACTIVE row is created. Acceptance and activity
are atomic. Same-account repeat acceptance returns the existing relationship ID,
including after offboarding, without reactivating it. Decline/revoke preserve the
invitation and never modify an accepted relationship.

Migration `0005_employment_invitations` adds one table, restrictive foreign keys,
lookup indexes, unique token hash and CHECK constraints for normalized email,
hash format, expiry order and mutually exclusive resolution/relationship fields.
No existing table columns change. Serializable transactions and company/email
advisory locks enforce one currently open invitation. A time-dependent unique
index using `now()` is not valid PostgreSQL; expired history stays untouched.
Person/company advisory locks and invitation row locks protect acceptance across
concurrent tabs and distinct invitations. Serialization failures retry at most
four times, including PostgreSQL adapter errors from explicit row locks.

App mail is behind `MailProvider`; SMTP delivery happens after commit. The raw
32-byte token is immediately hashed and discarded. Neither raw token nor hash
is sent to the browser/mail. Emails contain company name and instructions only.
If SMTP fails, the response states that the invitation exists but mail was not
delivered. It remains accessible in the Person inbox; revoke and re-invite to send
a fresh email. This V1 has no durable mail retry queue or delivery receipt tracking.

DEV Compose supplies `SAMMA_MAIL_DRIVER`, `SAMMA_SMTP_HOST`, `SAMMA_SMTP_PORT`,
`SAMMA_SMTP_SECURE`, `SAMMA_MAIL_FROM`, and
`SAMMA_EMPLOYMENT_INVITATION_TTL_HOURS=24`. DEV web joins the existing
`samma-mailpit-inbox` bridge. Mailpit publishes only its existing LAN UI port;
SMTP remains unpublished. Keycloak mail configuration and networks are unchanged.
The SMTP implementation uses patched Nodemailer via a package alias to keep it
independent from Auth.js's unused optional SMTP dependency.

Focused verification uses `infrastructure/employment/invitations.test.ts` against
only a disposable database named `samma_employment_test`, with an explicit matching
environment guard. Run through `run-checks.sh` from an isolated checkout. The
browser acceptance script uses a private manifest of synthetic `example.test`
people, actual DEV registration/verification/login, Mailpit, UI actions, negative
HTTP checks and desktop/mobile screenshots. `verify-live.ts` reads only those
manifest-bound live fixture rows. No broad auth/storage/legal suite is required.

Before DEV migration, use a private `pg_dump -Fc` and validate its archive list.
Review SQL, deploy the migration, then run Prisma migration status and live-schema
zero-diff from `packages/database` (the directory owning `prisma.config.ts`).
Build/deploy an isolated exact-dev commit through the existing DEV runtime wrapper.
Keep RC/main and experiment container identities unchanged. Stop for Phil after
live acceptance; this feature is not authorised for main promotion.
