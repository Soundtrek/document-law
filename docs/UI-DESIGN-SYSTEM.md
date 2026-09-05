# UI Design System — Info Center Direction

## Intent

SAMMA should feel calm, clear, private and trustworthy. The UI is information-first, not decorative, and should help people and company users understand status and next actions quickly.

The starting point is the useful interaction pattern learned from a previous Info Center implementation: constrained content width, light layered surfaces, strong section hierarchy, pill navigation/status, visible completion/needs-action states, and responsive layouts.

This document defines a **SAMMA design direction**, not a code copy.

## Two Info Centers, one design language

SAMMA has two primary working surfaces:

1. **Person Info Center** — simple, personal and action-oriented.
2. **Company Info Center** — operational, employee/relationship-oriented and permission-aware.

The same design tokens and component language should serve both, while navigation and information density differ.

A third restricted surface is **SAMMA Platform Admin**, used to define approved record/workflow configuration and product policy. It is not a normal company admin screen.

## Core visual principles

### 1. Light by default

Use a light application background with white/elevated cards and subtle soft surfaces.

Avoid:

- dark default dashboards;
- heavy gradients;
- oversized shadows;
- dense glassmorphism;
- decorative clutter.

### 2. Readable content width

Primary person-facing pages should generally use a centred content shell around `960–1040px`, with exceptions for wider company operational tables.

The Person Info Center should favour readability over maximum screen fill.

### 3. Clear hierarchy

Typical page structure:

```text
Page heading
Short description / context

Workflow / section navigation

Priority / Needs Action area

Main information cards

Recent activity / secondary information
```

### 4. Cards represent meaning

A card should group a coherent unit such as:

- employment/company relationship;
- action required;
- request;
- personal information section;
- company people summary;
- company member/role summary;
- activity group;
- account/billing summary.

Do not nest cards simply to create visual texture.

### 5. Pill navigation and status

Pills work well for:

- compact workflow navigation;
- relationship status;
- role labels;
- filters;
- completion indicators;
- action state.

They must remain readable and accessible, not become the only way colour communicates state.

### 6. Sensitive information looks intentional

Highly sensitive information should not be visually mixed into ordinary profile facts without context.

The UI should be capable of:

- masking where appropriate;
- showing sensitivity/access notices;
- requiring a deliberate reveal/open action where policy requires it;
- clearly distinguishing personal information from company/employment records;
- avoiding sensitive values in notification previews.

Exact document behaviour remains part of the document-engine design.

## 3-click / 10-second rule

SAMMA uses a formal routine-work UX target:

> **A frequent routine action should be reachable from the relevant context in no more than three deliberate clicks/taps and normally be completable in about ten seconds, excluding meaningful typing, file selection/upload, reading legal content or required security steps.**

This rule applies to daily repeated workflows, not every complex administration or high-risk security flow.

The main technique is **contextual actions + smart defaults**, not removal of security checks.

### Good examples

```text
Employee relationship
  → Add record
  → Choose record type/file
  → Send
```

```text
Employee relationship
  → Request
  → Choose request type
  → Send
```

```text
Needs Action
  → Provide
  → Use existing / Upload
  → Submit
```

```text
Company Members
  → Invite
  → Staff member + roles
  → Send invitation
```

### Avoid

```text
People → Person → HR → Records → Category → Actions → Add
```

when the same approved action can safely be placed on the person/company relationship page.

## Person shell

```text
SAMMA
────────────────────────────────────────
Info Center | My Information | My Companies | Actions | Account

[ Page title ]
[ concise description ]

[ content ]
```

Once the document domain is approved, a `My Documents` or equivalent destination may be introduced.

## Company shell

```text
SAMMA — [Company]
────────────────────────────────────────
Info Center | People | Actions | Activity | Admin

[ operational content ]
```

Billing and company settings may live under Admin/Settings rather than overcrowding primary navigation.

Company member management belongs in company Admin/Settings and should be reachable quickly for the owner/governance role.

Once the document domain is approved, document/record destinations can be added according to the final workflow.

## Company membership UI

The UI must support both a one-person company and a larger team without changing the underlying model.

Example:

```text
COMPANY MEMBERS

Susan Owner
Owner · HR · Payroll · Clerk
[ Manage roles ]

David Smith
HR
[ Manage roles ]

Mary Jones
Payroll
[ Manage roles ]

[ Invite staff member ]
```

Rules:

- one member may show several role pills;
- role pills describe functional access, not legal seniority;
- `Owner` is visibly distinct as governance responsibility;
- role assignment/removal should clearly show the security consequence;
- do not show controls the current actor cannot use;
- hiding a control is not the security boundary; server policy remains authoritative.

### Invite flow

Target routine flow:

```text
1. Invite staff member
2. Enter email / select user + choose one or more roles
3. Send invitation
```

For a one-person company, the owner should be able to manage their own functional roles from the same membership UI without creating artificial extra users.

## Person Info Center composition

```text
INFO CENTER

Good evening, [Name]
Here is what needs your attention.

┌──────────────────────────────────┐
│ NEEDS ACTION                     │
│ 2 items                          │
│                                  │
│ Provide requested information   │
│ Review company request           │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ MY COMPANIES                     │
│ Acme Ltd          Active         │
│ Previous Co       Former         │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ MY INFORMATION                   │
│ Contact details                  │
│ Personal details                 │
│ [record/document sections later] │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ RECENT ACTIVITY                  │
│ Request completed                │
│ Employment record updated        │
└──────────────────────────────────┘
```

The Person Info Center should answer:

- What needs me?
- Which company/employment relationships are active?
- What information do I have here?
- What have companies requested from me?
- What changed recently?

## Company Info Center composition

```text
COMPANY INFO CENTER

[Company name]

┌──────────────────────────────────┐
│ NEEDS ATTENTION                  │
│ Outstanding requests            │
│ Relationship actions            │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ PEOPLE / EMPLOYEES               │
│ Active                           │
│ Pending                          │
│ Former                           │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ RECENT ACTIVITY                  │
│ Request completed                │
│ Relationship ended               │
│ Company member role changed      │
└──────────────────────────────────┘
```

The Company Info Center should adapt to the logged-in member's permitted functions. Payroll users should see payroll-relevant actions; HR users should see HR-relevant actions; a multi-role user may see both without needing separate accounts.

## Person/company relationship page

This becomes the contextual home for the relationship and the main place for high-frequency company actions.

### Person view

```text
ACME LTD
Active employment

Overview | Actions | Activity | [Records later]

[ Needs action ]
[ Relationship information ]
[ Information currently shared / available ]
[ Timeline ]
```

### Company view

```text
PERSON NAME
Active employee

[ Request info ] [ Add record ] [ More ]

Overview | Actions | Activity | [Employment records later]

[ Relationship status ]
[ Outstanding requests ]
[ Authorised information ]
[ Timeline ]
```

The exact visible quick actions are derived from the current company member's functional roles and the approved definitions available to those roles.

The company view must not imply that the company can browse all information held in the person's private Info Center.

## Smart-default interaction pattern

When a user chooses a SAMMA-approved record/request definition, the UI should inherit approved defaults such as:

- context;
- audience;
- classification;
- allowed functional roles;
- acknowledgement/Needs Action behaviour;
- notification policy;
- audit expectations;
- retention-policy reference once approved.

Do not ask routine users to repeatedly choose security/policy fields that SAMMA already defined.

The user should only provide instance-specific information needed to complete the action.

## SAMMA Platform Admin UI

Platform Admin may include configuration areas such as:

```text
Record Definitions
Request / Workflow Definitions
Categories
Functional Roles / Capability Defaults
Policy / Notification Templates
Products / Entitlements
Definition Versions
```

Record-definition editing must make versioning explicit. Editing an existing definition should not visually imply that historic records are silently rewritten.

Possible pattern:

```text
Payslip
Current definition: v3

[ View versions ] [ Create new version ] [ Deactivate ]
```

Advanced admin configuration is not required to satisfy the 3-click rule; correctness and safe review take priority.

## People list

The company workspace should make relationship state obvious:

```text
Name           Relationship      Status       Needs action
Jane Smith     Employee          Active       1
John Doe       Employee          Active       —
Sam Example    Employee          Former       —
```

Do not expose sensitive fields such as salary, bank details or disciplinary status in broad list views unless a specific approved use case and permission requires it.

## Design tokens

Use semantic tokens rather than hard-coded component colours:

```text
--samma-bg
--samma-surface
--samma-surface-soft
--samma-surface-elevated
--samma-border
--samma-border-strong
--samma-text
--samma-muted
--samma-primary
--samma-primary-dark
--samma-primary-soft
--samma-success
--samma-warning
--samma-danger
--samma-info
--samma-sensitive
--samma-radius-control
--samma-radius-card
--samma-radius-panel
--samma-radius-pill
--samma-shadow-soft
--samma-shadow-card
```

Brand colours are intentionally not finalised in this document.

`--samma-sensitive` is a semantic affordance only; sensitive status must also be communicated in text/access behaviour, never colour alone.

## Responsive behaviour

### Desktop

- primary content centred;
- workflow navigation may show 4+ items in a row;
- related cards may use 2-column grids where useful;
- company operational tables may use a wider shell.

### Tablet

- navigation commonly falls to 2 columns;
- forms reduce columns;
- cards retain generous touch targets.

### Mobile

- single-column navigation and content;
- minimum comfortable control height around 42–44px;
- no horizontal page overflow;
- titles scale down without losing hierarchy;
- actions wrap or stack cleanly;
- sensitive values must not become exposed merely because desktop masking/hover interactions disappear.

## Accessibility baseline

- semantic headings;
- visible keyboard focus;
- native controls where possible;
- `aria-current` for active navigation;
- colour never carries status meaning alone;
- labels associated with controls;
- errors shown beside the relevant task and in a readable summary where needed;
- reduced-motion preference respected if motion is introduced;
- masked/reveal controls remain keyboard and screen-reader usable.

## Status language

Prefer plain status wording:

- Needs action
- Waiting
- Active
- Pending
- Former
- In progress
- Complete
- Closed
- Expired
- Access revoked

Avoid technical/internal status strings in the user UI.

## Privacy language

Use calm, explicit language instead of vague security theatre.

Examples:

- `Shared with Acme Ltd for this request`
- `Only authorised company users can access this record`
- `This information is not shared with your employer`
- `Your employment relationship ended on [date]`

Final legal notices/consent wording must not be invented by UI code; they belong in approved configurable content/policy.

## Dark mode

Not an initial requirement. The design system should use semantic tokens so dark mode remains possible later without distorting the initial design effort.
