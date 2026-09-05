# NUC development deployment authorization

The user authorized deploying the existing Soundtrek/document-law main branch
in `/opt/Juanita-Labour-Law` as a synthetic-only development/integration runtime
at `https://samma.co.za`.

Scope: the existing Next.js application plus dedicated PostgreSQL, development
identity enabled, memory storage, host web binding `127.0.0.1:2020`, private
database networking and web-only access to the existing Caddy proxy network.
No additional application services, production integrations or real data.

The resume instruction explicitly authorized resolving three inspection gaps:
minimal ownership correction on the project directory if needed; a first
`0001_initial_schema` migration generated faithfully from the existing schema,
applied to a new Juanity database and verified by an empty schema diff; and a
Juanity-only Caddy include targeting the app container on port 3000. It also
authorized a focused migration commit after validation, but no unrelated commit
content or push. The directory and clean checkout were already prepared when
this resumed execution began, so no ownership or clone operation was needed.

Required validation: Prisma generation/validation, tests, typecheck, lint and
production build within host resource limits; explicit Prisma/database
integration; local health and synthetic routes before Caddy; proxy backup and
validation before reload; public HTTPS/TLS and resource/blast-radius checks.

Stop on schema-changing migration workarounds, failed migration application,
unexplained schema drift, failed database integration, exposed database
networking, invalid Caddy configuration, disruption of other domains or external
DNS/TLS failure. Never broadly prune Docker or alter unrelated workloads.
