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

