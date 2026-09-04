# UI Design System — Info Center Direction

## Intent

Juanity Law should feel calm, clear, private and trustworthy. The UI is information-first, not decorative, and should help people and company users understand status and next actions quickly.

The starting point is the useful interaction pattern learned from a previous Info Center implementation: constrained content width, light layered surfaces, strong section hierarchy, pill navigation/status, visible completion/needs-action states, and responsive layouts.

This document defines a **Juanity Law design direction**, not a code copy.

## Two Info Centers, one design language

Juanity Law has two primary working surfaces:

1. **Person Info Center** — simple, personal and action-oriented.
2. **Company Info Center** — operational, employee/relationship-oriented and permission-aware.

The same design tokens and component language should serve both, while navigation and information density differ.

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
- activity group;
- account/billing summary.

Do not nest cards simply to create visual texture.

### 5. Pill navigation and status

Pills work well for:

- compact workflow navigation;
- relationship status;
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

## Person shell

```text
Juanity Law
────────────────────────────────────────
Info Center | My Information | My Companies | Actions | Account

[ Page title ]
[ concise description ]

[ content ]
```

Once the document domain is approved, a `My Documents` or equivalent destination may be introduced.

## Company shell

```text
Juanity Law — [Company]
────────────────────────────────────────
Info Center | People | Actions | Activity | Admin

[ operational content ]
```

Billing and company settings may live under Admin/Settings rather than overcrowding primary navigation.

Once the document domain is approved, document/record destinations can be added according to the final workflow.

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
│ [document sections later]        │
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
│ Company user role changed        │
└──────────────────────────────────┘
```

## Person/company relationship page

This becomes the contextual home for the relationship.

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

Overview | Actions | Activity | [Employment records later]

[ Relationship status ]
[ Approved employment context ]
[ Outstanding requests ]
[ Authorised information ]
[ Timeline ]
```

The company view must not imply that the company can browse all information held in the person's private Info Center.

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
--jl-bg
--jl-surface
--jl-surface-soft
--jl-surface-elevated
--jl-border
--jl-border-strong
--jl-text
--jl-muted
--jl-primary
--jl-primary-dark
--jl-primary-soft
--jl-success
--jl-warning
--jl-danger
--jl-info
--jl-sensitive
--jl-radius-control
--jl-radius-card
--jl-radius-panel
--jl-radius-pill
--jl-shadow-soft
--jl-shadow-card
```

Brand colours are intentionally not finalised in this document.

`--jl-sensitive` is a semantic affordance only; sensitive status must also be communicated in text/access behaviour, never colour alone.

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
