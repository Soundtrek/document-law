# Authentication and Governance Access

## Purpose

Juanity Law carries sensitive employment and legal information. Identity and privileged access are therefore part of the product foundation, not a later add-on.

## Login identity

Juanity Law uses **email address as the primary human-facing login and contact identifier** from the start.

There is no separate public username concept for normal users.

However, email is **not** the permanent database identity. Every account must have a stable internal ID so email changes and future social/federated login providers do not create duplicate people.

Conceptually:

```text
Account
  id: stable internal ID
  primary_email
  email_verified
  status

AccountIdentity
  account_id
  provider
  provider_subject
  provider_email_at_link_time
  linked_at
```

Initial identity behaviour:

- sign up with email;
- verify email before sensitive account/workspace access;
- login with email;
- secure account recovery through the identity provider;
- company invitations are sent to a specific email identity;
- legal-professional access invitations are sent to a specific email identity;
- one human keeps one Juanity account even when they belong to multiple companies, hold multiple roles or later use more than one login provider.

The application must not implement its own password cryptography. Password/session/MFA mechanics belong behind the approved identity-provider boundary.

The leading deployment direction remains an OIDC-compatible provider such as Keycloak configured for email-based sign-in and capable of later brokering approved external identity providers. The application consumes a verified authenticated actor, not provider-specific claims throughout the codebase.

## Future social / federated sign-in

Juanity is expected to add social/federated login later, potentially including providers such as Google, Microsoft, Apple or other approved providers.

The domain must therefore assume:

```text
Authentication provider(s)
        ↓
Identity boundary / broker
        ↓
Stable Juanity Account
        ↓
Person / Company Member / Legal Access / Governance contexts
```

Provider identities attach to an existing Juanity account. They do not replace the Juanity `Account` or `Person` primary key.

Do **not** silently merge two Juanity accounts merely because two identity providers report the same email address. Linking an additional provider to an existing account should require an authenticated session and appropriate verification/re-authentication.

Verified provider email may assist onboarding and invitation matching, but provider-email equality alone must not be treated as sufficient proof for an automatic account merge.

See `docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md`.

## Privileged authentication

MFA capability is required from the architecture from day one.

Before production use with sensitive records:

- Juanity Governance users: MFA required;
- Company Owner/governance users: MFA required;
- HR, Payroll and Legal users: MFA policy should default to required unless Juanity explicitly approves another policy;
- other users: MFA supported and may become policy-driven by role/sensitivity.

Security-sensitive actions may require re-authentication/step-up later. The 3-click / 10-second rule does not bypass justified authentication controls.

A social/federated provider session does not automatically waive Juanity's MFA/step-up policy for privileged operations.

## No `/admin`

Juanity Law does not expose a generic `/admin` product surface.

The Juanity-only privileged control surface is named **Governance**.

Initial route naming:

```text
/governance
```

This is product/security language, not security-by-obscurity. The route name itself is not a protection mechanism.

Actual protection comes from:

- authenticated verified identity;
- Juanity-only Governance membership;
- capability-based server authorisation;
- MFA;
- deny-by-default policy;
- audit logging;
- session revocation;
- rate limiting and security monitoring.

A later production deployment may place Governance behind a dedicated hostname or additional network/access controls without changing its domain model.

## Governance versus company management

Juanity Governance and Company Owner management are different scopes.

### Juanity Governance

Controls platform policy such as:

- record definitions;
- request/workflow definitions;
- record categories;
- retention/review policy definitions;
- working classification policy;
- approved functional roles/capabilities;
- platform companies/accounts where authorised;
- platform security/audit investigation;
- billing/product configuration where authorised;
- system operational settings exposed by policy.

### Company Owner / company governance

Controls only their own company scope, such as:

- invite/remove company staff;
- assign/revoke Juanity-approved company functional roles;
- assign roles to themselves;
- manage approved company settings;
- company billing where permitted;
- view company membership/role history where permitted.

Company Owner is not Juanity Governance and does not receive platform-wide access.

## Governance roles and capabilities

Do not implement one universal `SUPERADMIN` as the normal operating model.

Juanity Governance should support specific capabilities that may be grouped into roles.

Working capability families:

```text
platform.policy.manage
platform.definitions.manage
platform.retention.manage
platform.roles.manage
platform.companies.manage
platform.security.review
platform.audit.review
platform.billing.manage
platform.support.access
platform.system.configure
```

Working Governance role concepts may include:

- Platform Owner / Governance Owner;
- Policy Manager;
- Security Officer;
- Audit Reviewer;
- Billing Operator;
- Support Operator.

One Juanity staff member may hold several Governance roles in a small operation. Larger operations may separate them.

## Break-glass access

If a true emergency universal-access mechanism is ever required, it must be a separate **break-glass** capability, not an ordinary admin role.

It should require, at minimum:

- explicit elevated authentication;
- MFA/step-up;
- reason capture;
- short-lived access;
- high-fidelity audit;
- post-event review.

Do not build break-glass access until a real operational requirement is approved.

## Company and legal-professional identities

The same Juanity account may have several independent contexts:

```text
Account / Person
  ├── personal Info Center
  ├── Company A member: OWNER + HR
  ├── Company B member: LEGAL
  ├── external legal access grants
  └── future learning/training context
```

Authentication answers **who is this person?**

Authorisation answers **what may this person do in this context?**

Never encode company role, legal access, future learning access or platform Governance solely into identity-provider email/username state.

## Invitations

Company staff and external legal-professional invitations should:

- target a specific email address;
- bind to one intended company/access grant;
- expire;
- be single-use or safely repeatable/idempotent;
- not grant access before acceptance and account verification;
- preserve inviter, target, role/scope and timestamps in audit history;
- fail closed if the target identity changes unexpectedly.

After authentication, the invitation resolves to the stable Juanity account. The user may have authenticated with email or a safely linked federated identity, provided the invitation verification rules are satisfied.

## Session consequences of privilege changes

Role, membership, Governance capability and legal-access changes must not rely only on the next natural login.

The architecture must support prompt invalidation/re-evaluation of active access when:

- a company member is disabled;
- a functional role is revoked;
- Governance access is revoked;
- legal-professional access expires or is revoked;
- an account is suspended;
- a high-risk security event requires forced logout;
- an external identity link is removed or compromised.

## Future Moodle / learning SSO

Juanity is expected to add company onboarding, training and certification through Moodle or another approved LMS later.

Juanity should remain the identity/company/relationship authority. The LMS should consume SSO/federated identity rather than owning a second unrelated Juanity password/account.

A future learning integration must map the stable Juanity account to an external LMS user ID through an explicit integration link. Moodle user IDs must never replace Juanity Account or Person IDs.

See `docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md`.

## UI naming

Use explicit product language:

- `Governance` — Juanity platform policy/security control;
- `Company Access` or `Team & Access` — company staff and functional roles;
- `Legal Access` — external lawyer/legal-professional grants;
- `Security` — authentication/session/security settings;
- `Audit` — authorised investigation/history views;
- `Training` — future company onboarding/training/certification surface.

Avoid a generic catch-all `Admin` destination in primary navigation.

## Security invariant

Changing the name from `/admin` to `/governance` is useful product separation, but **must never be treated as a security control**. Every Governance request is server-authorised as though the route were publicly known.
