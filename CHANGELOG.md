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
- [Phase 1] Architecture + Domain Model

### Recovery Commit:
- Baseline Commit: `64bf9ec`
