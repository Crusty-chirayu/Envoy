# ENVOY — Open-Source AI Career Operating System

> **Reads the Job. Reads You. Writes the Fit.**  
> Envoy is an open-source, AI-powered professional identity workspace designed to parse your background, strategize against target job postings, score ATS compatibility deterministically, compose tailored resumes and academic CVs, and deploy live personal web portfolios — all from a single source of truth.

---

## 🌟 Key Capabilities

- 📄 **Structured Profile Ingestion:** Safe PDF/DOCX resume parser extracting experience timelines, technical stacks, quantifiable impact metrics, and certifications into a canonical profile.
- 🎯 **Target Job Intelligence:** Automatic job description parsing uncovers key skills, required technologies, seniority level, and keyword gaps.
- 📊 **Deterministic ATS Scoring Engine:** Algorithmic keyword matching, word boundary checks, alias resolutions, formatting risk detection, and clear explanations for your score.
- 🤖 **Multi-Provider AI Copilot:** Provider abstraction layer supporting OpenAI, Anthropic Claude, Google Gemini, and OpenRouter with streaming, resilience timeouts, and automatic retry.
- 🛡️ **Human-Controlled Proposals & Diffs:** AI suggestions are presented as side-by-side diffs. Mutations require explicit user approval and auto-capture a recoverable version snapshot.
- 🌐 **One-Click Public Portfolios:** Generate clean, responsive, publishable web portfolios directly from your canonical data with custom slug validation and server-side privacy projections.
- 🔒 **Dual Persistence Architecture:** Full offline Demo Mode (local browser storage) and Cloud Mode (Supabase Auth & PostgreSQL RLS) with transparent runtime dispatching.
- 📦 **Multi-Format Export:** Export documents to PDF, editable Word (.docx), or ATS-safe plain text (.txt) while respecting document section visibility and ordering.

---

## 🏗️ System Architecture

```text
  INPUT SOURCES              CANONICAL ENGINE              DELIVERY SURFACES
 ───────────────            ──────────────────            ───────────────────
  Resume PDF / DOCX ──┐
  Free-text Bio     ──┼──▶  Canonical Profile  ──┬──▶  ATS Resumes & Academic CVs
  Target Job Posting ──┘    (Single Truth)       │──▶  Live Web Portfolio (/p/[slug])
                                                 └──▶  PDF / DOCX / TXT Exports
                                  │
                                  ▼
                         Multi-Provider AI &
                       Deterministic ATS Engine
```

### Server/Client Data Boundaries
1. **Canonical Profile as Single Source of Truth:** Resumes, CVs, portfolios, and exports all derive from the `ProfessionalProfile` domain model.
2. **Public Portfolio Projection (`/api/p/[slug]`):** Public portfolio pages do not expose private profile fields or internal IDs. Anonymous visitors receive a strictly whitelisted public projection.
3. **AI Proposal Validation Gate:** All AI-proposed edits pass strict Zod schema validation before mutating workspace state, preventing prompt injection or payload corruption.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components & Client Components)
- **Language:** TypeScript 5 (Strict typing)
- **Styling:** Tailwind CSS 3 (Red Noir Superdesign system), Framer Motion, Lucide Icons
- **State Management:** Zustand 5 (Document store with debounced persistence)
- **Data & Auth:** Supabase (`@supabase/ssr`, PostgreSQL with Row Level Security)
- **AI Providers:** OpenAI API, Anthropic Messages API, Google Gemini API, OpenRouter
- **Parsing & Exports:** `docx`, `pdf-parse`, `mammoth`
- **Testing:** Vitest 2 (130+ unit & integration tests)

---

## 🚀 Quick Start

### Prerequisites
- Node.js `>= 18.x`
- npm `>= 9.x`

### Setup Instructions

```bash
# 1. Clone the repository
git clone https://github.com/Crusty-chirayu/Envoy.git
cd Envoy

# 2. Install dependencies (peer deps flag for React 19 / Next 15 environment)
npm install --legacy-peer-deps

# 3. Configure environment variables
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Configuration

Create `.env.local` in the project root:

```env
# Mode Selection (true = Local Browser Storage, false = Supabase Cloud)
NEXT_PUBLIC_DEMO_MODE=true

# AI Provider Credentials (Server-only; selects: openai | anthropic | gemini | openrouter)
ENVOY_AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
OPENROUTER_API_KEY=your_openrouter_key

# Supabase Cloud Mode (Required when NEXT_PUBLIC_DEMO_MODE=false)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🧪 Testing & Verification

Run the automated test suite and type check:

```bash
# Run unit & integration tests
npm test

# Run TypeScript type check
npm run typecheck

# Run Next.js linter
npm run lint

# Build production bundle
npm run build
```

---

## 📜 License & Attribution

Distributed under the **MIT License**. Free to use, modify, and distribute for any open-source or commercial project.
