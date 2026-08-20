<div align="center">

# ⚡ ENVOY

### The Autonomous AI Career Architect

*Generate, enhance, and personalize ATS-grade Resumes, CVs, and Developer Portfolios — for free, forever.*

<br/>

[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-FFD60A?style=for-the-badge&labelColor=0D1117)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-WELCOME-06D6A0?style=for-the-badge&labelColor=0D1117)](CONTRIBUTING.md)
[![Status](https://img.shields.io/badge/STATUS-ACTIVE_DEVELOPMENT-FF6B6B?style=for-the-badge&labelColor=0D1117)](#)
[![Made with AI](https://img.shields.io/badge/POWERED_BY-LLMS_%26_AGENTS-7A5CFA?style=for-the-badge&labelColor=0D1117)](#)
[![Team](https://img.shields.io/badge/TEAM-3_BUILDERS-4CC9F0?style=for-the-badge&labelColor=0D1117)](#-core-team)

<br/>

**[Overview](#-overview)** · **[Features](#-key-features)** · **[Architecture](#%EF%B8%8F-system-architecture)** · **[Quick Start](#%EF%B8%8F-quick-start)** · **[Contributing](#-contributing)** · **[Team](#-core-team)**

</div>

<br/>

---

<br/>

## 💡 Overview

Every job seeker faces the same broken loop: rewrite the resume for every application, guess what the ATS wants, hope a recruiter looks at it for more than six seconds. Career tools that actually solve this are locked behind subscriptions.

**Envoy breaks that loop.**

Envoy is an open-source, agentic career platform. Feed it your raw background — or an existing resume — and it studies the target role, the sector, and the market, then produces a resume, CV, or portfolio built to get read, not filtered out. No paywalls. No "upgrade to unlock formatting." Just an agent doing the work a career coach would, at zero cost, in seconds.

<br/>

## 🔥 Key Features

| | |
|---|---|
| 🤖 **Autonomous Career Agent** | Reads job descriptions, sector norms, and your profile together — then decides what to emphasize, cut, or rewrite. |
| 📄 **Resume Enhancer** | Upload an existing PDF or DOCX. Envoy parses it, fixes structural issues, and rewrites weak bullet points into measurable, high-impact ones. |
| 🎯 **Sector-Aware Tailoring** | Recalibrates keyword density and tone per domain — tech, finance, healthcare, academia, design, and more. |
| 🎨 **Free Template Library** | A growing, fully open, ATS-compliant set of LaTeX, HTML, and Markdown templates. No locked "premium" tier. |
| 🌐 **Instant Portfolio Generation** | Converts structured profile data into a deployable personal website with a single command. |
| 🔓 **Zero Paywalls, Ever** | Every feature Envoy ships is free and open-source, by design — not as a limited trial. |

<br/>

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT LAYER                            │
│   ┌────────────────────────────┐        ┌────────────────────────────┐  │
│   │  Existing Resume (PDF/DOCX) │        │  Target Role / Sector Data │  │
│   └──────────────┬───────────────┘        └──────────────┬─────────────┘  │
└──────────────────┼───────────────────────────────────────┼────────────────┘
                    │                                       │
                    ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            ENVOY CORE ENGINE                             │
│                                                                          │
│   ┌─────────────────────────┐          ┌────────────────────────────┐   │
│   │  Parser & Extraction     │ ───────► │  Context & Keyword Engine │   │
│   │  (OCR / DOCX / PDF)      │          │  (Market + ATS Signals)   │   │
│   └─────────────────────────┘          └──────────────┬─────────────┘   │
│                                                        │                 │
│                                                        ▼                 │
│   ┌─────────────────────────┐          ┌────────────────────────────┐   │
│   │  Dynamic Renderer        │ ◄─────── │  Agentic Optimizer (LLM)  │   │
│   │  (LaTeX / HTML / Web)    │          │  Tailoring · Rewriting    │   │
│   └──────────────┬───────────┘          └────────────────────────────┘   │
└──────────────────┼─────────────────────────────────────────────────────-┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              OUTPUT LAYER                                │
│  ┌──────────────────┐   ┌──────────────────┐   ┌────────────────────┐   │
│  │  ATS-Ready PDF    │   │  Academic CV      │   │  Live Web Portfolio │   │
│  └──────────────────┘   └──────────────────┘   └────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

<br/>

## 🔄 Pipeline Breakdown

```
[ User Input ] → [ Parsing Engine ] → [ Structured Profile JSON ] → [ Agentic Optimization ]
                                                                          │
        ┌─────────────────────────────────────────────────────────────┘
        ▼
[ Sector Strategy Injector ] → [ Template Engine ] → [ Compiled Output: PDF / Web ]
```

1. **Extraction** — Uploaded documents pass through parsing/OCR to build a canonical JSON schema of the user's career history.
2. **Context Enrichment** — The agent studies the target role and sector, extracts the keywords that matter, and rewrites experience into metric-driven, high-signal bullet points.
3. **Compilation** — The polished, structured data is rendered through LaTeX for pixel-perfect PDFs, or through the web template engine for a live portfolio.

<br/>

## 📂 Project Structure

```text
envoy/
├── .github/              # CI/CD workflows, issue templates, PR guidelines
├── apps/
│   ├── agent/             # LLM prompts, agent logic, optimization pipeline
│   ├── parser/            # Document extraction engine (PDF/DOCX → JSON)
│   └── web/                # Web app, dashboard, and template studio
├── packages/
│   ├── templates/          # Open-source LaTeX / HTML / Markdown templates
│   └── ui/                  # Shared component library
├── docs/                  # Architecture decision records, setup guides
├── .gitignore
├── LICENSE
└── README.md
```

<br/>

## 🛠️ Quick Start

### Prerequisites

- Node.js `>= 18.x` or Python `>= 3.10`
- Git

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Crusty-chirayu/envoy.git

# 2. Move into the project
cd envoy

# 3. Install dependencies
npm install          # or: pip install -r requirements.txt

# 4. Start the dev environment
npm run dev
```

<br/>

## 🌿 Branching Strategy

Three builders, one clean pipeline. We keep it strict so nobody steps on anybody's work:

- **`main`** — Production-ready. Protected, no direct pushes.
- **`dev`** — Integration branch where finished features land before release.
- **`feature/<name>`** — Short-lived branches per feature, per person.

```
main ────────────────────────────────────────────────●  (Release)
        \                                           /
dev      └────●─────────────────●─────────────────●    (Integration)
               \               /                 /
feature/          [Chirayu] ──┘                 /
feature/            [Sagar] ────────────────────┘
feature/          [Prakash] ─────────────────────────┘
```

**Workflow for every contributor:**

```bash
git checkout -b feature/your-feature-name
# build, commit
git commit -m "feat: add resume parser module"
git push origin feature/your-feature-name
# open a Pull Request into dev
```

<br/>

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request into `dev`

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for detailed guidelines.

<br/>

## 👥 Core Team

<div align="center">

| Name | GitHub | Role |
|---|---|---|
| **Chirayu** | [@Crusty-chirayu](https://github.com/Crusty-chirayu) | Core Architect |
| **Sagar Khanal Sharma** | [@Sagar-Khanal](https://github.com/Sagar-Khanal) | Core Architect |
| **Prakash Bohara** | [@Prakash0788](https://github.com/Prakash0788) | Core Architect |

</div>

<br/>

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full details — free to use, modify, and distribute.

<br/>

<div align="center">

**Built by people tired of paywalled career tools.**

⭐ Star this repo if Envoy is worth watching grow.

</div>
