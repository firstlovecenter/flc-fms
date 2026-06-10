# FLC FMS Design System (Hybrid 2026)

First Love Center Facility Management — unified token architecture with two scoped surfaces.

## Principles

1. **Institutional trust** — navy foundation, gold accents; warm cream for public/patron, cool gray for staff.
2. **One token source** — HSL channel triplets in `globals.css`; Tailwind maps to the same vars.
3. **Role-based density** — marketing pages are airy (Playfair display); staff tables are compact (Jakarta only).
4. **Accessible by default** — WCAG AA contrast, 44px touch targets, `prefers-reduced-motion` respected.

## Surface scopes

Apply a scope class on each layout root. Both surfaces share brand navy/gold; neutrals and shadcn `--ui-*` tokens derive per scope.

| Scope | Class | Canvas | Typography | Used by |
|-------|-------|--------|------------|---------|
| Warm | `.surface-warm` | Cream `#F7F4EE` | Playfair + Jakarta | `body`, public, patron, auth |
| Cool | `.surface-cool` | Gray `#EEF1F5` | Jakarta only | `StaffShell`, super-admin, duty portal |

```html
<!-- Public/patron (default) -->
<body class="surface-warm">

<!-- Staff -->
<div class="surface-cool">
```

## Color tokens

Brand channels (opacity modifiers work: `bg-navy/10`):

| Token | Light | Usage |
|-------|-------|--------|
| `--navy-hsl` | `217 53% 7%` | Primary text, buttons |
| `--gold-hsl` | `39 51% 53%` | Accents, CTAs, focus ring |
| `--cream-hsl` | `40 36% 95%` | Warm canvas |
| `--border-hsl` | `38 22% 83%` | Dividers (warm scope) |

**Per-domain accents** (staff stat cards, charts, sidebar active states):

| Token | Domain |
|-------|--------|
| `--accent-bookings` | Bookings, check-in |
| `--accent-facilities` | Facilities |
| `--accent-inventory` | Items, inventory |
| `--accent-maintenance` | Maintenance |
| `--accent-events` | Events |
| `--accent-finance` | Transactions, reports |
| `--accent-duty` | Duty logs |

Tailwind: `bg-bookings/10`, `text-finance`, etc.

Dark mode brightens accent channels automatically. Staff sidebar uses `.on-navy` for accent contrast on deep navy.

## Typography

Loaded via `next/font`: Playfair Display (`--font-playfair`), Plus Jakarta Sans (`--font-jakarta`).

| Scale | Size | Font | Use |
|-------|------|------|-----|
| `display-xl` | 2.5rem | Playfair | Public hero |
| `display-lg` | 2rem | Playfair | Page titles |
| `heading-md` | 1.25rem | Jakarta | Card titles |
| `body` | 0.9375rem | Jakarta | Body copy |
| `body-sm` | 0.8125rem | Jakarta | Tables, meta |
| `eyebrow` | 0.6875rem | Jakarta | Uppercase labels |

Staff cool surface: Jakarta only (no Playfair in data-dense areas).

## Components (canonical)

Use shadcn primitives + app wrappers. **Do not** use legacy `.btn-*`, `.input`, `.stat-card`, or `.badge-*` classes — they have been removed.

| Component | Path | Notes |
|-----------|------|-------|
| Button | `@/components/ui/button` | Variants: default, gold, outline, ghost, destructive |
| buttonVariants | `@/components/ui/button-variants` | Import in **server** components |
| Input | `@/components/ui/input` | `min-h-11`, `inputStyles` export for selects |
| Field | `@/components/ui/field` | Label + error wiring |
| Card | `@/components/ui/card` | `rounded-[var(--r-md)]`, ring border |
| StatCard | `@/components/ui/StatCard` | `color` prop → domain accent; `compact` for mobile |
| StatusBadge | `@/components/ui/StatusBadge` | Single source for all status colors |
| PageHeader | `@/components/layout/PageHeader` | `variant="hero"` for navy gradient headers |
| PageContainer | `@/components/layout/PageContainer` | Max-width + padding |
| DataTable | `@/components/layout/DataTable` | Horizontal scroll wrapper + `data-table` |

## Reference screens

### 1. Public home (`/`)

- Warm surface, split layout desktop, compact hero mobile.
- Gold “Book Now” CTA (`Button variant="gold"`).

### 2. Staff bookings (`/bookings`)

- Cool surface via `StaffShell`.
- Domain-accent sidebar active states (background tint + accent icon, no side-stripes).
- `DataTable compact`, `StatusBadge` per row.

### 3. Patron dashboard (`/patron/dashboard`)

- Warm surface, `PageHeader variant="hero"`.
- `StatCard compact` row with domain accents.
- Recent bookings `DataTable`.

## Motion

- Transitions: 150–200ms; `active:scale-[0.98]` on buttons.
- `prefers-reduced-motion: reduce` zeroes non-essential animation in `globals.css`.

## Do / Don't

| Do | Don't |
|----|--------|
| `surface-warm` / `surface-cool` on layout roots | Hardcode hex without dark pair |
| `StatusBadge` for statuses | `statusBadgeClass()` or hex maps |
| `StatCard` with `color="bookings"` | Hand-rolled emerald/blue tiles |
| `button-variants` in server pages | Import `buttonVariants` from client `button.tsx` |
| `min-w-0` on flex children | Nested cards inside cards |

## Source reference

The hybrid architecture (HSL channels, surface scopes, domain accents, CVA conventions) was adapted from the external Vite/Apollo blueprint; this app stays on Next.js + Tailwind v3 + next-themes.
