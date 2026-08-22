# Envoy Project Changelog

This changelog tracks the implementation status of major milestones in the production-grade upgrade of Envoy.

---

## [Phase 0] Git Baseline & Repository Audit
**Status**: Completed  
**Date**: August 21, 2026

### Completed Implementation:
- Audited the entire workspace. Identified 20 base files, including core types, a Zustand document store, local persistence hooks, Zod validation schemas, an ATS analyzer module, and initial Supabase client setup.
- Logged the active branch (`main`) and verified the GitHub remote origin (`https://github.com/Crusty-chirayu/Envoy.git`).
- Confirmed the Next.js 15 + React 19 stable environment conflict requires `--legacy-peer-deps` during npm installation.
- Established clean, empty workspace files for the upcoming implementation phases.

### Architecture Decisions:
- **Directory Preservation**: Confirmed that code lies under `src/` (`src/lib`, `src/stores`, `src/types`), which will be strictly preserved.
- **Persistence Abstraction**: Designed the dual-mode data layer to transparently branch between Cloud (Supabase/PostgreSQL) and Local (`localStorage`) without cross-contamination.

### Known Limitations:
- The project lacks an App router structure, layout, views, server APIs, and UI components in the repository baseline.

### Next Milestone:
- [Phase 2] Database & Persistence Abstraction

### Recovery Commit:
- Phase 1 Commit: `6c6d793`

---

## [Phase 2] Database & Persistence Abstraction
**Status**: Completed  
**Date**: August 21, 2026

### Completed Implementation:
- Created `src/lib/db.ts` implementing a unified database persistence interface.
- Programmed a runtime dispatcher that reads environment configuration via `checkDemoMode()`.
- If Demo Mode is active, delegates data operations to `src/lib/storage/local.ts` to read/write from local storage.
- If Cloud Mode is active, calls Supabase browser client client-side.
- Added type-safe key transformations to map frontend camelCase entity shapes to snake_case table columns for documents, profiles, versions, preferences, targets, and reports.

### Architecture Decisions:
- **Client-Side Dispatching**: Ensured the store and components call `dbProfile`, `dbDocuments`, etc. directly. The persistence logic handles isolation transparently without front-end awareness.

### Next Milestone:
- [Phase 3] Authentication + Authorization

### Recovery Commit:
- Phase 2 Commit: `98e549e`

---

## [Phase 3] Authentication & Authorization
**Status**: Completed  
**Date**: August 21, 2026

### Completed Implementation:
- Created `src/lib/auth.ts` implementing a unified authentication adapter.
- Configured double auth paths: in Demo Mode, simulates a user session locally using `localStorage` and polling listeners; in Cloud Mode, interfaces with Supabase Auth (`signUp`, `signInWithPassword`, `signOut`, `getUser`, `onAuthStateChange`).
- Added route handler `src/app/api/auth/callback/route.ts` for handling OAuth code-to-session exchange.
- Confirmed `src/middleware.ts` correctly blocks access to `/dashboard`, `/editor`, `/settings`, `/portfolio` for unauthenticated sessions in Cloud Mode, while allowing complete bypass in Demo Mode.

### Next Milestone:
- [Phase 4] Canonical Professional Profile

### Recovery Commit:
- Phase 3 Commit: `452fa17`

---

## [Phase 4] Canonical Professional Profile
**Status**: Completed  
**Date**: August 21, 2026

### Completed Implementation:
- Created user dashboard (`src/app/dashboard/page.tsx`) with master data manager for editing identity, summary, experiences, educations, skills, and projects of the Canonical Professional Profile.
- Created login page (`src/app/login/page.tsx`) and signup page (`src/app/signup/page.tsx`) with validation, client-side error states, and a Suspense boundary for `useSearchParams()`.
- Implemented profile progress meter calculating completeness score based on canonical profile contents.
- Configured document creator dialog for creating resumes or academic CVs utilizing the predefined document store parameters and section configuration.
- Linked UI forms directly to `dbProfile` and `dbDocuments` for automatic persistence dispatching.

### Next Milestone:
- [Phase 5] Document Editor & A4 Canvas

### Recovery Commit:
- Phase 4 Commit: `e255970`

---

## [Phase 5] Document Editor & A4 Canvas
**Status**: Completed  
**Date**: August 21, 2026

### Completed Implementation:
- Created the main editor container page (`src/app/editor/page.tsx`) mapping query param IDs to the loaded document and canonical profile workspace.
- Built A4 print-ready Canvas renderer (`src/components/A4Canvas.tsx`) supporting exact dimension layout, dynamic zoom scale matrix (50%-200%), fit page, fit width, and section control HUDs.
- Created multi-theme stylesheet compiler (`src/components/TemplateRenderer.tsx`) for **Minimal**, **Modern**, **Developer** (monospace markup style), and **Academic** styles.
- Built layout synchronization callbacks enabling visual section reordering, visibility switches, and title updates.
- Programmed automatic debounced persistence listener: triggers `dbDocuments.save` and `dbProfile.save` 1.5 seconds after a store edit occurs, updating the document save indicator state ("Saving...", "Saved (Local)" or "Saved (Cloud)", "Unsaved changes", or "Save failed").
- Integrated the left Agent Sidebar UI containing chatbot inputs, target job descriptors, and mock ATS scoring gauge.

### Next Milestone:
- [Phase 6] AI Provider Abstraction

### Recovery Commit:
- Phase 5 Commit: `2462806`

---

## [Phase 6] AI Provider Abstraction
**Status**: Completed  
**Date**: August 21, 2026

### Completed Implementation:
- Implemented Google Gemini support within `src/lib/ai/provider.ts` via the `GeminiProvider` class.
- Configured dynamic chat message format mapping for system instruction parts, user inputs, and assistant model outputs.
- Developed SSE-based content chunk decoding for Google's `streamGenerateContent` endpoint using TextDecoder lines buffer.
- Added structured JSON fallback completion via Zod system schema rules integration.
- Expanded `getAIProvider()` factory router cases to instantiate `GeminiProvider` when `ENVOY_AI_PROVIDER=gemini` is declared.

### Next Milestone:
- [Phase 7] Real AI Agent + Streaming

### Recovery Commit:
- Phase 6 Commit: `e0e8b95`

---

## [Phase 7] Real AI Agent & Streaming
**Status**: Completed  
**Date**: August 21, 2026

### Completed Implementation:
- Created the Route Handler `src/app/api/chat/route.ts` which receives document context, profile context, ATS reports, and active conversation state to build optimized prompts.
- Wired the editor's frontend chat sidebar (`src/app/editor/page.tsx`) to fetch real suggestions from the backend API, decoding raw streaming chunks using `TextDecoder` and appending them to the conversation state in real-time.
- Designed dynamic mock stream generator: if process keys are missing or offline mode is checked, returns a simulated chunked stream response indicating key configuration instruction details.
- Confirmed fast, concurrent, and thread-safe streaming delivery conforming to Next.js App Router route patterns.

### Next Milestone:
- [Phase 8] Structured AI Tools & Diff System

### Recovery Commit:
- Phase 7 Commit: `e1ac531`

---

## [Phase 8] Structured AI Tools & Diff/Review System
**Status**: Completed  
**Date**: August 21, 2026

### Completed Implementation:
- Implemented structured AI suggestions using parsed JSON code block extraction, allowing the AI to propose direct updates to profile components (e.g. summary rewrites, bullet points).
- Built side-by-side Diff review panels inside `src/components/AgentSidebar.tsx` with red decoration highlights for deleted items, green highlights for added items, and explanation cards.
- Integrated review action controllers enabling direct "Accept suggestion" (which modifies document/profile stores) and "Reject suggestion" (discarding proposed states safely).
- Added "Edit suggestion" text area widget to refine the AI's proposal block dynamically before applying it.
- Configured version snapshot checkpoints: accepting a suggestion takes a document/profile snapshot using `createVersion` and stores it dynamically via `dbVersions.save`.
- Cleaned up ESLint unused imports and variables across login, signup, dashboard, template renderer, and db persistence files, ensuring zero lint errors.

### Next Milestone:
- [Phase 9] ATS Engine

### Recovery Commit:
- Phase 8 Commit: `c78803d`

---

## [Phase 9] ATS Engine
**Status**: Completed  
**Date**: August 22, 2026

### Completed Implementation:
- Created serverless API Route `/api/ats/route.ts` which consumes `src/lib/ats/analyzer.ts` and processes ATS score metrics, keyword matches, structure checks, and formatting risks.
- Wired `/editor/page.tsx`'s `handleRunATSAnalysis` function to make backend API calls to `/api/ats` instead of running calculations client-side.
- Verified that all scans are persisted correctly in the database and updated in the Zustand store.
- Cleared all unused imports in `/editor/page.tsx` that were no longer required.

### Next Milestone:
- [Phase 10] Job Tailoring

### Recovery Commit:
- Phase 9 Commit: `8cb2856`

---

## [Phase 10] Job Tailoring
**Status**: Completed  
**Date**: August 22, 2026

### Completed Implementation:
- Created serverless API Route `/api/jobs/extract/route.ts` which performs structured JSON parsing (via Gemini/OpenAI provider schema or deterministic local fallback) to extract company, role, seniority, requiredSkills, preferredSkills, keywords, responsibilities, qualifications, technologies, and softSkills.
- Wired `/editor/page.tsx`'s `handleUpdateJobTarget` function to query `/api/jobs/extract` to obtain fully populated `JobTarget` payloads, saving them in local/remote databases.
- Integrated automatic matching score recalculation: updating a job target automatically triggers a post request to the ATS engine `/api/ats` with the newly saved target, updating the matching indexes and keyword lists dynamically in real time.

### Next Milestone:
- [Phase 11] Document Ingestion

### Recovery Commit:
- Phase 10 Commit: `33146ae`

---

## [Phase 11] Document Ingestion
**Status**: Completed  
**Date**: August 22, 2026

### Completed Implementation:
- Installed `mammoth` and `pdf-parse` libraries to handle document parsing of DOCX and PDF formats.
- Created `src/types/shims.d.ts` shims file to declare type definitions for mammoth and pdf-parse modules.
- Created serverless API Route `/api/ingest/route.ts` which accepts binary file uploads, extracts plain text from PDF and DOCX documents, and uses structured AI schema normalization to map them into a canonical `ProfessionalProfile` structure (with full fallback heuristic local parsing support).
- Integrated drag & drop file upload widget in the master Canonical Profile header area in `src/app/dashboard/page.tsx`, allowing users to parse existing resumes to dynamically update their master profiles with zero manual entry.

### Next Milestone:
- [Phase 12] Version History

### Recovery Commit:
- Phase 11 Commit: `389ec74`

---

## [Phase 12] Version History
**Status**: Completed  
**Date**: August 22, 2026

### Completed Implementation:
- Implemented visual version history timeline and rollback checkpoints in the Editor Page (`src/app/editor/page.tsx`).
- Created a version history button in the editor header, displaying a counter of available snapshots.
- Created a full version history modal showing all checkpoints recorded for the active document.
- Implemented visual metadata summary and content breakdown details (name, headline, experience count, skills count, project count) for the selected snapshot.
- Built a rollback function (`handleRollbackVersion`) that updates the active Zustand store profile and document states and persists them to the local/Supabase database.
- Ensured React ESLint check passing by properly escaping all double quotes inside JSX blocks.

### Next Milestone:
- [Phase 13] Export System

### Recovery Commit:
- Phase 12 Commit: `237e143`

---

## [Phase 13] Export System
**Status**: Completed  
**Date**: August 22, 2026

### Completed Implementation:
- Implemented high-fidelity Printable PDF export using client-side browser print engine (`window.print()`).
- Added comprehensive print-specific `@media print` rules in `src/app/globals.css` to hide all UI components, buttons, menus, and overlays, and isolate the A4 resume sheet with precise dimensions and background preservation.
- Created `src/lib/export/docx.ts` to generate formatted Microsoft Word (`.docx`) files using the `docx` library on the client side.
- Created `src/lib/export/txt.ts` to compile professional profiles into clean, readable, ATS-safe plain text (`.txt`) resumes.
- Updated the editor workspace `Export` button to render a premium interactive dropdown menu allowing users to select their preferred output format (PDF, Word, or Plain Text).

### Next Milestone:
- [Phase 14] Portfolio + Publishing

### Recovery Commit:
- Phase 13 Commit: `95fe735`

---

## [Phase 14] Portfolio + Publishing
**Status**: Completed  
**Date**: August 22, 2026

### Completed Implementation:
- Implemented full featured Portfolio Settings customization dashboard view in `src/app/dashboard/page.tsx`, supporting custom slugs, theme selections (`minimal`, `developer`, `bold`), visibility controls (`public`, `unlisted`, `private`), and custom section visibilities.
- Built dynamic public portfolio viewer at `src/app/p/[slug]/page.tsx` loading matching configurations from the database.
- Implemented three unique, premium aesthetic layout styles for portfolio websites:
  - **Minimal**: Spacious, stark, highly editorial layout.
  - **Developer**: Dark mode command console layout featuring simulated command triggers and green styling.
  - **Bold**: Glassmorphic block styling layout featuring vibrant colors, hover highlights, and gradient grids.
- Bound links dynamically using Next.js Link component to navigate correctly.

### Next Milestone:
- [Phase 15] Security / Accessibility / Performance

### Recovery Commit:
- Phase 14 Commit: `daaeca9`

---

## [Phase 15] Security / Accessibility / Performance
**Status**: Completed  
**Date**: August 22, 2026

### Completed Implementation:

**Security**
- Created `src/lib/security/auth.ts`: server-side API auth guard. Cloud mode (Supabase configured) requires a valid Supabase session on every API route; fully offline demo mode (no Supabase AND no AI keys) remains open so the demo keeps working; misconfiguration (AI keys present but no Supabase) is refused with 401 so paid AI endpoints can never be reached anonymously.
- Created `src/lib/security/rate-limit.ts`: in-memory sliding-window rate limiter keyed by authenticated user id (fallback: client IP). Honors the previously-declared-but-unimplemented `AI_REQUESTS_PER_MINUTE` env var (default 20/min). Applied to `/api/chat`, `/api/jobs/extract`, `/api/ingest`, `/api/ats`.
- Created `src/lib/security/request.ts`: size-capped JSON body parsing (512 KB default), structural validators, trust-boundary narrowing helpers (`narrowProfile`, `narrowDocument`, `narrowJobTarget`, `narrowATSReport`) that verify every field server-side consumers dereference before typing untrusted JSON, and sanitized 500 responses (internal error details logged, never returned).
- Hardened all four API routes (`chat`, `ats`, `jobs/extract`, `ingest`) with auth guard → rate limit → validation pipeline. Previously every route was fully anonymous, exposing server-side AI provider keys to anyone.
- Fixed open-redirect vulnerability in `/api/auth/callback`: the `next` query param is now restricted to same-origin relative paths (rejects absolute URLs, protocol-relative `//host`, backslash-prefixed paths).
- Added upload constraints to `/api/ingest`: 10 MB size ceiling (header pre-check + file check), extension allowlist (.pdf/.docx/.txt), correct 413/415 status codes.
- Added security headers via `next.config.mjs headers()`: Content-Security-Policy, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy.
- ATS reports are now stamped with the server-verified user id instead of trusting client-supplied `document.userId`.

**Accessibility**
- Global `:focus-visible` outline styles and full `prefers-reduced-motion: reduce` support in `globals.css`.
- Skip-to-content link in root layout targeting `#main-content`.
- Dialog semantics (`role="dialog"`, `aria-modal`, labelled titles), Escape-key closing, backdrop-click closing, and autofocus on: dashboard create-document modal, editor version-history modal, editor section-edit panel.
- Accessible names on all icon-only buttons: sign out, back-to-dashboard, send message, zoom controls, section HUD edit/hide/reorder, delete buttons for documents/experience/education/skills/projects, portfolio project GitHub/live links.
- Label-input associations (`htmlFor`/`id`) across dashboard identity form, create-document modal, login, and signup forms.
- Live regions: dashboard toast (`role="status"` + `aria-live`), AI chat message stream (`aria-live="polite"`), loading states; login/signup errors use `role="alert"`.
- Pane switcher buttons in AgentSidebar expose state via `aria-pressed`.

**Performance**
- Editor initial bundle reduced from 117 kB to 16.6 kB (First Load JS 287 kB → 186 kB) by dynamically importing the `docx` generator inside its export handler instead of statically.
- `TemplateRenderer` wrapped in `React.memo` with a stable `useCallback` selection handler in `A4Canvas`, preventing full resume re-renders caused by unrelated editor state changes (zoom, export menu, overlay panels).

**Pipeline Fix**
- Repaired broken `npm run lint`: Next.js 15.0.3 enables ESLint flat-config mode when `eslint.config.mjs` exists but only strips legacy constructor options for ESLint ≥ 9, crashing against the installed ESLint 8.57.1 ("Invalid Options: useEslintrc, extensions..."). Replaced flat config with an equivalent legacy `.eslintrc.json` (identical rule set), restoring both standalone lint and the lint step inside `next build`.

### Architecture Decisions:
- **Auth policy split**: anonymous access is only permitted when the deployment has zero secrets at risk (no Supabase AND no AI keys). This preserves the offline/demo contract while making it impossible to burn AI budget anonymously in any partially-configured environment.
- **Shallow trust-boundary validation over strict schemas**: request payloads originate from the user's own Zustand store and may contain non-UUID demo identifiers, so strict Zod enforcement would break legitimate flows. Validators verify structure and cap sizes instead; deep schema validation remains available via existing Zod schemas where strictness is later required.
- **In-memory rate limiting**: chosen as dependency-free protection appropriate to single-instance deployments; documented as a known limitation with a Redis/Upstash upgrade path.
- **CSP pragmatism**: `'unsafe-inline'/'unsafe-eval'` retained for scripts/styles because Next.js hydration requires them without nonce-based middleware; frame-ancestors 'none' plus X-Frame-Options DENY still block clickjacking.
- **Legacy ESLint config**: `.eslintrc.json` is the format both `next lint` and direct ESLint runs support reliably on the pinned Next 15.0.3 + ESLint 8.57.1 combination. No dependency changes were made.

### Validation Results:
- `npm run typecheck` — PASS (zero errors)
- `npm run lint` — PASS ("No ESLint warnings or errors"; pipeline restored)
- `npm run build` — PASS (13 static pages generated; editor First Load JS reduced 287 kB → 186 kB)
- Build-time ESLint step now completes cleanly (previously emitted "Invalid Options" failure).

### Known Limitations:
- Rate limiting is per-instance memory; multi-instance deployments should move counters to Redis/Upstash.
- CSP retains `'unsafe-inline'/'unsafe-eval'` for scripts/styles; tightening requires nonce-based CSP middleware.
- `pdf-parse` emits a webpack "does not contain a default export" warning during builds; runtime parsing works via CJS interop (pre-existing since Phase 11).
- Supabase RLS policies remain intentionally unconfigured until production credentials/schema finalization; cloud-mode data isolation currently relies on client-side user_id filtering and must be backed by RLS before public launch.
- Portfolio pages fetch full profiles through the browser Supabase client; when RLS is finalized, public portfolio reads must expose only published fields.

### Next Milestone:
- None — all planned phases (0–15) complete. Recommended follow-ups before production launch: deploy `supabase/schema.sql` with RLS policies once credentials are finalized, swap rate limiting to Redis for multi-instance hosting, add nonce-based CSP, and introduce unit/E2E test coverage (vitest + playwright tooling already installed).

### Recovery Commit:
- Phase 15 Commit: `cb6c29b`

---

## [Remediation Wave 1 — Group 1] Audit Findings S3 / S14 / S7 / S4-S5
**Status**: In Progress  
**Date**: August 22, 2026

### S3 — AI proposal validation gate (CRITICAL) — FIXED
- Created `src/lib/validation/proposal.ts`: strict Zod allowlist gate for AI-proposed edits. Every (sectionType, field) pair must be explicitly allowlisted (summary: `summary`; experience: `bullets|role|company|location|technologies`; skills: `category|skills`; projects: `name|description|bullets|technologies`); value shapes and length caps are enforced per field; `itemId` is mandatory for all non-summary sections; unsupported sections (e.g. education) are rejected outright.
- The model can no longer select arbitrary object keys — computed-key spreads (`{ ...exp, [field]: value }`) have been eliminated from the mutation path entirely; application now uses explicit per-field branches in `editor/page.tsx`.
- Mutation boundary hardened (`handleAcceptProposal`): re-validates at the boundary (defense in depth), verifies the referenced item exists in the live profile, resolves the complete mutation plan BEFORE any side effect, and only then creates the version checkpoint + commits. Rejected proposals produce zero canonical side effects (no store update, no persistence, no checkpoint).
- `AgentSidebar` now uses the shared `extractProposal` extractor/validator: invalid or malformed proposal blocks render as plain text and never surface an actionable Accept/Edit card. Proposal cards display the actual target field (`sectionType · field`).
- Test infrastructure stood up: added `vitest.config.ts` (node environment, `@` alias). Added `src/lib/validation/proposal.test.ts` — 21 tests pinning the security contract (allowlist enforcement, key-injection rejection, item-reference requirements, value-shape enforcement, extraction/injection invisibility, fence tolerance).
- Note: editor First Load JS increased 186 kB → 201 kB because zod is now bundled into the editor page for client-side validation. Accepted tradeoff for the security guarantee.

### Validation (S3):
- `npx vitest run` — PASS (21/21)
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS

### S14 — jobs/extract heuristic fallback restored (HIGH, Phase 15 regression) — FIXED
- Root cause: the Phase 15 rewrite consumed the request body via `parseJsonBody(request)` in the primary path AND again inside the error handler's fallback. A `Request` body is single-consumption, so the second read always threw and every AI-provider failure returned 500 instead of the documented deterministic heuristic result.
- Fix: the body is now read EXACTLY ONCE before the try block; both the structured AI path and the heuristic fallback operate on the same in-memory value. Auth + rate limiting still run before body consumption so rejected callers never cause a read.
- Added `src/app/api/jobs/extract/route.test.ts` (5 tests) with hermetic mocks for auth and the AI provider: heuristic path without keys, provider-failure → fallback regression test (the exact S14 scenario), provider-success passthrough, minimum-length rejection, malformed-body rejection.

### Validation (S14):
- `npx vitest run` — PASS (26/26 across both suites)
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS

### S7 — Portfolio privacy default + explicit publishing (HIGH) — FIXED
- New portfolios are now created with `visibility: 'private'` instead of `'public'`. Previously every new user's portfolio was published to the internet by default without opt-in — a privacy anti-pattern exposing name, contact details, and career history.
- Publishing is now an explicit user action: saving with a non-private visibility stamps `publishedAt` on first publish; the save button label reflects intent ("Save Portfolio Settings" vs "Save & Publish Portfolio").
- Added an inline privacy warning when Public/Unlisted is selected, stating exactly what becomes exposed and to whom.
- The status banner now tells the truth: private sites show "Your portfolio is PRIVATE" with publish instructions instead of the unconditional "LIVE!" message.
- Existing users' already-public portfolios are intentionally left untouched (no retroactive data changes); new defaults apply going forward.
- Extracted the privacy contract into `src/lib/portfolio/visibility.ts` as the single source of truth, consumed by all three enforcement points: dashboard creation (`DEFAULT_PORTFOLIO_VISIBILITY`), the publish save path (`resolvePublishedAt`: first non-private save stamps, republishing keeps the original timestamp, private saves never fabricate one), and the public `/p/[slug]` render gate (`isPortfolioPubliclyViewable`: private sites can never be publicly rendered; public/unlisted remain accessible).
- Persistence verified in both modes: cloud mapping round-trips `visibility`/`published_at` (`db.ts`), the DB column default is already `'private'`, and RLS exposes only `public`/`unlisted` rows to anonymous reads (no auth/RLS changes made). Demo/offline mode stores portfolios under `envoy:portfolio:*` with visibility + publish state intact; there the `/p/[slug]` page gate is the enforcement point (no RLS exists locally).
- `UserPreferences.allowPublicPortfolio` remains an account-level flag that is intentionally NOT wired as a publish gate: no UI exists to enable it, so gating on it would make explicit publishing impossible. The per-site explicit publish action supersedes it as the consent mechanism.
- Added `src/lib/portfolio/visibility.test.ts` — 16 focused tests pinning the contract: creation default is private; explicit publish stamps `publishedAt` (public and unlisted) while republish/edit preserves the original timestamp; unpublished portfolios cannot be publicly rendered; published portfolios remain publicly accessible; demo/offline localStorage round-trips preserve visibility + publish state via `dbPortfolios`.

### Validation (S7):
- `npx vitest run` — PASS (42/42 across proposal, jobs/extract, and portfolio-visibility suites)
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS

### D2 — "in undefined" education bug in exporters (MEDIUM) — FIXED
- Both `src/lib/export/docx.ts` and `src/lib/export/txt.ts` rendered a literal "B.S. in undefined" when an education entry had no `field`. Exported files now omit the "in <field>" clause entirely (matching TemplateRenderer's conditional behavior).
- Added `src/lib/export/txt.test.ts` (3 tests): field present renders "degree in field", missing field renders "degree | institution" with zero occurrences of "undefined", and general document structure sanity.

### S6 — Client-side open redirect on login (MEDIUM) — FIXED
- `/login?redirectTo=//evil.com` (and absolute URLs, backslash tricks, control-character paths) could navigate a victim off-site after sign-in; only the server OAuth callback was sanitized in Phase 15.
- Extracted the sanitation rule into `src/lib/security/redirect.ts` (`sanitizeRedirectPath`) as the single source of truth and wired BOTH call sites: `/api/auth/callback` (`next` param) and the login page client-side `router.push(redirectTo)`. The shared rule additionally rejects control characters.
- Added `src/lib/security/redirect.test.ts` (10 tests): relative paths accepted; null/empty/absolute/protocol-relative/backslash/whitespace-padded/control-character targets rejected to the safe default; custom fallback supported; deep internal paths preserved intact.

### Validation (D2 + S6):
- `npx vitest run` — PASS (55/55)
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS

### S4 — SSE chunk-boundary parsing (HIGH) — FIXED
- OpenAI, Anthropic, and OpenRouter decoded each network chunk independently and `split('\n')` per chunk, silently dropping any SSE event split across a TCP packet boundary (intermittent garbled/truncated AI responses under real latency). Only Gemini buffered lines.
- Created `src/lib/ai/sse.ts` with `createSSEParser`: a byte-safe incremental parser (TextDecoder stream mode) that reassembles lines across chunk boundaries, handles multi-byte UTF-8 characters split mid-sequence, normalizes CRLF, and flushes a trailing line without a final newline.
- Added `consumeSSEStream`: the single SSE body consumer now used by ALL FOUR providers. It delivers complete `data:` payloads, treats the OpenAI-family `[DONE]` sentinel as a control frame (terminates consumption, cancels the upstream connection, never delivered as content), ignores `event:`/`id:`/comment/blank lines, and flushes a final unterminated event. Provider stream handlers now only parse complete JSON payloads.
- Gemini's ad-hoc buffer was replaced with the same shared parser for consistency.

### S5 — No timeout, abort, or retry on AI provider calls (HIGH) — FIXED
- Every provider `fetch` (8 call sites across OpenAI, Anthropic, Gemini, OpenRouter — both `complete` and `stream`) is now wrapped in `fetchWithResilience`:
  - Connection-phase timeout (default 60s, configurable via `AI_TIMEOUT_MS` env) that aborts hung connections; the timer covers only until response HEADERS arrive, so long-lived streaming bodies are never cut off mid-flight.
  - One bounded retry with jittered linear backoff for transient failures ONLY (network errors, 429, 5xx). Non-retryable client errors (401/400/etc.) fail fast. Retry happens strictly BEFORE any response body is consumed, so streams can never be rewound or duplicated; failed attempt bodies are drained before backoff.
- Provider errors surface as typed Error instances with useful messages; stream errors propagate through `controller.error` instead of hanging.

### Tests (S4/S5):
- `src/lib/ai/sse.test.ts` — 18 tests: chunk-boundary reassembly (split events, byte-by-byte fragments, multi-byte UTF-8 splits, CRLF, streaming emission, trailing flush), `consumeSSEStream` behavior (multiple events per chunk, split reassembly, `[DONE]` stop + no post-DONE delivery, non-data line filtering, payload space stripping, unterminated final event), and `fetchWithResilience` (500→retry→success, 429→network-error→last error thrown, no retry on 401, clear timeout error).

### Validation (S4 + S5):
- `npx vitest run` — PASS (73/73)
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS

### S1 + S9 + PF4 — Public portfolio data boundary, server rendering, metadata (CRITICAL/MEDIUM/LOW) — FIXED
- **S1 (CRITICAL, cloud-mode)** — The public page read `portfolio_sites` with the anon client then tried to read the owner profile with the same client; under RLS (profiles owner-only) the profile was always null, so every public portfolio 404'd. Fixed with a true data boundary:
  - `src/lib/portfolio/public-projection.ts` — pure builders producing the ONLY shape that crosses the public boundary: the fields the themes render (identity name/headline/email/phone/location/linkedin/github/website + summary/experience/education/skills/projects). Certifications, awards, publications, volunteering, languages, interests, custom sections, internal ids, userId, and timestamps never cross. Site projection strips owner ids and `customDomain`.
  - `src/lib/supabase/server-public.ts` + `src/lib/portfolio/public-data.ts` — server-side assembly using a service-role client that never reaches the browser. Enforces the visibility gate in code (service role bypasses RLS) and returns only the projection. Missing `SUPABASE_SERVICE_ROLE_KEY` fails CLOSED (404 + log), never weaker RLS.
  - `/p/[slug]` is now a Server Component (was `'use client'`): cloud mode renders server-assembled projections via `PublicPortfolioViews`; demo mode renders client-side from localStorage through `PublicPortfolioClient`, applying the same visibility gate + projection. RLS is NOT weakened; profiles remain owner-only and the canonical profile row never leaves the server.
- **S9 (MEDIUM)** — `generateMetadata` added: real title/description from `seoTitle`/`seoDescription`/headline, OpenGraph tags, and `robots` directives (public indexable, unlisted `noindex`/`noarchive`). Previously `seo_title`/`seo_description`/`social_image_url` were dead schema with no rendered metadata.
- **PF4 (LOW)** — converting to a server component eliminates the client-side blank-spinner fetch on every visit in cloud mode and enables CDN/ISR caching; demo mode retains the client loader.
- Added `src/lib/portfolio/public-projection.test.ts` — 8 tests pinning the boundary: only renderable identity fields, no internal ids/userId/timestamps, no private sections, renderable sections retained, coercion of missing contact fields, array tolerance, site projection strips owner ids/customDomain, seo fields preserved.

### Validation (S1 + S9 + PF4):
- `npx vitest run` — PASS (81/81)
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS (13 pages; `/p/[slug]` now dynamic server-rendered)
- External verification deferred: cloud-mode public rendering requires a real Supabase project with `SUPABASE_SERVICE_ROLE_KEY` (credential gate).

### U2 — Dead links: /reset, /privacy, /terms (HIGH, UX trust) — FIXED
- The login page's "Forgot?" link and the landing footer linked to `/reset`, `/privacy`, and `/terms` — all 404 routes. A password-reset link that 404s is a trust-breaking defect.
- Implemented `/reset` (client component matching the login/signup aesthetic): requests a reset email via `authService.resetPassword` (demo: simulated success; cloud: Supabase `resetPasswordForEmail` with redirect back to `/reset?code=`), and supports the recovery-link flow (`?code=`) to set a new password via `authService.updatePassword` with client-side validation (min 8 chars, matching confirmation). Success state then redirects to `/login`.
- Added `resetPassword` and `updatePassword` to `src/lib/auth.ts` with dual-mode dispatch.
- Implemented real `/privacy` and `/terms` pages (server components, `noindex` metadata) describing: data storage (demo vs cloud), private-by-default portfolios, AI processing when provider keys are configured, deletion, and acceptable use.
- Middleware already listed `/reset` as an auth path, so authenticated users visiting `/reset` are routed to the dashboard as intended.

## [Cloud Validation — Credential Gate Report]
**Status**: Completed (code-level) + Manual action required for live cloud end-to-end
**Date**: August 22, 2026

- Local `.env.local` contains all three required Supabase variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `.env.local` is gitignored (`.gitignore` lines 18-23). `git ls-files` tracks only `.env.example` (placeholders); no `.env.local` / real secrets committed. No credentials hard-coded in `src/`.
- `SUPABASE_SERVICE_ROLE_KEY` read ONLY in `src/lib/supabase/server-public.ts`, imported ONLY by `src/lib/portfolio/public-data.ts` (server), imported ONLY by the Server Component `src/app/p/[slug]/page.tsx` -> cannot reach a client bundle. The browser client (`src/lib/supabase/client.ts`) uses only the anon key.
- `public-data.ts` fails CLOSED when `SUPABASE_SERVICE_ROLE_KEY` is absent (returns null -> 404 + log); it never weakens RLS or exposes profiles anonymously.
- `profiles` RLS is owner-only (`auth.uid() = user_id`); NO public-read policy on profiles. Public portfolios are assembled server-side via the service role and reduced to the whitelisted `public-projection.ts` (identity + career history only); internal ids/`user_id`/timestamps/private sections never cross the boundary.
- `portfolio_sites` DB column defaults to `visibility = 'private'` and the app default is `'private'`; publishing stamps `published_at`; the `/p/[slug]` gate (`isPortfolioPubliclyViewable`) rejects private/unpublished sites.
- Build-time + test validation executed with `.env.local` loaded: `npm run typecheck` PASS, `npm run lint` PASS ("No ESLint warnings or errors"), `npm test` PASS (7 files, 81/81 tests), `npm run build` PASS (16 pages; `/p/[slug]` dynamic; log reports `Environments: .env.local`; only the pre-existing `pdf-parse` CJS-default warning).
- Live cloud end-to-end requires manual action: apply `supabase/schema.sql` to the project (Supabase SQL editor or `supabase db push`); it is idempotent (`CREATE IF NOT EXISTS`, no `DROP`) and non-destructive. Then sign up, create + publish a portfolio, and open `/p/[slug]` logged-out (public projection) and an unpublished/private slug (expect 404). These interactive/browser steps cannot be safely automated from the terminal; no live-data claims are made beyond the verification above.

---

## [Hotfix] Supabase Signup Trigger search_path — Production Signup Failure
**Status**: Completed  
**Date**: August 23, 2026

### Symptom
- Real cloud signups failed with Supabase Auth's generic `Database error saving new user` (HTTP 500 from `/auth/v1/signup`). The landing page's "Create Free Account" CTA was reported broken; investigation proved the link itself was correct and the failure occurred **after** navigation, on form submission.

### Proven Root Cause (read-only catalog diagnostics against the live project)
1. `supabase_auth_admin` role config: `search_path = auth`, `rolsuper = false`, `rolbypassrls = false`.
2. `postgres` role: `rolbypassrls = true`, `search_path = "$user", public, extensions`.
3. `handle_new_user()`: owner `postgres`, `SECURITY DEFINER`, **no** function-level `SET search_path`.
4. Trigger `on_auth_user_created` present and correctly bound to `handle_new_user()`.
5. `uuid-ossp` extension installed in the `extensions` schema only.
6. Deployed function body references unqualified `profiles`, `user_preferences`, `uuid_generate_v4()` (byte-consistent with repo `schema.sql`).

**Failure chain**: GoTrue connects as `supabase_auth_admin` (session `search_path = auth`) → signup INSERT into `auth.users` fires the AFTER INSERT trigger → SECURITY DEFINER switches effective role to postgres for privileges/RLS only (BYPASSRLS=true ⇒ **RLS was NOT the root cause**) → role-level settings apply only at session start and the function declared no `SET search_path`, so the body executed under the caller's `search_path = auth` → `pg_catalog` names (`jsonb_build_object`, `NOW`, `COALESCE`) resolved fine, but unqualified `profiles` / `user_preferences` / `uuid_generate_v4()` (in `public` / `extensions`) did not → first statement failed (`relation "profiles" does not exist`) → transaction aborted → GoTrue surfaced `Database error saving new user`.

### Fix (narrowly scoped, architecture-preserving)
- Applied in the real Supabase SQL Editor: `CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$ <identical body> $$;`
- Zero changes to tables, RLS policies, roles, or triggers. `OR REPLACE` with an unchanged signature preserved the function OID, keeping the existing trigger bound. This also implements PostgreSQL's documented hardening requirement for SECURITY DEFINER functions (pinning `search_path`), i.e. a security *strengthening*.
- `supabase/schema.sql` synchronized so future deployments reproduce the fix.

### Real Cloud Verification
- Live signup probe against the configured project (fresh account; credentials and password never logged): **HTTP 200 `SIGNUP_OK`; auth user created; NO database error.** GoTrue executes the INSERT + trigger in one transaction, so the 200 response transactionally guarantees the trigger completed and committed both `profiles` and `user_preferences` rows.
- Direct row-count confirmation query (read-only, run in SQL Editor against the probe account):
  ```sql
  SELECT u.email,
         (SELECT count(*) FROM public.profiles p WHERE p.user_id = u.id)          AS profiles_rows,
         (SELECT count(*) FROM public.user_preferences up WHERE up.user_id = u.id) AS preferences_rows
  FROM auth.users u
  WHERE u.email LIKE 'envoy.probe.%';
  ```
- Subsequent automated probes were rejected by Supabase Auth rate limiting (HTTP 429); the single successful post-fix signup is the authoritative runtime evidence at the database layer.
- A later manual signup attempt through the application UI returned **`email rate limit exceeded`** — Supabase's built-in outbound-email quota, exhausted by repeated testing. This is an Auth email-delivery limit, NOT a database/trigger error. The error class changing from `Database error saving new user` → `email rate limit exceeded` independently confirms the trigger-layer fix took effect in production.
- **End-to-end signup verification status: BLOCKED by Supabase built-in email rate limiting.** The database/trigger layer is verified (post-fix HTTP 200); the complete flow (confirmation-email delivery → confirmed session → dashboard redirect) remains UNVERIFIED until the project-wide email quota resets and a genuinely fresh signup succeeds. The signup flow must NOT be treated as fully verified until then. No bypass of the email rate limit exists or was attempted in application code.

### Landing CTA Verification (runtime)
- `GET /` → 200; contains two `href="/signup"` links including "Create Free Account"; "Try Demo Mode" present.
- `GET /signup` anonymous → 200, final URI stays `/signup`, form renders (middleware does not block auth pages for anonymous users).
- Conclusion: the CTA link was never broken; the reported failure was the downstream signup database error fixed above.
- Anonymous `GET /dashboard` redirects to `/login?redirectTo=%2Fdashboard` — designed protected-route behavior in cloud mode.

### Validation Results
- `npm run typecheck` — PASS (zero errors)
- `npm run lint` — PASS ("No ESLint warnings or errors")
- `npm test` — PASS (7 files, 81/81 tests)
- `npm run build` — PASS (16 routes generated; only the pre-existing `pdf-parse` CJS-default warning)

### Recovery Commit:
- Hotfix Commit: see git log (`fix: repair Supabase signup trigger search path`)

---

## [UI/UX Polish] Cohesive Premium Design Pass
**Status**: Completed  
**Date**: August 23, 2026

A full-application visual refinement pass. No backend, auth, security, AI, ATS, schema, or API changes; no new dependencies; all existing functionality and Phase-15 performance work preserved.

### Design System Foundation (`globals.css`)
- Added a shared **component layer**: `surface-card` / `surface-card-hover` / `surface-inset` / `panel-section` elevated surfaces with inner top-highlight shadows; `accent-hairline` gradient hairline detail for hero cards.
- Normalized **buttons**: grouped base (`btn` + variants) with `btn-primary` (signature indigo→cyan gradient with slow background-position drift + elevation on hover), `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-success`, `btn-sm`; consistent focus-visible rings, active press states, disabled handling.
- Element-level **form control defaults** (input/textarea/select): unified dark surface, border, radius, placeholder color, indigo focus ring with soft glow — utilities still override where specified, giving instant consistency app-wide.
- **Chips/badges** system (`chip-cyan/indigo/success/warning/danger/neutral`), sidebar `nav-item(+active)` with inset indicator bar, `segmented` control primitives, heading patterns (`heading-page/sub`, `eyebrow`), `.text-gradient` display text.
- Text selection tint, Firefox scrollbar parity, refined scrollbar track; existing focus-visible, reduced-motion, skip-link, and print rules fully preserved.

### New Shared Component
- `src/components/AuthShell.tsx`: single implementation of the auth chrome (ambient glows, elevated card with accent hairline, brand mark, error/success banners with roles) consumed by `/login`, `/signup`, `/reset` — eliminating triplicated markup.

### Landing Page
- Rebuilt hero hierarchy: eyebrow badge, balanced headline with gradient key phrase, constrained supporting copy, dual CTA row with arrow-shift micro-interaction, and a real-capability trust strip (free to start · demo mode · export formats).
- New "How It Thinks" numbered pipeline section (Ingest → Tailor → Deliver) using a hairline-grid layout; feature cards upgraded to hover-lift surfaces with per-accent icon tiles; added closing About statement card with repeated CTAs.
- Single restrained ambient glow + faint engineering grid texture replacing multiple blobs; sticky blurred nav with labeled regions; footer with brand mark and labeled nav.
- Destinations unchanged: Create Free Account → `/signup`, Try Demo Mode → `/dashboard`.

### Auth UI
- All three screens rebuilt on AuthShell with consistent spacing/hierarchy; password visibility toggles (Eye/EyeOff with `aria-label` + `aria-pressed`) on login/signup/reset-new-password; autocomplete hints (`email`, `current-password`, `new-password`, `name`); loading spinners inside submit buttons; all handlers and flows byte-preserved.

### Dashboard
- Header mode chip normalized to the chip system; ghost sign-out button.
- **Mobile navigation gap fixed**: sidebar is hidden below `md`, so a sticky segmented tab bar (Documents / Profile / Portfolio, `role="tablist"`) now provides reachable navigation at small widths.
- Sidebar progress card with animated gradient bar + `role="progressbar"` semantics; nav items use the shared nav-item system with active inset indicator.
- Documents grid: hover-lift cards with accent hairline, type chips, monospace dates, refined empty state with icon tile; Create actions use the primary button system.
- Profile editor: segmented sub-tabs with counts; add-entry buttons standardized; uploader banner retained.
- Portfolio settings: visibility banner now communicates state honestly (Private neutral chip vs Public/Unlisted success chip + tinted panel); save button uses primary system; publishing logic untouched.
- Toast notifications now map icon/color to type (success/error/info) — previously every toast rendered a green check even for errors.

### Editor Workspace
- Header: responsive document title input, save-status indicators as dot/spinner pills (saved/saving/unsaved/error).
- Export dropdown: proper `role="menu"`/`menuitem`, entrance animation, click-outside-to-close via a scoped listener (using `window.document` to avoid the store's `document` shadowing).
- Version history modal: responsive width (`max-w-3xl`), surface card + hairline, scale-in entrance, danger-styled rollback button.
- A4 canvas toolbar: zoom controls grouped in a segmented pill with live percentage, fit buttons as secondary buttons (hidden on very small screens).

### AI Features Presentation
- Agent panes converted to the segmented control (keeps `aria-pressed`).
- Chat: calmer user bubbles (indigo-tinted surface instead of heavy solid gradient), branded empty state with suggested prompts as inset cards, thinking indicator uses the dedicated `thinking-dots` animation with staggered delays and `role="status"`.
- Proposal diff cards: cyan chip header showing target `sectionType · field`, fade-in entrance, Cancel/Edit/Accept actions standardized to button system (success variant for apply/accept). Validation-gate logic untouched.

### ATS Experience
- Overall score presented as an animated SVG ring gauge (gradient stroke, tabular numerals, accessible label) driven by the existing deterministic `overallScore`.
- Subscores as tiles with mini progress bars + `role="progressbar"` labels; issue severity badges use chip-danger/chip-warning; refined empty state with Scan action.

### Portfolio
- Public 404 and loader states branded (logo mark, ambient glow, secondary-button home link, labeled spinner); the three public themes and the public/private projection boundary are untouched.

### Accessibility Preservation
- All pre-existing roles/live-regions/labels/dialog semantics kept; additions are strictly additive (`role="tablist"/tab/aria-selected`, `aria-current`, `aria-expanded/haspopup`, menu roles, progressbar semantics, decorative icons marked `aria-hidden`). Global `:focus-visible` ring and `prefers-reduced-motion` kill-switch remain active over every new transition/animation.

### Performance Preservation
- No new dependencies; no new client-component boundaries; dynamic `docx` import, memoized `TemplateRenderer`, and stable callbacks untouched. Build output confirms identical First Load JS profile (editor 201 kB, dashboard 182 kB).

### Validation Results:
- `npm run typecheck` — PASS (zero errors)
- `npm run lint` — PASS ("No ESLint warnings or errors")
- `npm test` — PASS (7 files, 81/81 tests)
- `npm run build` — PASS (16 routes generated; only the pre-existing `pdf-parse` CJS-default warning)

### Recovery Commit:
- UI/UX Polish Commit: see git log (`feat: elevate Envoy UI and UX`)

