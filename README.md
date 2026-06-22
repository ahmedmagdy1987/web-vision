# Web Vision — Malahi visual-generation workspace (prototype)

Internal tool for the Malahi team to mock up how games/attractions look in client
locations. Built with Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn-style
UI on `radix-ui`. See the Phase 2 review package in
[`artifacts/web-vision-review/REVIEW.md`](artifacts/web-vision-review/REVIEW.md).

> **Prototype storage limitation (read me):** all data — brands, products, locations,
> generation jobs/results, and **uploaded images (stored inline as base64 data URLs)** —
> is persisted in the browser's `localStorage`. There is **no backend, auth, or cloud
> storage** in this phase. Uploads are capped at **8 MB each**; large/many uploads can
> exceed the per-origin quota, in which case the write fails gracefully (no crash) and a
> toast notifies the user. Result snapshots denormalize the location image, which adds to
> storage use. This is intentional for the prototype and is resolved by moving to cloud
> storage + a database in a later phase. Image generation is **mocked**
> (`src/lib/services/image-adapter`); no real image API is called.

Quality gates: `npm run typecheck`, `npm run lint`, `npm run build`. End-to-end tests &
screenshots: `npm run build` then `npm run test:e2e` (requires `npx playwright install chromium`).

## Phase 3 — Supabase foundation (auth, database, private storage)

Phase 3 adds a Supabase-backed foundation (authentication, Postgres + RLS, and
private cloud Storage) **behind the existing repository/service boundaries** — the
localStorage limitation above is resolved when Supabase is configured. The app
selects its backend at runtime:

- **Demo backend (default):** no Supabase env → localStorage (Phase 1/2 behaviour),
  so `npm run dev` and the Playwright suite work out of the box.
- **Supabase backend:** set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (copy `.env.example` → `.env.local`) to enable auth, Postgres, and private Storage.

> **Status (Phase 3.1 — live):** the Supabase backend is now **connected to a real
> dedicated project and runtime-verified** — authentication, live Postgres CRUD,
> RLS/organization isolation, and private Storage were all exercised against the
> cloud project. This is a **secured cloud-backed internal beta**. The localStorage
> demo backend is preserved for tests and offline development. See
> [`docs/SUPABASE.md`](docs/SUPABASE.md) for setup, the RLS/role model, storage
> strategy, auth bootstrap, and the Phase 4 image-provider seam;
> [`artifacts/web-vision-phase-3-1/REVIEW.md`](artifacts/web-vision-phase-3-1/REVIEW.md)
> for the live-connection review; and
> [`artifacts/web-vision-phase-3/REVIEW.md`](artifacts/web-vision-phase-3/REVIEW.md)
> for the original foundation review.

Additional quality gate: `npm run test:unit` (Vitest unit tests). Live Supabase
verification (requires `.env.local` configured for the project):
`npx playwright test e2e/supabase-auth.spec.ts e2e/supabase-persistence.spec.ts e2e/supabase-smoke.spec.ts --workers=1`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
