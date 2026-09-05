# Code We Can Build Before a Dedicated Law VM

## Objective

Build as much of SAMMA as possible from the GitHub repository before a dedicated Law VM is required, while preserving production-grade boundaries.

The Document Knowledge Engine V1 architecture is approved. The current goal is implementation, not another architecture hold.

## Repository-first build

The following can be built and validated without any persistent SAMMA runtime host:

- Next.js + React + TypeScript application shell;
- strict TypeScript/lint/test/CI setup;
- stable `Account` + `AccountIdentity` identity model;
- Person, Company, CompanyMember and functional-role model;
- PersonCompanyRelationship and offboarding model;
- Governance capabilities and `/governance` shell;
- RecordDefinition + immutable RecordDefinitionVersion;
- Record + RecordFile metadata model;
- retention/review calculation;
- LegalAccessGrant;
- permission/policy services;
- Person and Company Info Center projections;
- synthetic fixtures/seeds;
- storage, scan, mail, payment and identity adapter interfaces;
- focused positive/negative security tests;
- future social-login and Moodle integration seams.

## Storage before real S3

Before persistent object storage is provisioned, use a provider-neutral `StorageProvider` contract with an in-memory or explicitly development-only adapter.

Domain code must not depend on:

- local absolute filesystem paths;
- provider-specific S3 URLs;
- a public bucket;
- the application VM's filesystem as the production document store.

The production target remains private, separate S3-compatible object storage.

## Optional NUC development runtime

The existing NUC may now be used as a **temporary development/integration host** if a resource check shows adequate disk, RAM and CPU headroom.

This is an optional convenience, not an architectural dependency.

### Start small

Prefer this sequence:

```text
Stage A
law-web
+
PostgreSQL

Stage B — only if resources remain healthy
+ S3-compatible development storage

Stage C — only when needed and resources permit
+ Redis/BullMQ
+ worker
+ ClamAV
```

Do not start every planned container merely because it exists in the architecture.

### Resource gate

Before adding SAMMA services to the NUC, inspect at minimum:

- free disk space and filesystem utilisation;
- available RAM and swap pressure;
- current Docker/container memory footprint;
- CPU/load baseline;
- current database/storage usage;
- whether existing production/dev projects are already close to limits.

If SAMMA materially destabilises existing workloads, stop the NUC runtime experiment and continue repository-first until the dedicated Law VM is available.

### NUC boundaries

Even if development runs successfully on the NUC:

- it is **not** the SAMMA production host;
- it is **not** the sole backup destination;
- it is **not** the production object-storage architecture;
- real client/employee sensitive data must not be loaded into it for development;
- synthetic data only until the production security/compliance environment is approved;
- deployments must remain reproducible from Git and configuration rather than hand-tuned to the NUC.

## What can be real on the temporary NUC dev runtime

If resources permit, we may use:

- PostgreSQL for schema/migration/integration validation;
- the actual Next.js application;
- synthetic seeded companies/people/relationships;
- development email capture rather than real sensitive email;
- development object storage once space permits;
- focused permission/role/relationship integration tests.

A temporary SQLite substitution is not preferred where it would hide PostgreSQL-specific migration or constraint behaviour.

## Stop line before production-style integration

A dedicated Law development VM remains the preferred environment before declaring these behaviours production-like/integrated:

- real OIDC account recovery and enforced MFA;
- public internet-facing invitations;
- real outbound transactional email;
- persistent separate S3-compatible storage architecture;
- real quarantine and malware scanning;
- production-style signed object access;
- payment sandbox/public webhooks;
- production-like TLS/domain configuration;
- automated backup/replication and restore drills;
- production-like secret management;
- infrastructure monitoring;
- production retention execution/destruction;
- Moodle integration;
- production social/federated login providers.

## Pre-VM / temporary-NUC implementation milestone

A strong milestone is:

```text
Stable Account + email identity
  ↓
Company + multi-role members
  ↓
Person ↔ Company relationship
  ↓
Governance-defined record definition/version
  ↓
Company adds synthetic record to employee profile
  ↓
RecordFile metadata + opaque storage key + checksum
  ↓
Person sees record in Info Center
  ↓
Authorised company role sees record
  ↓
Unauthorised role is denied
  ↓
Legal grant remains scoped
  ↓
Retention/review dates + audit events generated
```

If this works cleanly, most of the application domain has been proven before the dedicated Law VM.

## Guiding rule

**Use the NUC if it helps us move faster, but never let SAMMA become dependent on it.**
