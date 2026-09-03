# CamPath design QA

- Source visual truth: `.design-audit/reference-light.png`, `.design-audit/reference-dark.png`
- Implementation evidence: `.design-audit/02-dashboard-light.png`, `.design-audit/03-dashboard-dark.png`
- Combined comparison: `.design-audit/04-comparison.png`
- Responsive evidence: `.design-audit/05-dashboard-mobile.png`, `.design-audit/06-dashboard-mobile-menu.png`
- Desktop viewport / CSS size: 1440 × 1024 at deviceScaleFactor 1
- Source pixels: 1487 × 1058; normalized to 1440 × 1024 in the combined comparison
- Implementation pixels: 1440 × 1024
- Mobile viewport / pixels: 390 × 844 at deviceScaleFactor 1
- State: signed-in owner dashboard with deterministic visual-QA data, light and dark themes

## Full-view comparison

The implementation preserves the selected visual system: fixed dark primary rail, pale/dark contextual class rail, 78px header, bright blue active/primary states, compact operational typography, restrained dividers, and equivalent light/dark geometry. Existing owner-specific dashboard content was intentionally preserved instead of replacing real product behavior with the teacher mock content.

## Focused comparison

- Navigation and class context: proportions, active state, labels, badges, status dots, account block and archive action match the target language closely.
- Header and theme control: hierarchy, compact date, page title and theme action remain stable between modes.
- Content surfaces: existing cards and tables inherit the new palette and border rhythm without nested elevation or decorative effects.
- Fonts/typography: system sans and the existing reading serif remain; scale and weight are legible at desktop and mobile widths.
- Colors/tokens: light and dark share semantic accent, attention, success and failure tokens; contrast is visibly preserved.
- Image quality/assets: no raster content is required by this application shell. Phosphor outline icons replace text glyphs and ad-hoc symbols.
- Copy: existing Uzbek application copy and real route labels are preserved.

## Findings

No actionable P0, P1 or P2 visual differences remain for the approved platform shell and theme scope.

- P3: The owner overview is intentionally denser and less lesson-centric than the teacher reference because it serves administrative corpus and approval work.
- P3: The production bundle remains above Vite's 500 kB advisory threshold; this predates the visual pass and does not block the rendered experience.

## Interaction and responsive checks

- Theme toggle changed the active theme to `light`.
- Primary navigation changed the URL to `#boshqaruv/odamlar`.
- Mobile drawer opened successfully and the scrim covered the inactive page.
- Console check contained one expected missing favicon request and no application runtime errors.

## Comparison history

1. Initial mobile menu capture was taken during its 180ms transition and was rejected.
2. Capture timing was corrected to wait 300ms after viewport change and after opening the drawer.
3. Revised mobile captures show the closed dashboard and fully open navigation without clipped controls.

## Follow-up polish

- A later product pass can give the owner overview a dedicated operational layout while preserving the new shell.
- Route-level code splitting can reduce the existing bundle warning.

## Engineering verification

- Frontend typecheck: passed.
- Frontend production build: passed.
- Navigation and theme suite: 22/22 passed.
- Full frontend suite: 114/116 passed. The two failures are the existing UTC-versus-America/Los_Angeles September boundary assertions in `academic-year.test.ts`; they are unrelated to the design changes.

final result: passed

---

# 2026-09-03 design refinement pass (scopes A-D)

A full-surface refinement pass over the approved shell, verified with the same
before/after capture workflow (`.design-audit/capture-pages.mjs`).

## What changed

**Foundations (scope A)**
- Fonts are now shipped, not assumed: `Inter Variable`, `Source Serif 4
  Variable` and `JetBrains Mono Variable` are imported through `@fontsource`
  in `main.tsx`. Every operating system now renders the same product instead
  of falling back to its local sans/serif/mono. `theme.css` tokens point at the
  variable families.
- Typography tokens: literal `Georgia` stacks in `styles.css` now use
  `var(--font-read)`; `:root` font-family uses `var(--font-ui)`.
- Radius set formalised (`--radius-sm 6`, `--radius 8`, `--radius-lg 12`,
  `--radius-xl 18`, `--radius-pill`) and literal radii across the shared
  stylesheet and shell aliased to them.
- Semantic colour fix: the student-game segmented control no longer paints its
  active tab green (`--awarded`); green stays reserved for awarded mark points,
  and the active tab uses the accent exactly like the grading-queue equivalent.
- Dead pre-shell chrome removed from `styles.css` (`.app` grid layout,
  `.ghost`, `.brand`, their media-query rules) — the classes have no render
  sites since the AppShell redesign.
- Hard-coded shell colours moved to tokens (`--nav-accent`, `--nav-hover`,
  `--brand-*`, `--avatar-*`) with identical values — no visual change, one
  source of truth.

**Lesson studio (scope B)**
- The lesson library now sits on its own light canvas (background, border,
  radius, shadow). In dark theme it previously let the dark shell background
  show through under dark ink text, which was unreadable. The canvas keeps its
  light presentation look in both themes; its edge follows the border token in
  dark mode.
- The six lesson CSS layers were reviewed but deliberately left as separate
  files: two of them are source-fidelity layers that use `!important` to win
  over the presentation palette, and Vite already concatenates them in import
  order into one stylesheet. Merging them would reorganise development files
  without changing the shipped CSS while risking ordering mistakes.

**Page polish (scope C)**
- Owner dashboard loading is now a layout-shaped shimmer skeleton that matches
  the real metrics/card grid, so the page no longer jumps from a text line to
  content.
- Auth brand mark now uses the same rotated-square mark as the product shell
  (drawn with CSS instead of a `◆` glyph), so signed-out visitors see the
  identity they will meet inside.

**Accessibility and micro-interaction (scope D)**
- Contrast corrections in the light palette (measured, WCAG 2.1):
  - `--text-muted` `#68758a` → `#5f6d82` (was 4.26:1 on soft surfaces, now
    4.94:1);
  - `--uncertain` `#b86412` → `#a85a0e` (3.95:1 → 4.65:1);
  - `--awarded` `#2d7d5a` → `#27734f` (4.49:1 → 5.15:1).
  Dark palette was already above threshold (checked 7.0:1+).
- Keyboard focus inside the dark navigation rail now draws in the rail accent
  (`--nav-accent`) instead of the ink accent that vanished against `--nav-bg`.
- Global button press state (`:active`) and colour transitions; secondary and
  danger buttons gained explicit hover states.
- Reduced-motion still disables all of the new animation.

## Verification evidence

- `npm run typecheck -w frontend` passes.
- `npm run build -w frontend` passes; fonts are emitted as subset woff2 assets
  and loaded only where their unicode ranges apply.
- Frontend tests: 124 passed; the only 2 failures are the pre-existing
  UTC-dependent `academic-year.test.ts` assertions (documented below and in
  earlier audit history) — unrelated to this pass.
- `.design-audit/after-manifest.json`: all 11 captured surfaces render
  signed-in, `document.fonts` reports the three variable families loaded on
  every page, and horizontal overflow is 0 on desktop and the two 390px mobile
  captures.
- Side-by-side evidence: `.design-audit/before/` vs `.design-audit/after/`
  with `.design-audit/compare-all.html` / `compare-all.png`.

## Remaining notes

- The Vite 500 kB advisory on the JS bundle predates this pass (route-level
  code splitting is the known follow-up).
- The two `academic-year.test.ts` failures are September-boundary assertions
  written against America/Los_Angeles while the runner is in UTC; they are
  date-dependent, not design regressions.
- Lesson CSS files remain separate by design (see scope B note above).
