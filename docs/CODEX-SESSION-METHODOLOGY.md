# Codex Session Methodology

## Principle

**Validate the session, not every code block.**

Broad validation belongs at session boundaries and release/promotion gates. During implementation, use focused checks proportional to the change. Do not repeatedly audit or validate unrelated parts of the application after every small edit.

The question for every check is:

> What realistic failure caused by the changes in this session would this check detect?

If there is no reasonable answer, skip the check.

This methodology supplements `AGENTS.md` and `docs/CODEX-SESSION-START.md`. Security, environment-isolation and branch/runtime rules in those documents remain mandatory.

---

## 1. Session start — establish the baseline once

At the beginning of a coding session, record internally:

```text
SESSION BASELINE

Project:
Branch:
Base SHA:
Runtime / environment:
Working-tree state:

Session scope:
- ...

Protected this session:
- ...

Known pre-existing blockers/failures:
- ...

Migration expected: YES / NO
Production touched: YES / NO
```

Minimum session-start checks:

1. Correct repository.
2. Correct branch and base SHA.
3. Working-tree state understood.
4. Target runtime/environment understood.
5. Scope for the session stated.
6. Protected/high-risk areas identified.
7. Known existing failures recorded rather than rediscovered repeatedly.

Once this baseline is established, **do not repeat the full preflight before every task in the same session** unless the baseline changes.

A new baseline is required when switching repository, branch, runtime/environment, production target, or materially changing the session's risk boundary.

---

## 2. During the session — focused checks only

Work normally and validate only what the current change can realistically affect.

Examples:

### CSS / visual / wording

Typical checks:

- inspect the local diff;
- CSS/config syntax where relevant;
- render or visually inspect the affected screen where useful.

Do not automatically run the entire test suite and production build after each visual correction.

### React/component change

Typical checks:

- focused test for the changed behaviour;
- typecheck only when useful to catch the affected boundary;
- render/interaction check for the changed component.

### Small configuration change

Typical checks:

- validate the changed configuration;
- restart/test only the affected DEV service if required;
- verify the specific workflow affected.

### Documentation

Typical checks:

- diff/format/link or policy consistency as relevant.

A documentation-only change does not require an application build merely because a build command exists.

### API/domain behaviour

Typical checks:

- focused unit/integration tests;
- affected DEV workflow;
- negative/security case where relevant.

Do not sweep unrelated systems without a specific reason.

---

## 3. High-risk override

Use stronger validation immediately when a change touches a high-risk boundary:

- database schema;
- migrations;
- destructive data operations;
- authentication;
- authorisation / permissions / tenant isolation;
- storage/file migration;
- billing/payment;
- secrets or key management;
- production infrastructure;
- destructive account operations;
- large/high-blast-radius refactors.

Even here, validation should focus on the affected risk boundary rather than automatically re-auditing the whole product.

Examples:

- permission change -> positive and negative access tests;
- migration -> backup/rollback + migration validation;
- storage move -> source/destination counts + checksum/integrity + rollback;
- auth change -> DEV login/callback/security tests;
- production infrastructure -> health + rollback + affected service checks.

---

## 4. Protected areas

At session start, identify systems that are outside the session scope.

Example:

```text
PROTECTED THIS SESSION

- production database
- schema/migrations
- production containers
- Caddy/DNS
- object storage
- Keycloak realm
```

Once established, do not repeatedly reconfirm every protected system after every minor change.

**Stop if the work unexpectedly crosses a protected boundary.**

---

## 5. Session close — broad validation once

Before the session's work is committed, reviewed or promoted, validate the accumulated session as one unit.

Typical application close:

1. Inspect the complete session diff.
2. Confirm no unrelated changes.
3. Confirm protected areas were not crossed unexpectedly.
4. `git diff --check`.
5. Typecheck.
6. Lint.
7. Relevant focused tests.
8. Full tests where appropriate for the accumulated risk.
9. Production build where appropriate.
10. Record known blocked tests separately rather than misclassifying unrelated work as failed.

This is the normal point for broad validation.

Do not rerun the same unchanged full suite multiple times in one session unless a later change intersects what that suite protects.

---

## 6. Deployment is a separate risk event

Production deployment gets its own short deployment gate. Do not repeat the entire development audit.

Before deployment, normally confirm only what is necessary:

- approved exact SHA;
- current production health;
- rollback target;
- schema/migration requirement;
- target environment/configuration;
- affected service(s).

Deploy only the intended service/change.

Then perform focused production acceptance for the functionality and infrastructure actually affected.

If a deployment contains a high-risk migration or storage/data operation, use the relevant high-risk procedure instead of this lightweight gate.

---

## 7. Validation proportionality

### LOW RISK

Examples:

- CSS;
- wording;
- visual theme;
- documentation;
- small presentation component.

Normal flow:

```text
focused check -> visual/relevant review -> session-close validation
```

### MEDIUM RISK

Examples:

- API behaviour;
- auth configuration;
- application logic;
- workflow change.

Normal flow:

```text
focused tests -> DEV workflow test -> session-close validation
```

### HIGH RISK

Examples:

- schema/migration;
- permissions;
- storage migration;
- destructive data;
- production infrastructure.

Normal flow:

```text
specific preflight -> backup/rollback -> focused validation -> DEV acceptance -> controlled production acceptance
```

---

## 8. Avoid validation theatre

Do not run checks merely because they are available.

Avoid these patterns:

- full build after every CSS tweak;
- repository-wide audit after a one-file local change;
- repeatedly checking database migrations during a presentation-only session;
- repeatedly checking storage/Caddy/DNS when they are protected and untouched;
- repeatedly proving the same branch/SHA/environment facts without a state change;
- blocking unrelated work on a known pre-existing failure that the session did not cause and does not depend on.

Checks must be connected to a plausible failure introduced by the current session.

---

## 9. Existing failures and blockers

A known pre-existing failure does not automatically block unrelated work.

Record it in the session baseline.

Stop only when:

- the current work caused it;
- it prevents meaningful validation of the changed area; or
- continuing could cause damage.

Do not derail an unrelated task merely to repair every pre-existing problem discovered during validation.

---

## 10. Session continuity

Within one continuous coding session, later instructions inherit the established session baseline unless something materially changes.

Do not restart the methodology for every prompt/code block.

Re-baseline when any of these changes:

- repository;
- branch/history unexpectedly moves;
- target environment;
- production target;
- database/storage target;
- session scope expands into a new high-risk boundary;
- working tree gains unrelated changes.

---

## 11. Standard flow

```text
SESSION START
     |
     v
BASELINE ONCE
     |
     v
IMPLEMENT
     |
     v
FOCUSED CHECK
     |
     v
IMPLEMENT
     |
     v
FOCUSED CHECK
     |
     v
IMPLEMENT
     |
     v
SESSION CLOSE
     |
     v
BROAD VALIDATION ONCE
     |
     v
COMMIT / REVIEW
     |
     v
SHORT DEPLOYMENT GATE
     |
     v
DEPLOY + FOCUSED ACCEPTANCE
```

The objective is **less ceremony, not less safety**. Concentrate validation where it can detect a realistic failure and where the blast radius justifies it.