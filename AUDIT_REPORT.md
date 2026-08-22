# ENVOY — GOD-LEVEL PRODUCTION AUDIT

**Audit date:** August 22, 2026
**Repository state audited:** `91d567f` (main, clean, synced with origin/main)
**Validation baseline:** `npm run typecheck` PASS · `npm run lint` PASS · `npm run build` PASS
**Scope:** Entire codebase — architecture, security, AI system, documents, ATS, portfolio, database, accessibility, performance, testing, dependencies, UX, production readiness.

**Verdict up front:** ENVOY is a well-architected application with genuinely strong offline/demo functionality, a real deterministic ATS engine, and a sound provider abstraction. It is **NOT production-ready**. The blocking issues are: (1) the public portfolio feature is architecturally broken under the repository's own RLS schema, (2) cloud-mode persistence has never been deployed or tested, (3) AI-proposed edits are applied without runtime validation, creating a prompt-injection → data-corruption path, and (4) zero automated tests exist. Findings below are verified against actual code, not assumed from CHANGELOG claims.

**Severity counts:** 3 CRITICAL · 8 HIGH · 18 MEDIUM · 14 LOW · 8 INFO

---

## 1. ARCHITECTURE

### A1 — Dual parallel diff systems; store diff engine is dead code — MEDIUM
- **Path:** `src/stores/document.ts` (lines 35–36, 288–336) vs `src/components/AgentSidebar.tsx` + `src/app/editor/page.tsx`
- **Problem:** The Zustand store implements a complete diff-review engine (`pendingDiffs`, `acceptDiff`, `rejectDiff`, `editDiff`, `acceptAllDiffs`, `rejectAllDiffs`) that is never invoked by any UI. The actual accept/reject flow is implemented separately inside `AgentSidebar` (inline JSON parsing) and `editor/page.tsx` (`handleAcceptProposal`). Two competing abstractions for the same concern.
- **Why it matters:** Maintenance hazard — future changes to one system silently diverge from the other; the store's version is more principled (per-diff status tracking) but unused.
- **Verify:** `grep -r "acceptDiff\|pendingDiffs" src/` → only store definitions, zero call sites.
- **Fix:** Either migrate the sidebar flow onto the store engine or delete the dead store actions. Prefer migrating: it centralizes diff state and enables persistence to `ai_actions`.
- **Priority:** 2nd wave.

### A2 — AI conversations are ephemeral despite a complete persistence layer — MEDIUM
- **Path:** `src/lib/db.ts` (`dbConversations`), `src/app/editor/page.tsx` (`handleSendMessage`)
- **Problem:** `dbConversations.save` is never called anywhere. The editor creates a conversation object in local `useState` and never persists messages. Chat history is lost on refresh. `dbConversations.getAll` is also never called.
- **Why it matters:** Contradicts the documented Phase 7/8 behavior; users lose AI context on reload; the `ai_conversations`/`ai_messages` tables are dead schema.
- **Verify:** `grep -rn "dbConversations" src/` → only definition + import in editor (imported but unused for save).
- **Fix:** Persist conversation on each message (debounced), load on editor mount.
- **Priority:** 2nd wave.

### A3 — Dead feature surfaces in domain/store — LOW
- **Path:** `src/stores/document.ts` (`commandPaletteOpen`, `setCommandPaletteOpen`, `selectedText`, `setSelectedText`), `src/app/dashboard/page.tsx` (`activeTab` includes `'settings'` with no UI), `profileTab` includes `'certifications'` with no tab UI.
- **Problem:** Command palette, text-selection context, settings tab, and certifications editor are declared but unimplemented.
- **Why it matters:** Certifications are part of the canonical profile and render in templates, but can never be added/edited through the UI (only via AI ingestion).
- **Fix:** Implement certifications tab (highest value) or trim the unions.
- **Priority:** 3rd wave.

### A4 — Server/client boundary is correct; dependency direction is clean — INFO
- **Path:** `src/lib/ai/provider.ts` (server-only usage), `src/lib/security/*` (server-only), `src/lib/db.ts` (client-only by design).
- **Verified:** AI provider keys are only read inside route handlers; no client bundle includes them. `db.ts` is browser-dispatched by design (documented dual-mode). No circular imports detected.
- **Note:** `db.ts` opens with a file-wide `eslint-disable @typescript-eslint/no-explicit-any` and uses `any` in all row mappers — technically violates the project's own "no `any`" quality bar. Same for `src/app/api/ingest/route.ts`.
- **Fix:** Type the Supabase row shapes properly (or generate Database types via Supabase CLI).
- **Priority:** 3rd wave.

### A5 — README documents a repository that does not exist — MEDIUM
- **Path:** `README.md` (Project Structure, Roadmap, Quick Start, links)
- **Problem:** Describes a monorepo (`apps/agent`, `apps/parser`, `apps/web`, `packages/`), a `dev` branch, `.github/`, `CONTRIBUTING.md`, `LICENSE`, and a Python prerequisite — none exist. Roadmap checkboxes all unchecked despite Phases 0–15 complete. Quick start says `cp .env.example .env` (Next.js loads `.env.local`).
- **Why it matters:** First impression for any contributor/recruiter is wrong; onboarding instructions fail.
- **Fix:** Rewrite README to match the actual single Next.js app; add LICENSE/CONTRIBUTING or remove links.
- **Priority:** 1st wave (cheap, high visibility).

---

## 2. SECURITY

### S1 — Public portfolio is architecturally broken under the repo's own RLS — CRITICAL
- **Path:** `src/app/p/[slug]/page.tsx` (lines 24–31) + `supabase/schema.sql` (lines 295–298, 365–367)
- **Problem:** The public page (anonymous visitor) calls `dbPortfolios.getBySlug(slug)` — allowed by the `portfolio_sites` public SELECT policy — then calls `dbProfile.get(portfolioSite.userId)`. The `profiles` RLS policy is `auth.uid() = user_id` ONLY. An anonymous (or other-user) visitor **cannot read the profile row** → `profile` stays null → every public portfolio renders the 404 screen. The flagship Phase 14 feature cannot work in cloud mode as schemed.
- **Why it matters:** The feature is dead-on-arrival in production mode; any "fix" that simply opens `profiles` to anonymous reads would leak the ENTIRE canonical profile (phone, email, every section) to the internet — a worse outcome.
- **Verify:** Read schema.sql profiles policy; trace `dbProfile.get` in the portfolio page. No server-side data assembly exists for public pages.
- **Fix:** Create a dedicated public projection: either (a) a `public_portfolio_data` JSONB column on `portfolio_sites` populated on publish, with an RLS policy allowing anonymous SELECT of that column via a security-definer function `get_public_portfolio(slug)`, or (b) a server route `/api/p/[slug]` using the service-role key server-side that returns only whitelisted fields for public/unlisted sites. Option (b) also fixes the SEO problem (S9).
- **Priority:** 1 (blocks Phase 14's core promise).

### S2 — Cloud-mode persistence is entirely unverified — CRITICAL
- **Path:** `supabase/schema.sql`, `src/lib/db.ts`, `src/lib/supabase/*`
- **Problem:** No evidence the schema was ever executed against a Supabase project. Every cloud code path (auth, documents, versions, ATS, portfolios) is theoretical. The dual-mode dispatcher means bugs in cloud mode are invisible in the demo environment that all development has used.
- **Why it matters:** "Builds and lints" says nothing about whether a single cloud write succeeds. First real deployment will hit untested SQL (e.g., `handle_new_user` trigger, JSONB shape mismatches, `documents.target_job_id` has no FK despite the comment claiming one).
- **Verify:** No migration tooling, no seed script, no integration test, no deployment doc beyond schema.sql header comment.
- **Fix:** Stand up a staging Supabase project, apply schema.sql, run a scripted smoke test of every `db*` operation in cloud mode, and record results. (Per project rules: do this when the user supplies credentials; do not invent them.)
- **Priority:** 1 (before any public launch).

### S3 — AI-proposed edits applied without runtime validation (prompt-injection → data corruption) — CRITICAL
- **Path:** `src/components/AgentSidebar.tsx` (`matchJsonCodeBlock`, lines 140–157), `src/app/editor/page.tsx` (`handleAcceptProposal`, lines 354–401)
- **Problem:** The AI's ```json block is `JSON.parse`d and blindly cast to `ProposeEditData`. `handleAcceptProposal` then executes `{ ...exp, [proposal.field]: proposal.newValue }` where `field` is an arbitrary string from model output. A malicious job description (or crafted resume text) can instruct the model to emit `field: "id"`, `field: "startDate"`, or any other key — silently overwriting properties the diff UI never shows (the UI only displays `originalValue`/`newValue` of the *claimed* field). `sectionType: "summary"` writes `updatedProfile.summary` directly with no length/content constraint.
- **Why it matters:** This is the exact "AI cannot arbitrarily corrupt the canonical document" guarantee the architecture promises. The version checkpoint created before apply makes it *recoverable*, but the corruption itself is invisible to the user who clicks Accept.
- **Verify:** Trace `parsed.data as ProposeEditData` (unvalidated cast) → `onAcceptProposal` → computed-key spread. No Zod schema is applied anywhere on this path (the existing `src/lib/validation/schemas.ts` is dead code — see S8).
- **Fix:** Validate the proposal with a strict Zod schema (`sectionType` enum, `field` whitelist per sectionType, `itemId` must exist in the profile, string length caps) inside `handleAcceptProposal` before any mutation; reject-and-toast on failure. Show the *actual* target field in the diff card.
- **Priority:** 1.

### S4 — SSE stream parsing drops tokens on chunk boundaries — HIGH
- **Path:** `src/lib/ai/provider.ts` — OpenAI `stream()` (lines ~125–160), Anthropic (lines ~264–290), OpenRouter (lines ~381–400)
- **Problem:** Each network chunk is decoded and `split('\n')` independently. An SSE line split across two TCP chunks (common under real latency) fails `JSON.parse` and is silently discarded — the Gemini provider does this correctly with a line buffer; the other three do not.
- **Why it matters:** Intermittent garbled/truncated AI responses in production that cannot be reproduced locally on fast connections.
- **Verify:** Compare Gemini `stream()` (buffered, lines 531–566) vs OpenAI (unbuffered).
- **Fix:** Extract the Gemini-style buffered line reader and reuse it in all four providers.
- **Priority:** 1st wave.

### S5 — No timeout, abort, or retry on any AI provider call — HIGH
- **Path:** `src/lib/ai/provider.ts` (all `fetch` calls in all four providers)
- **Problem:** No `AbortSignal.timeout`, no retry/backoff, no circuit breaking. A hung upstream connection blocks the route handler indefinitely (serverless function timeout eventually kills it, after burning wall-clock and money).
- **Fix:** Wrap provider fetches with `AbortSignal.timeout(60_000)` (configurable), add one retry with jitter for 429/5xx, and surface provider errors as typed failures.
- **Priority:** 1st wave.

### S6 — Client-side open redirect on login — MEDIUM
- **Path:** `src/app/login/page.tsx` (line 40: `router.push(searchParams.get('redirectTo') || '/dashboard')`)
- **Problem:** `redirectTo` is used unsanitized. A crafted link `/login?redirectTo=//evil.com` may navigate the victim off-site after sign-in (protocol-relative URL handling varies by Next version; must not rely on it). The server-side equivalent was fixed in Phase 15 (`/api/auth/callback`); the client path was not.
- **Fix:** Apply the same `sanitizeRedirectPath` rule (must start with `/`, not `//`, charCode(1) !== 92) before `router.push`.
- **Priority:** 1st wave (trivial fix).

### S7 — New portfolios default to `public` — HIGH (privacy)
- **Path:** `src/app/dashboard/page.tsx` (`loadUserWorkspace`, line 170: `visibility: 'public'`)
- **Problem:** Every new user's portfolio is created **public by default**, while the DB schema default is `private` and `UserPreferences.allowPublicPortfolio` (default false) exists but is never consulted. Publishing personal data (name, email, phone, employment history) to the internet without explicit opt-in is a privacy anti-pattern and likely a compliance problem (GDPR-style expectations).
- **Fix:** Default to `private`; require explicit "Publish" action that flips visibility and sets `publishedAt`; consult `allowPublicPortfolio`.
- **Priority:** 1st wave (must land before S1 is fixed, or the moment portfolios become viewable the data goes public).

### S8 — The entire Zod validation layer is dead code — MEDIUM
- **Path:** `src/lib/validation/schemas.ts` (293 lines)
- **Problem:** Imported by nothing. `zod` is referenced only inside this file. The API routes use the Phase 15 structural guards instead (deliberate, documented), but the schemas — including `SignUpSchema`, `FileUploadSchema`, `ExportRequestSchema` — were never wired anywhere (signup page does manual checks; ingest does its own).
- **Why it matters:** Either the schemas should be the single validation source of truth (preferred — reuse them in the Phase 15 guards and the S3 proposal validator) or they are 293 lines of misleading dead code.
- **Fix:** Wire `SignUpSchema`/`SignInSchema` into login/signup, and build the S3 proposal schema alongside these. Delete anything still unused after wiring.
- **Priority:** 2nd wave.

### S9 — Portfolio SEO fields are dead schema; no metadata rendered — MEDIUM
- **Path:** `src/app/p/[slug]/page.tsx` (client component, no `generateMetadata`), `supabase/schema.sql` (`seo_title`, `seo_description`, `social_image_url`)
- **Problem:** `seoTitle`/`seoDescription`/`socialImageUrl` are stored but never rendered; the page is `'use client'` so server metadata generation is absent; no OpenGraph/Twitter tags; no robots directives distinguishing public vs unlisted.
- **Fix:** Convert the page to a server component that fetches via the S1 public projection and exports `generateMetadata` (title, description, OG tags, `robots: noindex` for unlisted).
- **Priority:** 2nd wave (pairs with S1).

### S10 — CSRF posture — LOW
- **Path:** All API routes; Supabase SSR cookie auth.
- **Verified:** Supabase sets `SameSite=Lax` cookies by default, which blocks cross-site POST cookie attachment in modern browsers. No state-changing route accepts unauthenticated requests in cloud mode. Demo mode is open by design (no secrets at risk). No CSRF tokens, acceptable given the above; revisit if cookie policy changes.
- **Priority:** Monitor.

### S11 — SSRF / path traversal / XSS — INFO (no findings)
- **Verified:** No server-side fetch of user-supplied URLs (job `url` is stored, never fetched). Ingestion parses uploads in memory — no filesystem writes, no path traversal surface. No `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` anywhere (grep-verified). React escaping covers user content rendering.

### S12 — Secret handling — INFO (no findings)
- **Verified:** `.gitignore` covers all env files; no secrets in repo; `.env.example` contains placeholders only; AI keys read exclusively in server route handlers; `NEXT_PUBLIC_*` exposure is by design. `SUPABASE_SERVICE_ROLE_KEY` is declared in `.env.example` but never used in code — good (keep it that way until a server-side public-projection route needs it, then use it only there).

### S13 — Error-message leakage — LOW (residual)
- **Path:** `src/lib/auth.ts` (Supabase error messages passed to UI), client `console.error` calls.
- **Verified:** Server routes return sanitized 500s (Phase 15). Supabase auth errors surfaced to the login form are user-facing by design. Residual risk is minimal; keep an eye on new routes.

---

## 3. AI SYSTEM

### AI1 — Provider abstraction is sound; multi-provider capability preserved — INFO
- **Path:** `src/lib/ai/provider.ts`
- **Verified:** Four providers (OpenAI, Anthropic, Gemini, OpenRouter) behind one interface; factory via `ENVOY_AI_PROVIDER`; per-provider model env overrides; structured-JSON mode per provider; streaming per provider. Phase 15 hardening did not regress this. Mock fallback preserved when keys are missing.

### AI2 — Structured tool output is unvalidated end-to-end — see S3 (CRITICAL)
- The `structured<T>()` method JSON.parses and casts; the chat proposal path parses markdown-fenced JSON and casts; the accept path applies without validation. One Zod pass at the accept boundary (S3 fix) closes the loop.

### AI3 — Malformed model responses handled inconsistently — MEDIUM
- **Path:** `provider.ts` `structured()` implementations.
- **Problem:** All four providers strip code fences and `JSON.parse`; on failure they throw with a 200-char snippet of model output included in the error message — which, post-Phase-15, is logged server-side (good) but the *jobs/extract* route catches and falls back (see S14 regression). The chat route has **no structured-output retry**: if the model wraps JSON in prose variants the fence-strip misses (e.g., ```` ```JSON ```` uppercase, or fences with language tags like ```` ```json5 ````), the proposal is silently not rendered (regex requires exactly ```` ```json\n ````).
- **Fix:** Case-insensitive fence regex; one retry with a "return ONLY valid JSON" corrective message on parse failure.
- **Priority:** 2nd wave.

### AI4 — Token/context budgeting absent — LOW
- **Path:** `src/lib/ai/context.ts`
- **Problem:** Full profile text + up to 3,000 chars of job description + full conversation history (up to 50 messages × 20k chars each post-Phase-15 caps) are sent every request. No token estimation or trimming of old messages. With the 50-message cap a long conversation can exceed model context and fail opaquely.
- **Fix:** Trim history to last N messages / estimated token budget; cap profile text sections.
- **Priority:** 3rd wave.

### AI5 — Model selection from user preferences is unwired — LOW
- **Path:** `src/types/index.ts` (`UserPreferences.aiProvider/aiModel`), `provider.ts` (env-only selection).
- **Problem:** Domain models anticipate per-user provider/model; the factory is env-global only. Consistent with current single-tenant-key design; note as future work, not a defect.

### AI6 — Diff generation is string-swap, not structural diff — LOW
- **Path:** `AgentSidebar.tsx` proposal card.
- **Problem:** "Diff" UI shows before/after blocks (original struck through, proposed below) — no line-level diff despite the `diff` npm package being installed (unused). Acceptable UX; the installed dependency is dead weight (see D1).

### AI7 — Accept flow creates a version checkpoint first — INFO (verified good)
- **Path:** `editor/page.tsx` lines 363–369. `createVersion(..., 'ai_accept', ...)` runs before mutation and persists via `dbVersions.save`. Rollback path exists. This is the strongest safety property in the AI pipeline; keep it mandatory in the S3 fix.

---

## 4. DOCUMENT SYSTEM

### D1 — Exports ignore the document's section configuration — MEDIUM
- **Path:** `src/lib/export/docx.ts` (param `_document` unused), `src/lib/export/txt.ts` (no document param at all)
- **Problem:** Both exporters emit ALL profile sections in a fixed order, ignoring `document.sections` visibility/order that the A4 canvas honors. The exported file can differ materially from the preview the user approved. Additionally, certifications, achievements, publications, awards, volunteering, languages, interests, and customSections are never exported.
- **Verify:** Toggle a section invisible in the editor, export DOCX/TXT → section still present.
- **Fix:** Drive both exporters from `document.sections` (visible, ordered), and add the missing sections.
- **Priority:** 2nd wave.

### D2 — "in undefined" education bug in both exporters — MEDIUM
- **Path:** `docx.ts` line 171, `txt.ts` line 47: `` `${edu.degree} in ${edu.field}` ``
- **Problem:** When `edu.field` is undefined the output literally reads "B.S. in undefined". `TemplateRenderer` handles this correctly (conditional); the exporters do not.
- **Fix:** Conditional join as in TemplateRenderer.
- **Priority:** 1st wave (one-line fixes, user-visible corruption of exported files).

### D3 — No undo/redo; rollback is the only recovery — MEDIUM (design gap, documented)
- **Path:** `src/stores/document.ts`, editor.
- **Problem:** No undo stack. Version checkpoints are created only on AI-accept (trigger `'manual'`/`'import'`/`'auto'` exist in the type and schema but no UI creates them). The version-history modal's empty-state text claims "Checkpoints are automatically captured during key changes" — currently false; only AI accepts checkpoint.
- **Fix:** Add a manual "Save checkpoint" button in the version modal (trivial), and consider periodic auto-checkpoints (trigger `'auto'`) on significant edits.
- **Priority:** 2nd wave.

### D4 — Ingestion replaces the entire canonical profile without confirmation — MEDIUM
- **Path:** `src/app/dashboard/page.tsx` (`handleIngestFile`)
- **Problem:** Uploading a resume overwrites the whole master profile (only `userId` is re-stamped). A user with a carefully curated profile who uploads "just to see" destroys it (recoverable only if a version happened to exist — ingest creates none).
- **Fix:** Create a version checkpoint (`trigger: 'import'`) before applying; show a confirm dialog summarizing what will be replaced.
- **Priority:** 2nd wave.

### D5 — Ingestion parsing robustness — LOW
- **Path:** `src/app/api/ingest/route.ts`
- **Verified:** PDF/DOCX parse failures are caught and return sanitized 500s; empty-text guard exists; heuristic fallback exists when no AI keys. AI-mapped fields are coerced with `String()`/`Array.isArray` guards — malformed model output degrades to empty strings rather than crashing. `proficiency` is cast `as any` into the LanguageEntry union — an out-of-enum value from the model would be stored and could render oddly; validate against the enum. LOW.

### D6 — Print/PDF fidelity for long resumes — MEDIUM
- **Path:** `src/components/A4Canvas.tsx` ("Page 1 of 1" hardcoded), `src/app/globals.css` (print rules)
- **Problem:** The canvas renders a single growing A4 sheet (`min-h-[1123px]`); content beyond one page has no page-break logic, so multi-page resumes print as one long clipped/awkward page. `estimatePageCount` in the ATS engine knows the resume is 2+ pages; the canvas and print output do not act on it.
- **Fix:** Insert print page-break markers every ~1123px of content height, or paginate sections; update the page indicator.
- **Priority:** 2nd wave.

### D7 — TemplateRenderer covers 5 of 13 section types — LOW
- **Path:** `src/components/TemplateRenderer.tsx` (`renderSectionContent` switch)
- **Problem:** Renders summary/experience/education/skills/projects/certifications only. Achievements, publications, awards, volunteering, languages, interests, custom sections are silently dropped from the canvas too — consistent with the exporters (D1) but means the domain model's richness is unreachable.
- **Fix:** Extend renderer + exporters together (same wave as D1).

---

## 5. ATS ENGINE

### T1 — Engine is genuinely deterministic and reasonable — INFO
- **Path:** `src/lib/ats/analyzer.ts`
- **Verified:** Pure function of (profile, document, jobTarget); weighted subscores; no AI dependency at analysis time (AI only pre-extracts the job target); clamped 0–100; issues carry severity/category/suggestion. Server-side execution enforced (Phase 15).

### T2 — Substring keyword matching inflates scores — MEDIUM
- **Path:** `analyzer.ts` `analyzeKeywords` (line 246: `resumeText.includes(keyword.toLowerCase())`)
- **Problem:** "go" matches "google", "rest" matches "restore", "css" matches "success". Match percentage and missing-keyword lists are unreliable for short keywords.
- **Fix:** Token/word-boundary matching (`\b` regex with escaped keywords), plus optional alias map.
- **Priority:** 2nd wave.

### T3 — Declared risk checks are unimplemented; dead exports — LOW
- **Path:** `analyzer.ts` lines 40–44 (`ATS_RISK_PATTERNS.tables`, `.multiColumn` never referenced), `severityColor`/`scoreColor` (exported, never imported).
- **Fix:** Implement the table/multi-column checks against the rendered text, or delete the patterns; delete or use the color helpers.
- **Priority:** 3rd wave.

### T4 — Default keyword score of 70 with no job target — LOW
- **Path:** `analyzer.ts` line 236.
- **Problem:** Arbitrary constant blended into the overall score when no target exists; the UI doesn't explain it. Acceptable heuristic; document it in the UI ("no target job — keyword score estimated").

---

## 6. PORTFOLIO

### P1 — Public viewing broken in cloud mode — see S1 (CRITICAL)
### P2 — Default visibility public — see S7 (HIGH)
### P3 — Slug validation absent — MEDIUM
- **Path:** `src/app/dashboard/page.tsx` (slug input, line ~1219), `supabase/schema.sql` (`slug TEXT NOT NULL UNIQUE`)
- **Problem:** Client transforms spaces→dashes and lowercases, but no charset/length/reserved-word validation; empty string possible; collision with another user's slug surfaces as a generic save failure toast. Slug edits after publishing silently change the public URL (old links die, no redirect).
- **Fix:** Validate `^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$`, reserve `api`, `p`, `dashboard`, etc.; surface unique-violation as a friendly message; warn before changing a published slug.
- **Priority:** 2nd wave.

### P4 — Unlisted ≡ public in behavior — LOW
- **Path:** schema RLS (`visibility IN ('public','unlisted')` for anonymous SELECT), page logic (only `private` blocked).
- **Problem:** Unlisted differs from public only in intent; no `noindex` signal (ties to S9). Acceptable interim; make unlisted `noindex` when metadata lands.

### P5 — Empty states handled; responsive layouts present — INFO
- **Verified:** All three themes handle missing summary/sections gracefully (conditional rendering); grids collapse on mobile; 404 state for missing/private sites. Loading spinner lacks an accessible label (see AC4).

### P6 — Portfolio themes: `creative` union member unreachable — LOW
- **Path:** `src/types/index.ts` (`PortfolioTheme` includes `'creative'`), schema CHECK includes it, UI offers minimal/developer/bold only. Harmless; align or implement.

---

## 7. DATABASE / SUPABASE

### DB1 — What actually works today (verified)
- **Offline/demo mode (no env):** profiles, documents, versions, job targets, ATS reports, portfolios, preferences → localStorage via `src/lib/storage/local.ts`. Auth simulated via `localStorage` polling. AI routes serve deterministic mocks. **This path is real and coherent.**
- **Cloud mode:** code paths exist and are type-checked, but **nothing has ever been executed against a live Supabase project** (see S2). Auth callback, middleware session refresh, and RLS-gated reads are standard patterns but unverified here.

### DB2 — Schema vs code drift — MEDIUM
- **Path:** `supabase/schema.sql` vs `src/lib/db.ts`
- **Findings:**
  - `documents.target_job_id` — comment says "references job_targets" but **no FK constraint** exists (integrity gap; deleting a job target leaves dangling ids).
  - `uploads`, `exports`, `share_links`, `ai_actions` tables + RLS exist but **no application code reads or writes them** (schema ahead of implementation — fine, but document it).
  - `handle_new_user` trigger auto-creates profile + preferences on signup; the dashboard's `loadUserWorkspace` also creates a profile if missing — benign race (unique constraint protects), but the client upsert can overwrite the trigger-created row with an equivalent one. Acceptable; note it.
  - `uuid-ossp` used instead of Supabase-recommended `gen_random_uuid()` — works; consider switching for consistency.
  - No storage bucket provisioning for `uploads.storage_path` (feature unused anyway).
- **Fix:** Add the FK (or drop the comment), document unused tables, switch to `gen_random_uuid()` in the next schema revision.

### DB3 — Unbounded growth in cloud tables — LOW
- **Path:** `db.ts` — `dbVersions.save` inserts without limit (local caps at 50); `dbATSReports.save` inserts forever (local caps at 20).
- **Fix:** Retention policy (keep last N per document) via scheduled cleanup or insert-time delete.

### DB4 — RLS policies exist in-repo (correction to Phase 15 CHANGELOG) — INFO
- The Phase 15 CHANGELOG states "RLS policies remain intentionally unconfigured" — **imprecise**: policies ARE defined in `supabase/schema.sql`; what's unconfigured is a live project (deployment untested). The substantive gap is S1 (profiles not readable for public portfolios — by design) and S2 (never deployed).

### DB5 — What must happen when credentials arrive (checklist)
1. Apply `supabase/schema.sql` to staging; verify trigger-created profile/preferences rows.
2. Scripted smoke test of every `db*` operation in cloud mode (create/read/update/delete per entity).
3. Verify middleware session refresh + `/api/auth/callback` exchange against the real project.
4. Implement S1 public projection (service-role server route or publish-time snapshot column).
5. Flip S7 default visibility to private before enabling public reads.
6. Confirm email confirmation/redirect URLs in Supabase auth settings match `NEXT_PUBLIC_APP_URL`.

---

## 8. ACCESSIBILITY

### AC1 — Foundation is now solid (Phase 15 verified) — INFO
- **Verified in code:** skip link, `:focus-visible` global ring, `prefers-reduced-motion` kill-switch, dialog roles + `aria-modal` + labelled titles on all three overlays, Escape + backdrop close, accessible names on all icon-only buttons, `htmlFor`/`id` associations on all forms, `aria-live` chat stream + toasts, `role="alert"` errors, `aria-pressed` pane toggles, `lang="en"`.

### AC2 — No focus trapping or focus restoration in dialogs — MEDIUM
- **Path:** dashboard create modal, editor versions modal, section-edit panel.
- **Problem:** Keyboard users can Tab out of an open modal into background content; on close, focus returns to `<body>` rather than the trigger. WCAG 2.4.3/2.1.2 concerns.
- **Fix:** Small `useModalA11y` hook (trap Tab within dialog, restore focus to opener on close). Radix Dialog (already a dependency, unused!) provides this for free if adopted.
- **Priority:** 2nd wave.

### AC3 — Contrast failures in tertiary text — MEDIUM
- **Path:** `tailwind.config.ts` tokens; used throughout (`text-[#5c5c7a]` on `#050507` ≈ 3.9:1; `text-[#9898b3]` ≈ 7:1 OK).
- **Problem:** `envoy.text.tertiary` (#5c5c7a) fails WCAG AA (4.5:1) for normal-size text; it's used for helper copy, timestamps, placeholders.
- **Fix:** Lighten tertiary to ≈ #6b6b8a (≥4.5:1) or restrict it to large/bold text.
- **Priority:** 2nd wave.

### AC4 — Loading spinners unnamed; `animate-spin-slow` doesn't exist — LOW
- **Path:** `src/app/dashboard/page.tsx` (loading Logo uses `animate-spin-slow` — not defined in tailwind.config, so the logo never spins), portfolio loading spinner has no `role="status"`/label, editor loading has visible text (OK).
- **Fix:** Define the animation or use `animate-spin`; add `role="status"` + `aria-label="Loading"` to the portfolio spinner.
- **Priority:** 3rd wave.

### AC5 — `window.confirm`/`alert` for destructive flows — MEDIUM (UX/a11y overlap)
- **Path:** editor rollback, document delete, ingestion errors, job-target updates, AI-accept success.
- **Problem:** Native dialogs are unstyled, block the main thread, are not announced consistently by screen readers, and clash with the existing toast system. Mobile UX is poor.
- **Fix:** Replace with the toast system + an inline confirm pattern (or adopt Radix AlertDialog, already installed).
- **Priority:** 2nd wave.

---

## 9. PERFORMANCE

### PF1 — Bundle state is healthy post-Phase 15 — INFO
- **Verified:** Editor 16.6 kB page / 186 kB First Load (was 117 kB / 287 kB); dashboard 11.3 kB; shared 100 kB. `next/font` self-hosted with `display: swap`. No images anywhere (no `<img>`/`next/image` usage → no image pipeline risk). Middleware 90 kB (standard Supabase SSR weight).

### PF2 — TemplateRenderer memoization effective — INFO
- **Verified:** `React.memo` + `useCallback` selection handler; zoom/export-menu/overlay state changes no longer re-render the resume sheet. Profile/document edits still re-render (correct — data changed).

### PF3 — Remaining render hot spots — LOW
- **Path:** `editor/page.tsx` — every keystroke in the document-title input runs `updateDocument` → new document object → autosave debounce reset + A4Canvas re-render (canvas re-sorts sections). Acceptable at current scale; if lag reported, debounce title into local state and commit on blur.
- **Path:** `dashboard/page.tsx` — every identity keystroke calls `saveProfile` → `dbProfile.save` (network write per keystroke in cloud mode!). This one is real: typing an email fires a Supabase upsert per character. **Upgrade to MEDIUM in cloud mode.**
- **Fix:** Local form state + debounced persistence (mirror the editor's 1.5 s pattern).
- **Priority:** 2nd wave.

### PF4 — Portfolio page fetches on every visit, client-side — LOW
- **Path:** `src/app/p/[slug]/page.tsx`
- **Problem:** Client-side fetch → blank spinner on every load, no CDN caching, poor LCP. The S1/S9 server-component conversion fixes this simultaneously (ISR-able).
- **Priority:** bundled with S1.

### PF5 — No streaming/ISR/caching config anywhere — INFO
- All pages are static or client-fetch; API routes are dynamic. Fine at current scale; revisit when portfolio goes server-rendered.

---

## 10. TESTING

### TS1 — Zero tests exist; tooling installed but non-functional — HIGH
- **Path:** `package.json` (`test`, `test:watch`, `test:e2e` scripts), devDependencies (vitest, @vitejs/plugin-react, @testing-library/*, jsdom, @playwright/test)
- **Problem:** No `vitest.config.*`, no `playwright.config.*`, no `*.test.*`/`*.spec.*` files anywhere (verified by filesystem search). `npm test` fails immediately. The testing story is aspirational.
- **Why it matters:** Every refactor (including the recommended fixes below) is unguarded. The ATS analyzer, security guards, validators, and proposal-accept logic are pure functions — ideal cheap test targets.
- **Recommended first suite (priority order):**
  1. `analyzer.test.ts` — ATS scoring invariants (deterministic, pure).
  2. `rate-limit.test.ts` — window sliding, limit enforcement, key isolation.
  3. `request.test.ts` — validators/narrowers accept/reject matrices.
  4. `proposal-validation.test.ts` — the S3 Zod schema (write the test with the fix).
  5. `sanitize-redirect.test.ts` — callback + login redirect rules.
  6. Playwright smoke: demo-mode journey (landing → dashboard → create doc → editor → export txt).
- **Priority:** 1st wave alongside S3 (test the fix as you make it).

---

## 11. DEPENDENCIES

### DP1 — ~20 unused production dependencies — HIGH
- **Path:** `package.json`
- **Verified unused (zero imports in src/):** `@radix-ui/react-*` (alert-dialog, avatar, dialog, dropdown-menu, label, popover, progress, scroll-area, select, separator, slot, switch, tabs, toast, tooltip — 15 packages), `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `framer-motion`, `cmdk`, `date-fns`, `diff`, `clsx`, `tailwind-merge`, `class-variance-authority`, `pino` (yet `next.config.mjs` declares `serverExternalPackages: ['pino']` for a logger that doesn't exist), `react-pdf` (pdf-parse is used instead).
- **Why it matters:** Supply-chain surface, install weight, confusing for contributors, and `serverExternalPackages: ['pino']` is a config lie. Note: they do NOT bloat the client bundle (never imported) — this is a maintenance/security-hygiene issue, not a runtime perf one.
- **Fix:** Remove in one dedicated commit after grep-verifying each; drop `serverExternalPackages` or add a real pino logger. Do NOT bundle this with feature changes.
- **Priority:** 2nd wave (isolated commit).

### DP2 — `pdf-parse@2.4.5` + `@types/pdf-parse@1.1.5` mismatch and ESM warning — MEDIUM
- **Path:** `package.json`, `src/app/api/ingest/route.ts`, `src/types/shims.d.ts`
- **Problem:** Every build emits "Attempted import error: 'pdf-parse' does not contain a default export". The canonical npm `pdf-parse` line is 1.x; a 2.4.5 resolution is unusual — verify what `^2.4.5` actually resolved to and whether it's the intended package (supply-chain check). Types are hand-shimmed from v1.
- **Fix:** Pin the verified-correct version, align types, or switch to a maintained ESM-friendly parser; eliminate the build warning.
- **Priority:** 2nd wave.

### DP3 — React 19 + Next 15 installed with `--legacy-peer-deps` — MEDIUM
- **Path:** `package.json` (react ^19.0.0, next 15.0.3), Phase 0 CHANGELOG note.
- **Problem:** The tree doesn't resolve under normal npm rules (some dep declares peer react ^18). Every future `npm install` on a fresh machine must remember the flag or fail. Lockfile is committed so CI/deploys are stable, but contributor onboarding breaks silently.
- **Fix:** Either add `.npmrc` with `legacy-peer-deps=true` (makes the requirement explicit and portable) or move to the Next 15.x line where the peer conflict is resolved. Do not blind-upgrade (per project rules).
- **Priority:** 2nd wave (`.npmrc` is the cheap fix).

### DP4 — ESLint 8.57.1 + Next 15.0.3 pinned pair — INFO
- **Verified:** Coherent after the Phase 15 `.eslintrc.json` conversion. Upgrading Next beyond 15.0.x will eventually require the flat-config migration — note for future upgrades.

---

## 12. UX / UI (full journey audit)

### U1 — "Try Demo Mode" dead-ends when Supabase is configured — MEDIUM
- **Path:** `src/app/page.tsx` (line 54) → `/dashboard` → `dashboard/page.tsx` init (redirects to `/login` when `checkDemoMode()` is false).
- **Problem:** With cloud configured, the landing CTA bounces the visitor to login — the button lies.
- **Fix:** Route the CTA to `/login?demo=1` with an explanatory notice, or gate the button on a public demo flag.
- **Priority:** 2nd wave.

### U2 — Dead links: `/reset`, `/privacy`, `/terms` — HIGH (UX trust)
- **Path:** `src/app/login/page.tsx` ("Forgot?" → `/reset`), `src/app/page.tsx` footer (`/privacy`, `/terms`).
- **Verified:** None of these routes exist → 404. A password-reset link that 404s is a trust-breaking defect for a career product.
- **Fix:** Implement `/reset` (Supabase `resetPasswordForEmail` — the `ResetPasswordSchema` already exists, unused), and either write minimal Privacy/Terms pages or remove the footer links until real ones exist.
- **Priority:** 1st wave.

### U3 — No error boundaries; failures white-screen — MEDIUM
- **Path:** app root.
- **Problem:** Any render-time exception shows Next's default error screen with no recovery path or brand consistency. Data-fetch failures inside effects are caught and logged, but render crashes (e.g., malformed persisted JSON in localStorage — `JSON.parse` in `readJSON` is guarded, but a structurally-wrong-but-valid JSON profile would flow into components and can throw in render).
- **Fix:** `error.tsx` + `global-error.tsx` with recovery actions; consider a runtime shape-check (Zod `safeParse`) when loading persisted profiles with a fallback-to-default path.
- **Priority:** 2nd wave.

### U4 — Editor is not responsive — MEDIUM
- **Path:** `src/components/AgentSidebar.tsx` (`w-[420px]` fixed), editor layout.
- **Problem:** On viewports < ~1100px the fixed sidebar + canvas overflow; no collapse/toggle. Dashboard is responsive (`hidden md:flex`); the editor — the core workspace — is not usable on tablets/small laptops.
- **Fix:** Collapsible sidebar (icon rail → expanded), min-width handling for canvas with horizontal scroll fallback.
- **Priority:** 2nd wave.

### U5 — Success/error feedback is inconsistent — LOW
- **Path:** dashboard uses toasts; editor uses `alert()`; ingestion uses both toast AND `alert()` for the same failure (double notification).
- **Fix:** Standardize on toasts (see AC5).

### U6 — Version-history empty-state text overpromises — LOW
- **Path:** editor versions modal ("Checkpoints are automatically captured during key changes") — only AI accepts checkpoint today (see D3). Align text or add the auto-checkpoint behavior.

### U7 — Journey otherwise coherent — INFO
- **Verified end-to-end (demo mode):** landing → signup/login (validated, error/success states) → dashboard (tabs, progress meter, empty states, create modal) → editor (load, autosave indicator, template switch, section HUD, export menu) → AI chat (mock stream, proposal card, accept/reject/edit) → job target → ATS scan → versions → export (PDF print/DOCX/TXT) → portfolio settings → public page. No dead buttons found beyond those listed; loading and empty states exist throughout.

---

## 13. PRODUCTION READINESS VERDICT

**Can ENVOY be deployed today?** No — not as a multi-user cloud product.

| Dimension | Status |
|---|---|
| Offline/demo single-user | **Ready** (genuinely works end-to-end) |
| Cloud multi-user | **Not ready** — S1, S2, S7 block |
| AI features | Functional but unreliable under real networks (S4, S5) and corruptible via injection (S3) |
| Exports | Diverge from preview (D1, D2) |
| Testing | Absent (TS1) |
| Docs | Misleading (A5) |

**Deployment gate (minimum before public launch):** S1, S2, S3, S7, U2, TS1 (core suite), DP3 (`.npmrc`).

---

## PRIORITIZED REMEDIATION ROADMAP

### Wave 1 — Correctness & trust (small, surgical, high value)
1. **S3** — Zod-validate AI proposals at the accept boundary (whitelist fields per sectionType; validate itemId; caps). Include unit tests (TS1 items 1–5).
2. **S1 + S9 + PF4** — Server-rendered public portfolio via service-role route or publish-time snapshot; real metadata; fixes cloud-mode portfolio entirely.
3. **S7** — Default portfolio visibility → private; explicit publish action.
4. **D2** — Fix "in undefined" in both exporters (one-liners).
5. **U2** — Implement `/reset` (Supabase password reset); add minimal privacy/terms pages or remove links.
6. **S6** — Sanitize login `redirectTo`.
7. **S4** — Buffered SSE line reader shared by all providers.
8. **S5** — AbortSignal timeouts + single retry on provider calls.
9. **S14** — Fix jobs/extract fallback (single body read; see below).

### Wave 2 — Structural quality
10. **TS1** — Stand up vitest config + the five core suites; playwright smoke.
11. **D1 + D7** — Section-config-driven exports + renderer coverage for remaining sections.
12. **D3** — Manual/auto version checkpoints; fix empty-state copy.
13. **D4** — Ingestion checkpoint + confirm.
14. **D6** — Print pagination for multi-page resumes.
15. **AC2 + AC5** — Focus trap/restore hook; replace alert/confirm with toasts + inline confirms.
16. **AC3** — Contrast token fix.
17. **U1, U3, U4** — Demo CTA gating, error boundaries, responsive editor sidebar.
18. **T2** — Word-boundary keyword matching.
19. **P3** — Slug validation + collision UX.
20. **A1/A2** — Consolidate diff system onto the store; persist conversations.
21. **S8** — Wire or delete the Zod schema layer (mostly absorbed by Wave 1 item 1).
22. **DP1** — Remove ~20 unused dependencies (isolated commit).
23. **DP2** — Resolve pdf-parse version/types/warning.
24. **DP3** — `.npmrc` with `legacy-peer-deps=true`.
25. **PF3** — Debounce dashboard profile persistence.
26. **A5** — Rewrite README to match reality.

### Wave 3 — Polish
27. **A3** — Certifications tab; trim dead unions/store fields.
28. **A4** — Type Supabase rows; remove file-level `any` disables.
29. **T3, T4, AI3, AI4, AI6, DB2, DB3, AC4, P4, P6, U5, U6** — remaining low items.

---

## APPENDIX — REGRESSION INTRODUCED IN PHASE 15 (self-reported)

### S14 — jobs/extract heuristic fallback is dead code — HIGH
- **Path:** `src/app/api/jobs/extract/route.ts` (catch block)
- **Problem:** The Phase 15 rewrite reads the request body via `parseJsonBody(request)` in the try block; the catch block calls `parseJsonBody(request)` **again**. A `Request` body is single-consumption, so the second read throws, hits the inner catch, and returns 500. The original code used `request.clone()` for the first read precisely to allow the fallback re-read; the rewrite broke that. The AI-failure → heuristic-fallback path (a documented resilience feature) never executes.
- **Verify:** POST a >50k-char description with AI keys configured → primary path rejects with 400 (correct); POST valid description with a provider that throws → 500 instead of heuristic result.
- **Fix:** Read the body once into a variable before the try, or use `request.clone()` for the first parse as the original did.
- **Priority:** Wave 1 (item 9). Honest note: this regression was introduced by the Phase 15 hardening commit `cb6c29b` and was not caught because no tests exist (see TS1).

---

*End of audit. No application code was modified during this audit; the only artifact is this report.*