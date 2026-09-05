# Disaster Recovery Plan

## Purpose

This plan defines how SAMMA should recover from infrastructure failure, data corruption, accidental deletion, compromised deployment, storage loss or loss of the primary host.

SAMMA is expected to carry sensitive personal, employment and legal information. Recovery must therefore restore **confidentiality, integrity and access control**, not merely make containers start again.

It is a framework plan and must be refined once the production hosting provider, document storage architecture, data-retention obligations, POPIA/privacy operating requirements and encryption/key-management decisions are approved.

## Recovery objectives

Initial planning targets:

| System | Target RPO | Target RTO |
|---|---:|---:|
| PostgreSQL business data | 15 minutes or better once production-grade backups are enabled | 4 hours |
| Object/document storage | 1 hour or better; preferably versioned/continuous at provider level | 8 hours |
| Application code/config | effectively 0 through Git + image/config versioning | 2 hours |
| Identity configuration | 24 hours or better | 4 hours |
| Payment configuration/reference data | 15 minutes with database backup; provider remains source for settlement records | 4 hours |

These are engineering targets, not contractual SLAs.

## What must be recoverable

### Source and build state

- Git repository;
- release tag/commit SHA;
- dependency lockfiles;
- Dockerfiles;
- Compose/deployment definitions;
- database migrations;
- infrastructure configuration excluding secrets.

### Database

- PostgreSQL schema;
- people/accounts mapping;
- companies and company-user memberships;
- person/company relationships and relationship status/history;
- requests/actions;
- activity/audit data;
- billing/subscription/entitlement records;
- data-classification/security metadata;
- later document metadata.

### File/object data

Once the document engine exists:

- accepted document objects;
- versions where approved policy requires them;
- generated artefacts that are not reproducible;
- any integrity metadata needed to verify restored objects;
- relationship/access metadata required to prevent documents from being restored without their security context.

### Identity

- realm/tenant/client configuration;
- role mappings where identity-provider-owned;
- MFA/security policy configuration;
- recovery/admin procedures.

### Secrets

Secrets are **not** stored in the repository backup. Maintain a separate secured recovery mechanism for:

- database credentials;
- OIDC client secrets;
- storage credentials;
- SMTP credentials;
- payment gateway keys;
- backup encryption keys;
- signing/encryption keys introduced later.

## Backup architecture

Use the 3-2-1 principle as the baseline:

- at least 3 copies of critical data;
- on at least 2 storage/media systems or failure domains;
- at least 1 copy off the primary host/provider failure domain.

Backups containing sensitive personal/employment/legal information require confidentiality protection equivalent to their risk. A backup is not exempt from the security model simply because it is offline or secondary.

### PostgreSQL

Development VM baseline:

- daily logical backup;
- backup before risky migrations;
- encrypted off-host copy;
- retention of multiple restore points.

Production target:

- provider/native snapshots where available;
- continuous/WAL or sufficiently frequent incremental strategy to reach the RPO target;
- daily independent logical export for portability;
- encrypted off-provider copy where practical.

### Object storage

Production target:

- provider versioning/object protection where appropriate;
- replication or scheduled backup to a separate failure domain;
- regular inventory comparing database references and stored objects;
- documented recovery of both metadata and binary objects;
- restoration procedures that preserve private access controls and do not expose restored objects through public buckets or temporary broad permissions.

Do not assume RAID, VM snapshots or object-store versioning alone constitutes a complete backup strategy.

### Identity configuration

Export/backup identity-provider configuration after meaningful changes and before upgrades.

### Application deployments

Every production deployment must be traceable to:

- Git commit;
- container image tag/digest where images are used;
- database migration state;
- deployment/config version.

## Backup retention proposal

Initial operational proposal, subject to legal/data-retention approval:

- hourly/continuous recovery points: 24–48 hours where supported;
- daily backups: 30 days;
- weekly backups: 12 weeks;
- monthly backups: 12 months.

**Important:** backup retention must later align with approved retention/destruction obligations. A deleted or expired employment/legal record must not remain indefinitely in backup archives simply because engineering chose long retention.

The document/data-governance design must define how deletion/retention requests interact with immutable or historical recovery points.

## Recovery scenarios

### Scenario A — Bad deployment, database unaffected

1. Stop further rollout.
2. Record current release/image/migration state.
3. Roll back application image/code to last known good release if schema-compatible.
4. Validate health, login, company isolation, relationship permissions and key workflows.
5. If the release included a schema change, follow the migration-specific recovery decision; do not blindly down-migrate production data.
6. Preserve logs and incident notes.

### Scenario B — Database corruption or destructive data change

1. Stop writes if ongoing writes could worsen the incident.
2. Preserve a copy/snapshot of the damaged state for investigation.
3. Determine required recovery point.
4. Restore PostgreSQL into an isolated recovery instance first.
5. Run integrity/application/security checks.
6. Verify people, companies and relationships have not been cross-linked incorrectly.
7. Reconcile any external events after the recovery point, especially payment-provider records.
8. Promote restored database only after validation.
9. Document data loss window relative to RPO.

### Scenario C — Primary VM lost

1. Provision replacement Law VM from documented infrastructure requirements.
2. Install/runtime bootstrap from version-controlled configuration.
3. Restore secrets from secured recovery store.
4. Restore database.
5. Restore/connect object storage.
6. Restore identity configuration or reconnect identity service.
7. Deploy last known good application image/commit.
8. Apply required migrations only after restored database version is confirmed.
9. Configure Caddy/TLS/DNS as required.
10. Validate end-to-end access before reopening service.
11. Specifically test company isolation, relationship scoping and privileged-role restrictions before accepting sensitive traffic.

### Scenario D — Object/document storage loss

1. Prevent new writes to the affected storage path.
2. Preserve inventory/logs of the incident.
3. Restore object storage into an isolated target or replacement bucket.
4. Compare object keys/checksums against database metadata/inventory.
5. Identify missing or inconsistent objects.
6. Verify restored objects remain private.
7. Verify database-level person/company/relationship access still controls every restored object.
8. Reconnect application only after access controls and integrity are validated.

Final checksum/version/access semantics will be defined with the document engine.

### Scenario E — Credential compromise

1. Revoke/rotate affected credentials immediately.
2. Preserve relevant logs.
3. Review identity, company-role, relationship, access and audit events.
4. Determine whether sensitive information may have been viewed/downloaded/exported.
5. Rotate downstream credentials if lateral exposure is plausible.
6. Redeploy/restart services that cached compromised secrets.
7. Validate no unauthorised identity, permission, billing or data changes remain.
8. Initiate the approved security/privacy incident process where personal information may have been affected.

### Scenario F — Ransomware or hostile host compromise

1. Isolate the affected host; do not rely on it for clean recovery.
2. Preserve forensic evidence where appropriate.
3. Rotate credentials reachable from the host.
4. Provision a clean replacement environment.
5. Restore only from recovery points believed to pre-date compromise.
6. Validate application images/configuration against trusted Git/release references.
7. Validate restored permission/audit state before reopening.
8. Perform deeper security and privacy incident validation before reopening.

### Scenario G — Incorrect permission or relationship exposure

This scenario covers software/configuration mistakes that expose one person's or company's information to the wrong party even though infrastructure remains healthy.

1. Disable/contain the affected feature or access path.
2. Preserve logs, relevant database state and deployment version.
3. Identify affected companies, people, relationships and resources.
4. Determine whether information was merely accessible or actually viewed/downloaded/exported.
5. Correct the authorisation/configuration defect.
6. Test negative access paths before re-enabling.
7. Invoke the approved privacy/security incident process where required.
8. Record corrective architecture/test changes.

## Restore validation checklist

A restore is not successful merely because containers start.

Validate:

- database migration state;
- people/accounts;
- companies and company-user membership;
- person/company relationship integrity;
- company/tenant isolation;
- relationship access rules;
- ended/former relationship state;
- request/action state;
- audit/activity history;
- role/capability restrictions;
- billing/entitlement state;
- identity login/logout;
- privileged admin access;
- sensitive-data classification metadata;
- object access/integrity once documents exist;
- email/payment webhook connectivity where applicable;
- TLS/domain configuration;
- backup jobs after recovery.

## Security/privacy incident distinction

Disaster recovery and privacy/security incident response overlap but are not interchangeable.

A system may be fully available while a confidentiality incident is underway, and restoring service must not destroy evidence needed to understand exposure.

The production runbook must define escalation, decision-making and notification responsibilities under the approved POPIA/privacy operating model.

## Recovery documentation bundle

The repository should eventually include:

- infrastructure inventory;
- environment-variable/secrets inventory containing names, not secret values;
- DNS/domain inventory;
- backup job definitions;
- current restore commands/runbook;
- dependency on external providers/sub-processors;
- release/deployment procedure;
- emergency access procedure;
- security/privacy incident escalation procedure;
- data classification and approved retention references.

## Testing schedule

Development stage:

- restore test after backup automation is introduced;
- restore test before any major persistence/storage redesign;
- permission/isolation verification after representative restores.

Production stage target:

- automated backup success monitoring continuously;
- quarterly partial restore test;
- at least annual full disaster recovery rehearsal;
- additional rehearsal after major infrastructure or storage changes;
- periodic security/privacy incident tabletop exercise once operating roles are established.

## Ownership and incident log

Every recovery exercise or real incident should capture:

- incident start/end time;
- detected cause;
- affected systems;
- affected companies/people where applicable;
- chosen recovery point;
- actual RPO/data-loss window;
- actual RTO;
- validation performed;
- known/possible confidentiality impact;
- follow-up actions;
- architectural/doc changes required.

## Current constraint

The existing NUC must not be treated as either the primary Law runtime or the only backup destination. SAMMA recovery must remain independent of that machine.
