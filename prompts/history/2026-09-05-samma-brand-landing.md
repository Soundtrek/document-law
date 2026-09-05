# SAMMA brand rename and public landing page

Date: 2026-09-05. User-authorized two-phase implementation.

Juanity was the former development name. Phase A audits every occurrence,
renames current public branding, safe internal branding and owned environment
settings, preserves active infrastructure and database identifiers, validates
and commits separately. Phase B replaces `/` with a restrained SAMMA email
entry page, keeps internal routes and synthetic identity, validates responsive
behavior and commits separately. Deploy only after both phases pass.

Use the descriptor Employment Records & Document Management and the supplied
copy: “Keep your employment records securely organised and connected to the
companies you work with.” Heading: “Sign in to SAMMA”; email placeholder:
“name@example.com”; action: “Continue with email”. Supporting copy: “New to
SAMMA? Your account is created when you first verify your email.” Privacy, Terms
and Help can be disabled placeholders. No fake legal pages or email-sent claims.

Preserve the document engine, access control, Person ↔
PersonCompanyRelationship ↔ Company model, schema, migrations and data. No
infrastructure redesign, new services or unrelated workload changes.
