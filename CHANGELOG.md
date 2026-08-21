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
- Phase 3 Commit: `1b84327`

