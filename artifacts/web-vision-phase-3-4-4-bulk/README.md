# Phase 3.4.4 — bulk asset management (Part 5)

Screenshots for the Part-5 additions: checkbox-only product selection plus
multi-select + bulk archive/delete for **Locations** and **Logos** (parity with
Products).

Captured against the **localStorage demo backend** (seed data) via
`WV_FORCE_DEMO=1 npx playwright test phase344-bulk-screenshots`, so they reproduce
without live Supabase or credentials. No delete is ever confirmed (every dialog is
dismissed with Escape) and **no OpenAI request is made**.

| File | What it shows |
| --- | --- |
| 01-products-checkbox-selection-desktop | Products: always-visible checkboxes; selection is checkbox-only (image click = Lightbox) |
| 02-locations-selection-desktop | Locations: checkbox multi-select + floating selection bar |
| 03-locations-bulk-delete-confirmation | Locations bulk dialog — reference-aware delete/archive split |
| 04-logos-selection-desktop | Logos: checkbox multi-select + selection bar (Default badge relocated) |
| 05-logos-bulk-delete-confirmation | Logos bulk dialog — delete/archive split |
| 06-locations-bulk-selection-mobile | Locations multi-select on mobile (390×844) |
| 07-locations-bulk-delete-mobile | Locations bulk dialog on mobile |

The live-Supabase delete/lightbox captures from Part 1/2 remain in
`../web-vision-phase-3-4-4-final-release/`.
