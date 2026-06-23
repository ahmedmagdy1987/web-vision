# Web Vision — Product & Architecture Model

Web Vision is an **invite-only internal tool for the Malahi team**. It is not a
multi-tenant SaaS; do not present organizations, workspaces, or tenancy to users.

## Internal access model

- Access is invite-only. People are invited via Supabase Auth (see
  `docs/SUPABASE.md` §6) and complete a **Create-your-password** step.
- There is exactly one operational tenant: **Malahi**. The `organizations` /
  `organization_members` tables exist only as a **hidden system boundary** powering
  Row-Level Security, membership, roles, and data isolation (and future expansion).
- Users never see or manage: organizations, workspaces, tenant creation, org
  switching, org names as a product concept, "Create your workspace", "Create
  organization", or generic SaaS onboarding.
- An authenticated user with **no active Malahi membership** sees a branded
  **"Access pending"** screen (explanation + Sign out + Retry), never a
  workspace-creation form.
- The account menu shows a static **"Malahi Studio"** team label.

## User provisioning

1. An admin invites a user by email (privileged, server-side — `scripts/invite-user.mjs`,
   not run automatically). The invite redirect points at `/auth/callback`.
2. The user opens the link → `/auth/set-password` → sets a password → enters the app.
3. The admin grants the user membership of the Malahi organization with a role
   (`owner` / `admin` / `editor` / `viewer`). Without membership the user sees
   "Access pending".
4. Existing-user password recovery: **Forgot password** → recovery email →
   `/auth/set-password`.

Never store passwords in source, seeds, reports, screenshots, or committed
fixtures. Real credentials live only in the gitignored `.env.local`.

## Visible operational hierarchy

```
Malahi internal tool
└── Projects                     (client engagement / proposal / campaign / body of work)
    ├── Brands & identities      (Identity)        — reusable across projects
    ├── Products & games         (Products)        — reusable across projects
    ├── Locations & site photos  (Locations)       — assignable to a project
    ├── Generation jobs          (Studio)
    └── Generated results        (Gallery)
```

- **Projects** are the top organizing layer. Every project belongs to the hidden
  Malahi org automatically (no org choice on create). Statuses: active, draft,
  completed, archived.
- **Brands** and **Products** are many-to-many with projects (reuse). **Locations**
  are assignable to a project. **Generation jobs/results** carry a `project_id`.
- The header **Project selector** sets the active project context. Brand selection
  lives in **Home Quick Create** and **Studio**, not as a global workspace switch.

## Navigation

`Home · Projects · Identity · Products · Locations · Studio · Gallery`

## Surfaces

- **Home** — operational launchpad; **Quick Create** is the main feature
  (project-first dependency cascade with explicit empty-state guidance), then metrics.
- **Projects** — list (search, status filter) + detail (Overview / Brands / Products
  / Locations / Generated work). An asset & visualization organizer, not a task tracker.
- **Identity** — brands + logo variants; project scope filter.
- **Products** — games/equipment + images; project, brand, and category filters.
- **Locations** — client sites/venues + photos; project + indoor/outdoor filters.
- **Studio** — the central generation workspace (Project → Brand/logo → Products →
  Location → Settings → Review → Generate) with an informative readiness state and a
  premium stage-based generation "cooking" canvas.
- **Gallery** — all generated work; filter by project (and brand/product/location/
  status/date); duplicate setup / regenerate / create variation.

## Backends

The app selects a data backend at runtime (see `docs/SUPABASE.md`): the Supabase
cloud backend (default when configured) or a localStorage **demo** backend for
tests/offline. The same repository contracts back both; project filtering and
empty-state behavior work in both.

## Generation seam (Phase 4)

`ImageGenerationAdapter` stays provider-agnostic. Today `MockImageAdapter` produces
placeholder results and drives the "cooking" UX; swapping in a real provider only
changes `getImageAdapter()` (see `docs/SUPABASE.md` §12).
