# Project Charter

## Purpose

Juanity Law is a secure paid portal for a legal entity to manage client-facing information workflows. The initial product is centred on an **Info Center** rather than a generic file manager.

The system should help a user answer:

1. What is happening?
2. What do I need to do?
3. What am I waiting for?
4. What has already happened?

## Initial product areas

- Account and identity boundary
- Organisations and users
- Matters
- Requests / actions
- Activity and audit history
- Billing, subscriptions and entitlements
- Administration
- Document capability — intentionally pending detailed design

## Out of scope for this architecture pass

- Online learning / LMS integration
- E-signature implementation
- AI legal advice
- Practice accounting
- Full practice-management replacement
- Court filing integrations
- Document-engine final schema
- Final retention/destruction policy

## Product shape

The app should support two primary working surfaces:

### Client-facing Info Center

Simple, task-oriented and low-friction:

- Home / Info Center
- My Matters
- Actions / Requests
- Documents (once designed)
- Activity
- Account / Billing

### Internal legal workspace

Denser operational view:

- Matters
- Clients / organisations
- Requests
- Activity
- Users
- Billing / subscription administration
- Document operations (once designed)

Both surfaces use the same underlying domain and permission system.

## Core domain frame before the document-engine decision

```text
Organisation
  ├── Users
  ├── Subscription / Entitlements
  └── Matters
        ├── Participants
        ├── Requests / Actions
        ├── Activity Events
        └── Document capability (TBD)
```

## Commercial assumption

Juanity Law will be a paid service. Billing therefore belongs in the platform architecture from the start, but production gateway selection and wiring may be delayed until the product model is approved.

## Success criteria for the framework phase

The framework phase is successful when the repository can support, without redesigning its foundations:

- authenticated users;
- organisation membership;
- matter membership;
- role/capability-based authorisation;
- requests/actions;
- activity/audit events;
- products/subscriptions/entitlements;
- a light Info Center UI;
- later attachment of a legal document domain through explicit interfaces;
- deployment onto a dedicated development VM.

## Guiding principle

**Do not pre-solve the document engine. Build the platform around it cleanly enough that the engine can be designed from legal requirements instead of from accidental framework constraints.**
