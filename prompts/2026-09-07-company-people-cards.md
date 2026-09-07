# SAMMA — Company People Cards

User request, captured 2026-09-07:

- Work and commit directly on `dev`; push and deploy that exact SHA to
  https://dev.samma.co.za. Do not touch or promote to `main`.
- Separate company-level Add person from relationship-level View person and
  Add record. Keep the company heading, owner/member context and People heading.
- Render a distinct minimal SAMMA card for each PersonCompanyRelationship,
  including current and former relationships. Prefer display name, then email;
  show email as the primary label when the name is absent. Show status/type.
- Use existing data; no profile fields or migrations, counts, charts, activity
  feeds or HR expansion. Use stable relationship-scoped navigation and scope
  Add record to the exact relationship. Do not use name/email route identifiers.
- ACTIVE may offer Add record only when authorised. PENDING/FORMER/ENDED must
  follow existing domain policy, without new permission semantics.
- Use stacked/nested cards with clear action separation; mobile single column,
  no dense table and no desktop/mobile overflow.
- Validate only affected UI/data/navigation, historical action visibility,
  targeted tests, affected typecheck/lint, and production build as needed.
  Full suite rerun: NO.
- Suggested commit: `feat: separate company people into relationship cards`.
- Final report: PASS/BLOCKED, UI, data, focused validation, commit/deployed SHA,
  and confirmation that main is unchanged.
