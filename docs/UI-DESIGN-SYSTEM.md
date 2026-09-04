# UI Design System — Info Center Direction

## Intent

Juanity Law should feel calm, clear and trustworthy. The UI is information-first, not decorative, and should help users understand status and next actions quickly.

The starting point is the useful interaction pattern learned from a previous Info Center implementation: constrained content width, light layered surfaces, strong section hierarchy, pill navigation/status, visible completion/needs-action states, and responsive layouts.

This document defines a **Juanity Law design direction**, not a code copy.

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

Primary working pages should generally use a centred content shell around `960–1040px`, with exceptions for dense internal operational tables.

The client Info Center should favour readability over maximum screen fill.

### 3. Clear hierarchy

Typical page structure:

```text
Page heading
Short description / context

Workflow / section navigation

Priority / needs-action area

Main content cards

Recent activity / secondary information
```

### 4. Cards represent meaning

A card should group a coherent unit such as:

- matter status;
- action required;
- request;
- activity group;
- account/billing summary.

Do not nest cards simply to create visual texture.

### 5. Pill navigation and status

Pills work well for:

- compact workflow navigation;
- status labels;
- filters;
- completion indicators.

They must remain readable and accessible, not become the only way colour communicates state.

## Proposed shell

### Client shell

```text
Juanity Law
─────────────────────────────────
Info Center | My Matters | Actions | Account

[ Page title ]
[ concise description ]

[ content ]
```

Once the document domain is approved, Documents may become a first-class navigation destination.

### Internal legal workspace shell

```text
Juanity Law Workspace
─────────────────────────────────
Matters | Clients | Actions | Activity | Admin

[ operational content ]
```

Internal pages may use a wider layout where tables genuinely benefit from it.

## Info Center composition

A useful first dashboard:

```text
INFO CENTER

Good evening, [Name]
Here is what needs your attention.

┌───────────────────────────────┐
│ NEEDS ACTION                  │
│ 2 items                       │
│                               │
│ Review requested information │
│ Complete client details       │
└───────────────────────────────┘

┌───────────────────────────────┐
│ YOUR MATTERS                  │
│ Matter A      In progress     │
│ Matter B      Waiting         │
└───────────────────────────────┘

┌───────────────────────────────┐
│ RECENT ACTIVITY               │
│ Request completed             │
│ Matter status changed         │
└───────────────────────────────┘
```

The Info Center should answer:

- What changed?
- What needs me?
- What am I waiting for?
- Where do I go next?

## Matter page composition

```text
MATTER
Reference / title
Status pill
Short context

Overview | Actions | Activity | [Documents later]

[ Needs action ]
[ Matter details ]
[ Participants ]
[ Timeline ]
```

The matter page is the contextual home for work rather than forcing users into a global file browser.

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
--jl-radius-control
--jl-radius-card
--jl-radius-panel
--jl-radius-pill
--jl-shadow-soft
--jl-shadow-card
```

Brand colours are intentionally not finalised in this document.

## Responsive behaviour

### Desktop

- primary content centred;
- workflow navigation may show 4+ items in a row;
- related cards may use 2-column grids where useful.

### Tablet

- navigation commonly falls to 2 columns;
- forms reduce columns;
- cards retain generous touch targets.

### Mobile

- single-column navigation and content;
- minimum comfortable control height around 42–44px;
- no horizontal page overflow;
- titles scale down without losing hierarchy;
- actions wrap or stack cleanly.

## Accessibility baseline

- semantic headings;
- visible keyboard focus;
- native controls where possible;
- `aria-current` for active navigation;
- colour never carries status meaning alone;
- labels associated with controls;
- errors shown beside the relevant task and in a readable summary where needed;
- reduced-motion preference respected if motion is introduced.

## Status language

Prefer plain status wording:

- Needs action
- Waiting
- In progress
- Complete
- Closed
- Expired
- Access revoked

Avoid technical/internal status strings in the client UI.

## Dark mode

Not an initial requirement. The design system should use semantic tokens so dark mode remains possible later without distorting the initial design effort.
