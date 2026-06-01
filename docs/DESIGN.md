# FLC FMS Design System (2026 Rebrand)

First Love Center Facility Management — visual language for public, patron, and staff surfaces.

## Principles

1. **Institutional trust** — navy foundation, gold accents, calm cream surfaces.
2. **One token source** — CSS variables in `globals.css`; Tailwind maps to the same vars.
3. **Role-based density** — marketing pages are airy; staff tables are compact.
4. **Accessible by default** — WCAG AA contrast, 44px touch targets, zoom allowed, `prefers-reduced-motion` respected.

## Color tokens

| Token | Light | Usage |
|-------|-------|--------|
| `--navy` | `#080F1A` | Primary text, headers, primary buttons |
| `--navy-mid` | `#0F1E36` | Hover states, gradients |
| `--navy-light` | `#1A3058` | Secondary navy surfaces |
| `--gold` | `#C49A4A` | Accents, CTAs, active indicators |
| `--gold-bright` | `#D4AE62` | CTA hover, highlights |
| `--cream` | `#F7F4EE` | Page background (public/patron) |
| `--cream-dark` | `#EDE6D8` | Subtle fills, hover rows |
| `--surface` | `#FFFFFF` | Cards, inputs (light) |
| `--text-muted` | `#5C6B7A` | Secondary text (AA on cream) |
| `--border` | `#DDD6CA` | Dividers, input borders |

Semantic: `--success`, `--warning`, `--danger` align with shadcn destructive/muted patterns.

Dark mode inverts text/surface roles; navy becomes light text on deep `#060D18` base.

## Typography

| Scale | Size | Weight | Font | Use |
|-------|------|--------|------|-----|
| `display-xl` | 2.5rem / 40px | 700 | Playfair | Public hero (desktop) |
| `display-lg` | 2rem / 32px | 700 | Playfair | Page titles |
| `heading-lg` | 1.5rem / 24px | 600 | Playfair | Section titles |
| `heading-md` | 1.25rem / 20px | 600 | Jakarta | Card titles |
| `body` | 0.9375rem / 15px | 400 | Jakarta | Body copy |
| `body-sm` | 0.8125rem / 13px | 400 | Jakarta | Tables, meta |
| `caption` | 0.75rem / 12px | 500 | Jakarta | Eyebrows, badges |
| `eyebrow` | 0.6875rem / 11px | 700 | Jakarta | Uppercase labels |

## Spacing (4px grid)

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

Page padding: `px-4 md:px-8` (public), `px-4 sm:px-7` (patron/staff main).

Section gap: `space-y-6` (staff), `space-y-8` (public marketing).

## Radius & elevation

| Token | Value | Use |
|-------|-------|-----|
| `--r-sm` | 8px | Buttons, inputs, badges |
| `--r-md` | 14px | Cards |
| `--r-lg` | 20px | Modals, hero cards |

Shadows: `--shadow-sm` (cards), `--shadow-md` (dropdowns), `--shadow-lg` (modals).

## Components (canonical)

Use shadcn primitives styled with tokens. App wrappers in `src/components/layout/`:

- **Button** — `variant`: default (navy), gold (CTA), outline, ghost, destructive
- **Input / Label / Field** — always pair `htmlFor` + `id`
- **Card** — `rounded-[var(--r-md)]`, ring border
- **PageHeader** — eyebrow + title + description + optional actions
- **PageContainer** — max-width + horizontal padding
- **DataTable** — `.table-scroll-wrapper` + `.data-table`

Legacy globals (`.btn-primary`, `.page-hero`) remain aliases during migration.

## Reference screens

### 1. Public home (`/`)

- **Mobile**: Compact hero strip (eyebrow, title, one-line subtitle) → sticky nav (hamburger) → catalog tabs → content.
- **Desktop (lg+)**: Split layout — left branding panel, right catalog.
- Primary CTA: gold “Book Now”; secondary: outline “Sign In”.

### 2. Staff bookings list (`/bookings`)

- **PageHeader**: “Bookings” + count subtitle; filter row in card.
- **DataTable**: compact rows, StatusBadge, horizontal scroll on mobile.
- **Sidebar**: navy 240px; active item gold left border.

### 3. Patron dashboard (`/patron/dashboard`)

- Top nav (horizontal pills desktop, drawer mobile).
- Stat cards row → recent bookings table.
- Same tokens as staff; no sidebar.

## Motion

- Transitions: 150–200ms on color, transform, opacity.
- `@media (prefers-reduced-motion: reduce)`: disable non-essential animations.
- No autoplay carousels without pause control.

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use semantic tokens | Hardcode `#fff` / hex without dark pair |
| `min-w-0` on flex children | Horizontal nav without mobile menu |
| `htmlFor` on labels | Icon-only buttons without `aria-label` |
| `PageContainer` for page width | Copy-paste glow wrapper per page |
| Theme toggle in all app shells | Public-only dark mode control |
