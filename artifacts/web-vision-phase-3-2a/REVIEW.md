# Web Vision — Phase 3.2A Review

**Authentication onboarding recovery + sign-in branding fixes.** This phase
corrects the invited-user lifecycle so a real owner can be onboarded safely, and
refines the authentication screens and browser metadata to the Web Vision brand.
No main-application redesign. The synthetic verification owner was not removed,
and no real-owner invitation was sent automatically.

> No emails, user IDs, tokens, callback codes, passwords, keys, or environment
> values appear in this document.

---

## 1. Root cause

The owner clicked a real invitation and ultimately reached
`/sign-in?error=access_denied&error_code=otp_expired`, then saw the normal
email/password form despite never having set a password. Investigation found
**multiple defects** — the expired link was only the trigger:

1. **No password-setup flow existed.** `/auth/callback` only exchanged a PKCE
   `code` and redirected to `/`. There was no screen for an invited user to
   establish a password, and no detection that they needed to.
2. **The callback ignored the `token_hash` + `type` (verifyOtp) flow** and any
   Supabase error redirect, so invite/recovery links and error states fell
   through.
3. **`/sign-in` ignored the error parameters** (`access_denied` / `otp_expired`)
   and rendered the normal password form — the confusing state the owner saw.
4. **No forgot-password / self-service recovery flow** existed.
5. **Invitations were not pointed at an onboarding callback**, so even a valid
   link did not lead anywhere useful.

**Was the invitation expired, incomplete, or both?** **Both** — the specific link
had expired (`otp_expired`), *and* the onboarding flow was incomplete (no
password-setup path and no expired-link handling), so any invitation — expired or
not — could not complete.

**Duplicate Auth identity?** Not asserted here. The live Auth state must be
inspected before the owner action (below) to decide whether to re-invite the
existing intended identity or first remove an incomplete one. This phase did not
modify the real-owner identity or the synthetic verification owner.

## 2. Corrected onboarding flow

| Route | Behaviour |
| --- | --- |
| `/auth/callback` | Handles PKCE `code` **and** `token_hash`+`type` (verifyOtp); surfaces Supabase error redirects to `/auth/invite-expired`; routes invite/recovery sessions to `/auth/set-password`; `next` is open-redirect-validated. |
| `/auth/set-password` | Session-gated "Create your password" (new + confirm, show/hide, min length, mismatch rejected) via `supabase.auth.updateUser`; success → into the app; no session → guidance to request a fresh link. |
| `/auth/invite-expired` | Branded recovery state — link invalid, **no password was created**, request a new setup link, or contact the workspace admin. Generic (no enumeration). |
| `/auth/forgot-password` | `resetPasswordForEmail` with an explicit `/auth/callback?next=/auth/set-password` redirect; recovery callback → set-password → `updateUser`. Generic success messaging. |

- **First-password setup:** invited/recovering users always reach the dedicated
  password screen; they are never expected to know an auto-generated password.
- **Expired/invalid/reused link:** handled deliberately as a recovery state, never
  the bare sign-in form. `/sign-in` also detects the error params and shows an
  expired-link banner with a "Request a new setup link" action while keeping the
  form available.
- **Redirect configuration:** invites/resets target `/auth/callback` with a base
  derived from `NEXT_PUBLIC_SITE_URL` (server) or the browser origin (client);
  localhost is not hardcoded for production. The project's **Redirect URLs**
  allow-list must include the callback per environment (see `docs/SUPABASE.md` §6).
  Off-origin/unsafe `next` values are rejected (no open redirects).

## 3. Branding

- **Sign-in screen:** a shared branded `AuthCard` with the Web Vision `Aperture`
  mark, product name, and internal-workspace description; email + password with a
  **show/hide** control; **Forgot password?** link; clear loading / invalid-credentials
  / expired-invitation states; keyboard submission; accessible labels; correct
  `autocomplete` (`username`, `current-password`, and `new-password` on the
  password-creation screen). No public sign-up, no demo/admin/test prefill — the
  fields have no app-supplied defaults (any previously visible value was browser
  autofill, now governed by predictable autocomplete semantics; password managers
  are not disabled).
- **Favicon & metadata:** `src/app/icon.svg` (Aperture brand mark) replaces the
  default Next favicon; a generated apple touch icon (`src/app/apple-icon.tsx`),
  `src/app/manifest.ts`, and theme color `#6d28d9`.
- **Titles:** a `"%s — Web Vision"` template with per-page titles — e.g.
  **Sign in — Web Vision**, **Create your password — Web Vision**, **Studio — Web
  Vision**, **Gallery — Web Vision** (auth pages via server metadata; app routes via
  a small client title-setter).

## 4. Security

- **Redirect validation:** `safeNextPath` allows only same-origin relative paths;
  absolute/protocol-relative/backslash targets fall back to a safe default.
- **Token handling:** the invite/recovery token is consumed **server-side** in the
  route handler (code exchange / verifyOtp); no token or code is left in the
  browser address bar after a successful exchange, and none is logged.
- **Session requirements:** password creation/update requires a valid
  invite/recovery session; the set-password screen no-ops to a recovery prompt
  without one. Invitation sending stays a privileged server/admin operation.
- **Secrets:** the service-role key remains server-only and absent from the client
  bundle; no secrets in the working tree or git history; no passwords persisted
  outside Supabase Auth. No user-enumeration was introduced (generic messaging).
- **Protected routes:** unauthenticated access still redirects to `/sign-in`;
  `/sign-in` and `/auth/*` are the only public surfaces.

## 5. Tests & runtime verification

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 warnings |
| `next build` | success (auth routes, `icon.svg`, `apple-icon`, `manifest.webmanifest`) |
| `vitest run` (unit) | 34 passed |
| Live Playwright auth suite (`--workers=1`) | **14 passed** |
| Demo-backend regression (`WV_FORCE_DEMO=1`) | 40 passed + guarded supabase specs skipped |

Live auth suite breakdown (against the real project):

- **Branding (2):** Web Vision document title + non-generic favicon; auth screens
  render without horizontal overflow at desktop and mobile widths.
- **Onboarding (6):** valid invitation → Create-password → into the app; password
  mismatch rejected; expired/invalid invitation → recovery state (not the normal
  form); sign-in expired-link banner; forgot-password generic success; recovery
  link → set-password → password updated; sign-in has no app-supplied defaults and
  rejects bad logins.
- **Auth (2):** unauthenticated → `/sign-in`; sign in → protected nav → sign out.
- **Persistence (3) + smoke (1):** live CRUD, favorite/review, mock generation,
  and no console/page errors across routes/viewports — unchanged and still green.

Onboarding tests mint invite/recovery links with `generateLink` against temporary
users and clean them up; no real emails were sent and the owner's expired token was
not reused. Two demo-suite failures were transient `ERR_INSUFFICIENT_RESOURCES`
flakes under heavy parallelism and passed on a single-threaded re-run.

## 6. Required next owner action

After this corrected flow is committed, pushed, and running, the owner should take
**one** action — chosen after inspecting the live Auth state (do not guess):

1. **Preferred — resend a fresh invitation** to the intended real-owner identity
   through the corrected flow:
   ```bash
   node --env-file=.env.local scripts/invite-user.mjs <real-owner-email>
   ```
   This sends an invite whose redirect lands on `/auth/callback?next=/auth/set-password`.
   Ensure the environment's callback URL is in the project's Redirect URLs allow-list.
2. **Only if Supabase rejects re-inviting an existing pending identity** — remove
   *only that incomplete invited Auth identity* (not the synthetic verification
   owner), then re-invite via step 1.

Do **not** remove the synthetic verification owner, and do **not** perform the final
organization-owner handover in this phase. A later phase will verify the real owner
session and then retire the synthetic account.

## 7. Remaining limitations

- Image generation is still **mocked** (Phase 4 swaps `getImageAdapter()`).
- Self-service recovery uses the standard password-reset email; if a project
  disables self-service, the recovery screen directs users to the admin.
- The localStorage→Supabase importer remains a non-UI utility (deferred).
- 2 moderate `postcss` advisories (transitive via `next@16.2.9`) are accepted —
  build-time only, no runtime exposure; the only offered fix is a rejected major
  downgrade.
- Local `supabase start` still requires Docker; live work uses the remote project.
